import defaultPolicy from "../policy/default-agent-buyer-policy.json" with { type: "json" };
import productCategories from "../policy/product-categories.json" with { type: "json" };

export { defaultPolicy, productCategories };

const DECISION_PRIORITY = {
  ALLOW: 1,
  APPROVAL_REQUIRED: 2,
  DENY: 3,
};

function normalizeToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseAmount(value) {
  if (value === undefined || value === null || value === "") return 0;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function strongerDecision(current, next) {
  return DECISION_PRIORITY[next] > DECISION_PRIORITY[current] ? next : current;
}

function roleHas(list, category) {
  return Array.isArray(list) && list.map(normalizeToken).includes(category);
}

export function evaluateAgentBuyerPreflight(input = {}, policy = defaultPolicy) {
  const now = input.evaluated_at || new Date().toISOString();
  const agentRole = normalizeToken(input.agent_role);
  const productCategory = normalizeToken(input.product_category);
  const dataSensitivity = normalizeToken(input.data_sensitivity || "medium");
  const purpose = String(input.purpose || "unspecified").trim();
  const priceUsdc = parseAmount(input.price_usdc);
  const agentStatus = normalizeToken(input.agent_status || "active");
  const approvalRef = String(input.approval_ref || "").trim();
  const rolePolicy = policy.roles?.[agentRole];
  const reasonCodes = [];
  const flags = [];
  let decision = policy.default_decision || "APPROVAL_REQUIRED";
  let roleProductFit = "unknown";

  if (!rolePolicy) {
    decision = "DENY";
    reasonCodes.push("UNKNOWN_AGENT_ROLE");
    roleProductFit = "unknown_role";
  } else if (agentStatus && !["active", "enabled"].includes(agentStatus)) {
    decision = "DENY";
    reasonCodes.push("INACTIVE_AGENT");
    roleProductFit = "inactive_agent";
  } else if (rolePolicy.status && !["active", "enabled"].includes(normalizeToken(rolePolicy.status))) {
    decision = "DENY";
    reasonCodes.push("INACTIVE_AGENT");
    roleProductFit = "inactive_agent";
  } else if (roleHas(rolePolicy.denied_categories, productCategory)) {
    decision = "DENY";
    reasonCodes.push("ROLE_PRODUCT_CATEGORY_DENIED");
    roleProductFit = "mismatch";
  } else if (roleHas(rolePolicy.allowed_categories, productCategory)) {
    decision = "ALLOW";
    reasonCodes.push("ROLE_PRODUCT_CATEGORY_ALLOWED");
    roleProductFit = "fit";
  } else if (roleHas(rolePolicy.approval_required_categories, productCategory)) {
    decision = "APPROVAL_REQUIRED";
    reasonCodes.push("ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED");
    roleProductFit = "approval_gated";
  } else {
    decision = "APPROVAL_REQUIRED";
    reasonCodes.push("ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED");
    roleProductFit = "unclassified_category";
  }

  if (rolePolicy && dataSensitivity === "restricted") {
    decision = strongerDecision(decision, policy.global_rules?.restricted_sensitivity_decision || "DENY");
    reasonCodes.push("RESTRICTED_DATA_SENSITIVITY");
    flags.push("restricted_data");
  } else if (rolePolicy && ["high", "sensitive"].includes(dataSensitivity)) {
    decision = strongerDecision(decision, policy.global_rules?.high_sensitivity_decision || "APPROVAL_REQUIRED");
    reasonCodes.push("HIGH_DATA_SENSITIVITY");
    flags.push("high_data_sensitivity");
  }

  if (rolePolicy && productCategory === "payment_execution") {
    decision = strongerDecision(decision, policy.global_rules?.payment_execution_decision || "APPROVAL_REQUIRED");
    reasonCodes.push("PAYMENT_EXECUTION_REQUIRES_APPROVAL");
    flags.push("payment_execution");
  }

  const spendLimit = parseAmount(rolePolicy?.default_spend_limit_usdc);
  if (rolePolicy && spendLimit > 0 && priceUsdc > spendLimit) {
    decision = strongerDecision(decision, policy.global_rules?.price_over_limit_decision || "APPROVAL_REQUIRED");
    reasonCodes.push("PRICE_EXCEEDS_ROLE_LIMIT");
    flags.push("price_over_role_limit");
  }

  if (approvalRef) {
    reasonCodes.push("APPROVAL_REFERENCE_PRESENT");
    flags.push("approval_reference_present");
  }

  const uniqueReasonCodes = [...new Set(reasonCodes)];

  return {
    schema_version: "agent_buyer_preflight_result.v1",
    policy_version: policy.policy_version,
    evaluated_at: now,
    decision,
    reason_codes: uniqueReasonCodes,
    role_product_fit: roleProductFit,
    audit_required: true,
    input: {
      agent_id: input.agent_id || null,
      agent_role: agentRole,
      product_category: productCategory,
      purpose,
      price_usdc: priceUsdc,
      data_sensitivity: dataSensitivity,
      agent_status: agentStatus,
      approval_ref: approvalRef || null,
    },
    role_policy: rolePolicy
      ? {
          role: agentRole,
          spend_limit_usdc: rolePolicy.default_spend_limit_usdc,
          description: rolePolicy.description,
        }
      : null,
    flags,
    recommended_next_action:
      decision === "ALLOW"
        ? "proceed_to_x402_payment"
        : decision === "APPROVAL_REQUIRED"
          ? "request_owner_or_policy_controller_approval"
          : "do_not_purchase",
    limitations: [
      "Starter policy only evaluates buyer-role fit, product category, sensitivity, price, and approval reference.",
      "It does not verify wallet custody, payment settlement, seller honesty, or delivery quality.",
      "Production deployments should bind this evaluator to authenticated agent identity and immutable audit logs.",
    ],
  };
}

export function listAgentBuyerRoles(policy = defaultPolicy) {
  return Object.entries(policy.roles || {}).map(([id, role]) => ({
    id,
    description: role.description,
    status: role.status,
    default_spend_limit_usdc: role.default_spend_limit_usdc,
  }));
}

export function listProductCategories(categories = productCategories) {
  return Object.entries(categories.categories || {}).map(([id, category]) => ({
    id,
    ...category,
  }));
}

import defaultPolicy from "../policy/default-agent-buyer-policy.json" with { type: "json" };
import productCategories from "../policy/product-categories.json" with { type: "json" };

export { defaultPolicy, productCategories };

const DECISION_PRIORITY = {
  ALLOW: 1,
  APPROVAL_REQUIRED: 2,
  REQUIRE_APPROVAL: 2,
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

function publicDecision(value) {
  return value === "APPROVAL_REQUIRED" ? "REQUIRE_APPROVAL" : value;
}

function roleHas(list, category) {
  return Array.isArray(list) && list.map(normalizeToken).includes(category);
}

function normalizeList(values) {
  return Array.isArray(values) ? values.map(normalizeToken).filter(Boolean) : [];
}

function normalizeDomain(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

function normalizeAddress(value) {
  return String(value ?? "").trim().toLowerCase();
}

function includesNormalized(list, value) {
  const token = normalizeToken(value);
  return normalizeList(list).includes(token);
}

function includesDomain(list, value) {
  const domain = normalizeDomain(value);
  return Array.isArray(list) && list.map(normalizeDomain).includes(domain);
}

function includesAddress(list, value) {
  const address = normalizeAddress(value);
  return Array.isArray(list) && list.map(normalizeAddress).includes(address);
}

function parseTimestamp(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function pushUnique(values, value) {
  if (value && !values.includes(value)) values.push(value);
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

export function evaluateAgenticCommercePreflight(input = {}, policy = defaultPolicy) {
  const now = input.evaluated_at || new Date().toISOString();
  const nowTimestamp = parseTimestamp(now) ?? Date.now();
  const expiresAt =
    input.expires_at ||
    new Date(nowTimestamp + 5 * 60_000).toISOString();
  const payment = input.payment || {};
  const mandate = input.mandate || null;
  const merchant = input.merchant || {};
  const agentRole = normalizeToken(input.agent_role || mandate?.agent_role);
  const productCategory = normalizeToken(input.product_category || payment.product_category);
  const amountUsdc = parseAmount(input.amount_usdc ?? payment.amount_usdc ?? input.price_usdc);
  const asset = normalizeToken(input.asset || payment.asset || "USDC").toUpperCase();
  const chain = normalizeToken(input.chain || payment.chain || "base");
  const merchantDomain = normalizeDomain(
    input.merchant_domain || payment.merchant_domain || merchant.domain,
  );
  const merchantWallet = normalizeAddress(
    input.merchant_wallet || payment.merchant_wallet || merchant.wallet,
  );
  const buyerId = String(input.buyer_id || mandate?.buyer_id || "").trim();
  const agentId = String(input.agent_id || mandate?.agent_id || "").trim();
  const reasonCodes = [];
  const flags = [];

  const buyerResult = evaluateAgentBuyerPreflight(
    {
      ...input,
      agent_id: agentId || input.agent_id,
      agent_role: agentRole,
      product_category: productCategory,
      price_usdc: amountUsdc,
    },
    policy,
  );

  let decision = publicDecision(buyerResult.decision);
  for (const reason of buyerResult.reason_codes) pushUnique(reasonCodes, reason);
  for (const flag of buyerResult.flags || []) pushUnique(flags, flag);

  if (!mandate) {
    decision = strongerDecision(decision, publicDecision(policy.global_rules?.missing_mandate_decision || "DENY"));
    pushUnique(reasonCodes, "MANDATE_MISSING");
    pushUnique(flags, "mandate_missing");
  } else {
    const mandateType = normalizeToken(mandate.type || "intent");
    const mandateStatus = normalizeToken(mandate.status || "active");
    const expiresAt = parseTimestamp(mandate.expires_at);

    if (!includesNormalized(policy.agentic_commerce?.supported_mandate_types, mandateType)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_TYPE_UNSUPPORTED");
    }
    if (!["active", "enabled"].includes(mandateStatus)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_INACTIVE");
    }
    if (expiresAt !== null && expiresAt < nowTimestamp) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_EXPIRED");
    }
    if (mandate.buyer_id && buyerId && String(mandate.buyer_id).trim() !== buyerId) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_BUYER_MISMATCH");
    }
    if (mandate.agent_id && agentId && String(mandate.agent_id).trim() !== agentId) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_AGENT_MISMATCH");
    }
    if (mandate.agent_role && agentRole && normalizeToken(mandate.agent_role) !== agentRole) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_ROLE_MISMATCH");
    }
    if (Array.isArray(mandate.merchant_domains) && !includesDomain(mandate.merchant_domains, merchantDomain)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_MERCHANT_DOMAIN_MISMATCH");
    }
    if (Array.isArray(mandate.merchant_wallets) && !includesAddress(mandate.merchant_wallets, merchantWallet)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_MERCHANT_WALLET_MISMATCH");
    }
    if (Array.isArray(mandate.allowed_categories) && !includesNormalized(mandate.allowed_categories, productCategory)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_CATEGORY_MISMATCH");
    }
    if (parseAmount(mandate.max_amount_usdc) > 0 && amountUsdc > parseAmount(mandate.max_amount_usdc)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_AMOUNT_EXCEEDED");
    }
    if (Array.isArray(mandate.assets) && !includesNormalized(mandate.assets, asset)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_ASSET_MISMATCH");
    }
    if (Array.isArray(mandate.chains) && !includesNormalized(mandate.chains, chain)) {
      decision = strongerDecision(decision, "DENY");
      pushUnique(reasonCodes, "MANDATE_CHAIN_MISMATCH");
    }
  }

  if (!merchantDomain) {
    decision = strongerDecision(decision, publicDecision(policy.global_rules?.unknown_merchant_decision || "APPROVAL_REQUIRED"));
    pushUnique(reasonCodes, "MERCHANT_DOMAIN_MISSING");
  }
  if (!merchantWallet) {
    decision = strongerDecision(decision, publicDecision(policy.global_rules?.unknown_merchant_decision || "APPROVAL_REQUIRED"));
    pushUnique(reasonCodes, "MERCHANT_WALLET_MISSING");
  }
  if (merchant.expected_wallet && merchantWallet && normalizeAddress(merchant.expected_wallet) !== merchantWallet) {
    decision = strongerDecision(decision, policy.global_rules?.merchant_wallet_mismatch_decision || "DENY");
    pushUnique(reasonCodes, "MERCHANT_WALLET_MISMATCH");
  }
  if (merchant.openapi_domain && merchantDomain && normalizeDomain(merchant.openapi_domain) !== merchantDomain) {
      decision = strongerDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_OPENAPI_DOMAIN_MISMATCH");
  }
  if (merchant.agent_card_domain && merchantDomain && normalizeDomain(merchant.agent_card_domain) !== merchantDomain) {
      decision = strongerDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_AGENT_CARD_DOMAIN_MISMATCH");
  }
  if (merchant.category && productCategory && normalizeToken(merchant.category) !== productCategory) {
      decision = strongerDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_CATEGORY_MISMATCH");
  }

  const kytRisk = normalizeToken(merchant.kyt_risk || input.kyt_risk || "unknown");
  if (kytRisk === "high") {
    decision = strongerDecision(decision, policy.global_rules?.high_kyt_risk_decision || "DENY");
    pushUnique(reasonCodes, "MERCHANT_KYT_HIGH_RISK");
    pushUnique(flags, "high_kyt_risk");
  } else if (kytRisk === "medium") {
      decision = strongerDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, "MERCHANT_KYT_MEDIUM_RISK");
    pushUnique(flags, "medium_kyt_risk");
  }

  const signerRequired = includesNormalized(
    policy.agentic_commerce?.signer_required_categories,
    productCategory,
  );
  const signerDirective = signerRequired
    ? { ...policy.agentic_commerce?.payment_signer_directive }
    : { ...policy.agentic_commerce?.default_signer_directive };

  if (signerRequired) {
    decision = strongerDecision(decision, "REQUIRE_APPROVAL");
    pushUnique(reasonCodes, signerDirective.reason_code);
    pushUnique(flags, "out_of_agent_signer_required");
  }

  return {
    schema_version: "agentic_commerce_preflight_result.v1",
    response_kind: "decision_response",
    evaluator_version: "signgate-agentic-commerce-evaluator.0.1.0",
    policy_version: policy.policy_version,
    evaluated_at: now,
    expires_at: expiresAt,
    decision,
    reason_codes: reasonCodes,
    buyer_preflight: {
      decision: buyerResult.decision,
      reason_codes: buyerResult.reason_codes,
      role_product_fit: buyerResult.role_product_fit,
    },
    mandate_preflight: {
      present: Boolean(mandate),
      mandate_id: mandate?.id || null,
      mandate_type: normalizeToken(mandate?.type || null) || null,
    },
    merchant_trust: {
      domain: merchantDomain || null,
      wallet: merchantWallet || null,
      category: normalizeToken(merchant.category || null) || null,
      kyt_risk: kytRisk,
    },
    signer_directive: signerDirective,
    decision_artifact: {
      issued: false,
      status: "not_cryptographically_signed",
      note: "Decision Artifact is a future signed object with request, policy, mandate, and evidence digests.",
    },
    audit_required: true,
    input: {
      buyer_id: buyerId || null,
      agent_id: agentId || null,
      agent_role: agentRole,
      product_category: productCategory,
      amount_usdc: amountUsdc,
      asset,
      chain,
      merchant_domain: merchantDomain || null,
      merchant_wallet: merchantWallet || null,
    },
    flags,
    recommended_next_action:
      decision === "ALLOW"
        ? "proceed_to_payment_or_checkout"
        : decision === "DENY"
          ? "block_agentic_commerce_action"
          : "request_owner_policy_or_signer_approval",
    limitations: [
      "Starter policy is deterministic and local; it does not verify live AP2, x402, KYT, or chain state.",
      "Signer directives tell downstream signers what class of approval is required; this kit does not sign transactions.",
      "Production deployments should bind decisions to authenticated agents, immutable policy versions, and audit logs.",
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

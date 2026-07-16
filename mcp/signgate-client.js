import { createHash } from "node:crypto";

export const SIGNGATE_PRODUCTION_URL =
  "https://base-agent-preflight.bytoken2023.workers.dev";

export const DECISIONS = new Set(["ALLOW", "REQUIRE_APPROVAL", "DENY"]);

export class SignGateMcpError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "SignGateMcpError";
    this.code = code;
    this.details = details;
  }
}

function sha256Json(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function stringOrNull(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text || null;
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function requestedAmount(input) {
  const amount = input.requested_amount ?? input.amount_usdc ?? input.amount;
  if (amount === undefined || amount === null || amount === "") {
    throw new SignGateMcpError(
      "invalid_input",
      "requested_amount is required",
    );
  }
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new SignGateMcpError(
      "invalid_input",
      "requested_amount must be a non-negative number",
      { requested_amount: amount },
    );
  }
  return normalized.toFixed(6).replace(/\.?0+$/, "");
}

export function mapEvaluatePaymentToSignGatePreflight(input = {}) {
  const agent = objectOrEmpty(input.agent);
  const buyer = objectOrEmpty(input.buyer);
  const mandate = input.mandate === null ? null : objectOrEmpty(input.mandate);
  const merchant = objectOrEmpty(input.merchant ?? input.seller);
  const resource = objectOrEmpty(input.resource);

  const agentId = stringOrNull(agent.id ?? input.agent_id);
  const agentRole = stringOrNull(agent.role ?? input.agent_role);
  const buyerId = stringOrNull(buyer.id ?? input.buyer_id);
  const merchantDomain = stringOrNull(
    merchant.domain ?? input.merchant_domain ?? input.seller_domain,
  );
  const merchantWallet = stringOrNull(
    merchant.wallet ?? input.merchant_wallet ?? input.seller_wallet,
  );
  const productCategory = stringOrNull(
    resource.category ?? input.product_category ?? input.action,
  );

  if (!agentId) throw new SignGateMcpError("invalid_input", "agent.id is required");
  if (!agentRole) throw new SignGateMcpError("invalid_input", "agent.role is required");
  if (!buyerId) throw new SignGateMcpError("invalid_input", "buyer.id is required");
  if (!merchantDomain && !merchantWallet) {
    throw new SignGateMcpError(
      "invalid_input",
      "merchant.domain or merchant.wallet is required",
    );
  }
  if (!productCategory) {
    throw new SignGateMcpError(
      "invalid_input",
      "resource.category or product_category is required",
    );
  }

  const amountUsdc = requestedAmount(input);
  const asset = stringOrNull(input.asset ?? resource.asset) ?? "USDC";
  const network = stringOrNull(input.network ?? input.chain ?? resource.network) ?? "base";
  const scheme =
    stringOrNull(input.payment_scheme ?? input.scheme ?? resource.payment_scheme) ?? "x402";

  return {
    buyer_id: buyerId,
    agent_id: agentId,
    agent_role: agentRole,
    action: stringOrNull(input.action) ?? "payment_execution",
    product_category: productCategory,
    amount_usdc: amountUsdc,
    asset,
    chain: network,
    payment_scheme: scheme,
    payment: {
      action: stringOrNull(input.action) ?? "payment_execution",
      product_category: productCategory,
      amount_usdc: amountUsdc,
      asset,
      chain: network,
      scheme,
      resource_url: stringOrNull(resource.url ?? input.resource_url),
    },
    mandate:
      mandate === null
        ? null
        : {
            ...mandate,
            buyer_id: mandate.buyer_id ?? buyerId,
            agent_id: mandate.agent_id ?? agentId,
            agent_role: mandate.agent_role ?? agentRole,
          },
    merchant: {
      ...merchant,
      domain: merchantDomain,
      wallet: merchantWallet,
      category: merchant.category ?? productCategory,
    },
    evidence_refs: Array.isArray(input.evidence_refs)
      ? input.evidence_refs
      : Array.isArray(input.evidence)
        ? input.evidence
        : [],
  };
}

export function validateSignGateDecisionResponse(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new SignGateMcpError(
      "malformed_signgate_response",
      "SignGate response must be an object",
    );
  }
  if (payload.response_kind !== "decision_response") {
    throw new SignGateMcpError(
      "malformed_signgate_response",
      "SignGate response_kind must be decision_response",
      { response_kind: payload.response_kind },
    );
  }
  if (!DECISIONS.has(payload.decision)) {
    throw new SignGateMcpError(
      "malformed_signgate_response",
      "SignGate decision must be ALLOW, REQUIRE_APPROVAL, or DENY",
      { decision: payload.decision },
    );
  }
  if (!payload.decision_id || !payload.policy_version) {
    throw new SignGateMcpError(
      "malformed_signgate_response",
      "SignGate response missing decision_id or policy_version",
    );
  }
  if (!payload.signer_directive || typeof payload.signer_directive !== "object") {
    throw new SignGateMcpError(
      "malformed_signgate_response",
      "SignGate response missing signer_directive",
    );
  }
  return payload;
}

export function normalizeMcpDecision(signGateRequest, signGateResponse) {
  const response = validateSignGateDecisionResponse(signGateResponse);
  const autoPaymentAllowed = response.decision === "ALLOW";
  return {
    schema_version: "signgate.mcp.evaluate_payment.v1",
    response_kind: "mcp_decision_envelope",
    decision: response.decision,
    decision_id: response.decision_id,
    policy_version: response.policy_version,
    request_hash: sha256Json(signGateRequest),
    evaluated_at: response.evaluated_at ?? null,
    expires_at: response.expires_at ?? null,
    agent: response.agent ?? null,
    buyer: response.buyer ?? null,
    mandate: response.mandate ?? null,
    merchant: response.merchant ?? null,
    resource: response.resource ?? null,
    reason_codes: response.reason_codes ?? [],
    evidence: response.evidence ?? [],
    signer_directive: response.signer_directive,
    auto_payment_allowed: autoPaymentAllowed,
    fail_closed: false,
    signgate_response: response,
  };
}

export function failClosedDecision(code, message, details = {}) {
  return {
    schema_version: "signgate.mcp.evaluate_payment.v1",
    response_kind: "mcp_decision_envelope",
    decision: "DENY",
    decision_id: null,
    policy_version: null,
    request_hash: null,
    evaluated_at: new Date().toISOString(),
    expires_at: null,
    agent: null,
    buyer: null,
    mandate: null,
    merchant: null,
    resource: null,
    reason_codes: [code],
    evidence: [],
    signer_directive: {
      required: true,
      mode: "fail_closed",
      agent_may_directly_sign: false,
      execution_may_be_agent_initiated: false,
      signer_isolation_required: true,
      reason_code: code,
    },
    auto_payment_allowed: false,
    fail_closed: true,
    error: { code, message, details },
    signgate_response: null,
  };
}

export function mockSignerMayContinue(decisionEnvelope) {
  return decisionEnvelope?.decision === "ALLOW" && decisionEnvelope?.fail_closed === false;
}

export async function evaluatePayment(input, options = {}) {
  const {
    baseUrl = process.env.SIGNGATE_BASE_URL || SIGNGATE_PRODUCTION_URL,
    apiKey = process.env.SIGNGATE_API_KEY,
    fetchImpl = fetch,
    timeoutMs = Number(process.env.SIGNGATE_TIMEOUT_MS || 5000),
  } = options;

  if (!apiKey) {
    throw new SignGateMcpError(
      "credential_missing",
      "SIGNGATE_API_KEY is required; refusing anonymous production access",
    );
  }
  if (!fetchImpl) {
    throw new SignGateMcpError("transport_unavailable", "fetch is unavailable");
  }

  const signGateRequest = mapEvaluatePaymentToSignGatePreflight(input);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(
      `${String(baseUrl).replace(/\/$/, "")}/v1/agentic-commerce/preflight`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "user-agent": "signgate-mcp/0.1.0",
        },
        body: JSON.stringify(signGateRequest),
        signal: controller.signal,
      },
    );
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      throw new SignGateMcpError(
        "malformed_signgate_response",
        "SignGate response was not JSON",
        { cause: error instanceof Error ? error.message : String(error) },
      );
    }
    if (!response.ok) {
      throw new SignGateMcpError(
        "upstream_error",
        `SignGate returned HTTP ${response.status}`,
        { status: response.status, payload },
      );
    }
    return normalizeMcpDecision(signGateRequest, payload);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new SignGateMcpError("timeout", "SignGate request timed out", {
        timeout_ms: timeoutMs,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function evaluatePaymentFailClosed(input, options = {}) {
  try {
    return await evaluatePayment(input, options);
  } catch (error) {
    if (error instanceof SignGateMcpError) {
      return failClosedDecision(error.code, error.message, error.details);
    }
    return failClosedDecision(
      "upstream_error",
      error instanceof Error ? error.message : String(error),
    );
  }
}

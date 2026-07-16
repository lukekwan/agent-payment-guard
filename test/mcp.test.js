import test from "node:test";
import assert from "node:assert/strict";

import {
  evaluatePayment,
  evaluatePaymentFailClosed,
  mapEvaluatePaymentToSignGatePreflight,
  mockSignerMayContinue,
  SignGateMcpError,
} from "../mcp/signgate-client.js";

const baseInput = {
  agent: { id: "agent.finance.001", role: "research_agent" },
  buyer: { id: "buyer.acme" },
  mandate: {
    id: "mandate-1",
    type: "payment",
    status: "active",
    merchant_domains: ["api.seller.example"],
    merchant_wallets: ["0x1111111111111111111111111111111111111111"],
    allowed_categories: ["wallet_risk"],
    max_amount_usdc: "0.02",
    assets: ["USDC"],
    chains: ["base"],
  },
  merchant: {
    domain: "api.seller.example",
    wallet: "0x1111111111111111111111111111111111111111",
    category: "wallet_risk",
    kyt_risk: "low",
  },
  resource: {
    id: "wallet-risk",
    url: "https://api.seller.example/v1/x402/wallet-risk",
    category: "wallet_risk",
  },
  requested_amount: "0.005",
  asset: "USDC",
  network: "base",
  payment_scheme: "x402",
};

function responsePayload(decision) {
  return {
    schema_version: "agentic_commerce_preflight_result.v1",
    response_kind: "decision_response",
    decision,
    decision_id: `dec_${decision.toLowerCase()}`,
    policy_version: "signgate-agentic-commerce-policy-2026-07-15",
    evaluated_at: "2026-07-16T10:00:00.000Z",
    expires_at: "2026-07-16T10:05:00.000Z",
    agent: { id: "agent.finance.001", role: "research_agent" },
    buyer: { id: "buyer.acme" },
    mandate: { id: "mandate-1", type: "payment", status: "active" },
    merchant: { domain: "api.seller.example" },
    resource: { category: "wallet_risk", amount_usdc: 0.005, asset: "USDC", chain: "base" },
    reason_codes: ["POLICY_MATCH"],
    evidence: [{ type: "agent_buyer_identity", decision: "ALLOW" }],
    signer_directive: {
      required: false,
      agent_may_directly_sign: false,
      execution_may_be_agent_initiated: true,
      signer_isolation_required: false,
    },
  };
}

test("maps evaluate_payment input to existing SignGate preflight contract", () => {
  const mapped = mapEvaluatePaymentToSignGatePreflight(baseInput);
  assert.equal(mapped.agent_id, "agent.finance.001");
  assert.equal(mapped.buyer_id, "buyer.acme");
  assert.equal(mapped.product_category, "wallet_risk");
  assert.equal(mapped.amount_usdc, "0.005");
  assert.equal(mapped.payment.scheme, "x402");
  assert.equal(mapped.mandate.agent_role, "research_agent");
});

test("normal ALLOW returns signer directive and permits only mock continuation", async () => {
  let called = false;
  const result = await evaluatePayment(baseInput, {
    apiKey: "test-key",
    baseUrl: "https://signgate.test",
    fetchImpl: async (url, init) => {
      called = true;
      assert.equal(url, "https://signgate.test/v1/agentic-commerce/preflight");
      assert.equal(init.headers.authorization, "Bearer test-key");
      return Response.json(responsePayload("ALLOW"));
    },
  });
  assert.equal(called, true);
  assert.equal(result.decision, "ALLOW");
  assert.equal(result.auto_payment_allowed, true);
  assert.equal(mockSignerMayContinue(result), true);
  assert.equal(result.signer_directive.agent_may_directly_sign, false);
});

test("REQUIRE_APPROVAL fail-stops automatic signer continuation", async () => {
  const result = await evaluatePayment(baseInput, {
    apiKey: "test-key",
    fetchImpl: async () => Response.json(responsePayload("REQUIRE_APPROVAL")),
  });
  assert.equal(result.decision, "REQUIRE_APPROVAL");
  assert.equal(result.auto_payment_allowed, false);
  assert.equal(mockSignerMayContinue(result), false);
});

test("DENY fail-stops automatic signer continuation", async () => {
  const result = await evaluatePayment(baseInput, {
    apiKey: "test-key",
    fetchImpl: async () => Response.json(responsePayload("DENY")),
  });
  assert.equal(result.decision, "DENY");
  assert.equal(result.auto_payment_allowed, false);
  assert.equal(mockSignerMayContinue(result), false);
});

test("timeout returns fail-closed DENY through MCP helper", async () => {
  const result = await evaluatePaymentFailClosed(baseInput, {
    apiKey: "test-key",
    timeoutMs: 10,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        });
      }),
  });
  assert.equal(result.decision, "DENY");
  assert.equal(result.fail_closed, true);
  assert.equal(result.error.code, "timeout");
  assert.equal(mockSignerMayContinue(result), false);
});

test("malformed upstream response returns fail-closed DENY", async () => {
  const result = await evaluatePaymentFailClosed(baseInput, {
    apiKey: "test-key",
    fetchImpl: async () => Response.json({ response_kind: "decision_response", decision: "MAYBE" }),
  });
  assert.equal(result.decision, "DENY");
  assert.equal(result.fail_closed, true);
  assert.equal(result.error.code, "malformed_signgate_response");
});

test("missing credential rejects before any production call", async () => {
  let called = false;
  await assert.rejects(
    evaluatePayment(baseInput, {
      apiKey: "",
      fetchImpl: async () => {
        called = true;
        return Response.json(responsePayload("ALLOW"));
      },
    }),
    error =>
      error instanceof SignGateMcpError &&
      error.code === "credential_missing",
  );
  assert.equal(called, false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import YAML from "yaml";

import {
  PAYMENT_DECISION_ADAPTER_STATUS,
  PAYMENT_DECISION_ENFORCEMENT_PROFILE_VERSION,
  PAYMENT_DECISION_REASON_REGISTRY,
  PAYMENT_DECISION_SCHEMA_VERSION,
  SIGNGATE_PAYMENT_REASON_CODE_MAP,
  PaymentDecisionContractError,
  buildPaymentDecisionCompatibilityProjection,
  canonicalPaymentDecisionJson,
  mapSignGateDecisionResultToPaymentDecision,
  normalizeLegacyPaymentDecision,
  normalizeLegacyPaymentDecisionResponse,
  parsePaymentDecisionJson,
  paymentDecisionEvidenceFingerprint,
  paymentDecisionRequestFingerprint,
  paymentDecisionTransportEnvelope,
  validatePaymentDecisionConsumerResponse,
  validatePaymentDecisionEnvelope,
  validatePaymentDecisionRequest,
  validatePaymentDecisionResponse,
} from "../src/payment-decision-contract.js";

const HASH_A = `sha256:${"a".repeat(64)}`;
const HASH_B = `sha256:${"b".repeat(64)}`;
const HASH_C = `sha256:${"c".repeat(64)}`;
const NOW = "2026-07-22T00:00:00.000Z";
const LATER = "2026-07-22T00:10:00.000Z";

function request(overrides = {}) {
  const value = {
    schema_version: PAYMENT_DECISION_SCHEMA_VERSION,
    request_id: "req_payment_001",
    agent: { id: "agent_codex_01", type: "coding_agent", authenticated_by: "preview_api_key" },
    buyer: { id: "buyer_001", wallet_address: `0x${"1".repeat(40)}`, country: "TW" },
    mandate: { id: "mandate_001", scope: ["payment:preview"], issued_by: "founder_01", expires_at: LATER },
    merchant: { id: "merchant_001", name: "Preview Merchant", wallet_address: `0x${"2".repeat(40)}`, domain: "merchant.test" },
    resource: { id: "resource_001", type: "api", uri: "https://merchant.test/resource" },
    payment_intent: {
      intent_id: "intent_001",
      scheme: "x402",
      network: { namespace: "eip155", reference: "8453" },
      asset: { type: "erc20", address: `0x${"3".repeat(40)}`, symbol: "USDC" },
      amount: { atomic_value: "25000000" },
    },
    evidence: [{ id: "evidence_001", type: "risk_signal", source: "trusted_preview", fingerprint: HASH_A, observed_at: NOW }],
    context: { requested_at: NOW, workflow_id: "workflow_001" },
  };
  return deepMerge(value, overrides);
}

function response(decision = "ALLOW", overrides = {}) {
  const executable = decision === "ALLOW";
  const value = {
    schema_version: PAYMENT_DECISION_SCHEMA_VERSION,
    decision_id: "01J00000000000000000000000",
    decision,
    reason_codes: [decision === "ALLOW" ? "POLICY_MATCH" : decision === "REQUIRE_APPROVAL" ? "APPROVAL_REQUIRED_BY_POLICY" : "MERCHANT_DENIED"],
    reason_code_registry_version: PAYMENT_DECISION_REASON_REGISTRY,
    policy_version: "payment_policy_2026_07_22_01",
    evaluated_at: NOW,
    expires_at: LATER,
    request_fingerprint: HASH_A,
    evidence_fingerprint: HASH_B,
    authorization_subject_fingerprint: HASH_C,
    mandate_id: "mandate_001",
    merchant_id: "merchant_001",
    resource_id: "resource_001",
    signer_directive: {
      action: executable ? "ALLOW_SIGNING_AFTER_ENFORCEMENT" : "DO_NOT_SIGN",
      max_uses: executable ? 1 : 0,
    },
    enforcement_requirements: {
      profile: executable
        ? "sg.enforcement.v1.atomic_single_use_authority_revalidation"
        : "sg.enforcement.v1.non_executable_fresh_evaluation",
      profile_version: PAYMENT_DECISION_ENFORCEMENT_PROFILE_VERSION,
      required_before_execution: executable
        ? ["atomic_authority_revalidation", "single_use_consume"]
        : ["fresh_evaluation"],
    },
  };
  return deepMerge(value, overrides);
}

function deepMerge(base, overrides) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object" && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function contractError(fn, status, code) {
  assert.throws(fn, error => error instanceof PaymentDecisionContractError && error.status === status && error.code === code);
}

test("Payment Decision candidate validates with Ajv Draft 2020-12 and rejects unknown fields", () => {
  assert.deepEqual(validatePaymentDecisionRequest(request()), request());
  assert.deepEqual(validatePaymentDecisionResponse(response()), response());
  assert.deepEqual(validatePaymentDecisionEnvelope({ request: request(), response: response() }), { request: request(), response: response() });
  contractError(() => validatePaymentDecisionRequest(request({ unexpected: true })), 422, "REQUEST_SCHEMA_INVALID");
  contractError(() => validatePaymentDecisionRequest(request({ merchant: { unexpected: true } })), 422, "REQUEST_SCHEMA_INVALID");
});

test("strict JSON rejects malformed forms, comments, trailing commas, duplicate and escaped-equivalent keys", () => {
  for (const text of [
    "{",
    "{/*comment*/\"schema_version\":\"x\"}",
    "{\"schema_version\":\"x\",}",
    "{\"request_id\":\"a\",\"request_id\":\"b\"}",
    "{\"request_id\":\"a\",\"request_\\u0069d\":\"b\"}",
    "{\"request_id\":\"\\uD800\"}",
  ]) {
    contractError(() => parsePaymentDecisionJson(new TextEncoder().encode(text)), 400, "MALFORMED_JSON");
  }
});

test("strict JSON rejects unsupported money and numeric forms", () => {
  for (const atomicValue of [0, 1, -1, 1.5, "0", "-1", "1.5", "1e3", "+1"] ) {
    contractError(
      () => parsePaymentDecisionJson(JSON.stringify(request({ payment_intent: { amount: { atomic_value: atomicValue } } }))),
      422,
      "REQUEST_SCHEMA_INVALID",
    );
  }
  contractError(
    () => validatePaymentDecisionRequest(request({ payment_intent: { amount: { atomic_value: "9".repeat(78) } } })),
    422,
    "REQUEST_SCHEMA_INVALID",
  );
});

test("strict JSON enforces nesting and raw-byte bounds before canonicalization", () => {
  const nested = `${"{\"x\":".repeat(30)}0${"}".repeat(30)}`;
  contractError(() => parsePaymentDecisionJson(nested), 422, "REQUEST_SCHEMA_INVALID");
  contractError(() => parsePaymentDecisionJson(new Uint8Array(64 * 1024 + 1)), 422, "REQUEST_SCHEMA_INVALID");
});

test("JCS serialization and request/evidence fingerprints are deterministic and domain separated", async () => {
  assert.equal(canonicalPaymentDecisionJson({ z: 1, a: "台北" }), "{\"a\":\"台北\",\"z\":1}");
  const first = request();
  const reordered = JSON.parse(JSON.stringify(first, Object.keys(first).reverse()));
  const firstFingerprint = await paymentDecisionRequestFingerprint(first);
  assert.equal(firstFingerprint, await paymentDecisionRequestFingerprint(structuredClone(first)));
  assert.notEqual(firstFingerprint, await paymentDecisionEvidenceFingerprint(first));
  const withAuthorization = request({ authorization: { approval_ref: "approval_001", origin_request_fingerprint: HASH_A } });
  assert.equal(firstFingerprint, await paymentDecisionRequestFingerprint(withAuthorization));
  assert.equal(await paymentDecisionEvidenceFingerprint(first), await paymentDecisionEvidenceFingerprint(first.evidence));
  assert.notEqual(canonicalPaymentDecisionJson(first), canonicalPaymentDecisionJson(reordered));
});

test("legacy adapter normalizes only APPROVAL_REQUIRED and never emits REVIEW", () => {
  assert.equal(normalizeLegacyPaymentDecision("APPROVAL_REQUIRED"), "REQUIRE_APPROVAL");
  assert.equal(normalizeLegacyPaymentDecision("ALLOW"), "ALLOW");
  contractError(() => normalizeLegacyPaymentDecision("REVIEW"), 422, "LEGACY_DECISION_INVALID");
  const legacy = response("REQUIRE_APPROVAL", { decision: undefined, status: "APPROVAL_REQUIRED" });
  delete legacy.decision;
  assert.equal(normalizeLegacyPaymentDecisionResponse(legacy).decision, "REQUIRE_APPROVAL");
  contractError(() => normalizeLegacyPaymentDecisionResponse({ ...legacy, injected: true }), 422, "LEGACY_RESPONSE_INVALID");
});

test("consumer returns a sanitized response and enforces binding, expiry, reason, directive, and profile invariants", () => {
  const value = response();
  const sanitized = validatePaymentDecisionConsumerResponse(value, {
    now: "2026-07-22T00:05:00.000Z",
    request_fingerprint: HASH_A,
    evidence_fingerprint: HASH_B,
    authorization_subject_fingerprint: HASH_C,
    mandate_id: "mandate_001",
    merchant_id: "merchant_001",
    resource_id: "resource_001",
    policy_version: "payment_policy_2026_07_22_01",
  });
  assert.notEqual(sanitized, value);
  contractError(() => validatePaymentDecisionConsumerResponse(value, { request_fingerprint: HASH_B }), 409, "RESPONSE_BINDING_MISMATCH");
  contractError(() => validatePaymentDecisionConsumerResponse(value, { now: LATER }), 409, "DECISION_EXPIRED");
  contractError(() => validatePaymentDecisionConsumerResponse(response("ALLOW", { reason_codes: ["MERCHANT_DENIED"] })), 422, "RESPONSE_INVARIANT_FAILED");
  contractError(() => validatePaymentDecisionConsumerResponse(response("ALLOW", { enforcement_requirements: { required_before_execution: ["single_use_consume"] } })), 422, "RESPONSE_INVARIANT_FAILED");
  contractError(() => validatePaymentDecisionResponse(response("ALLOW", { signer_directive: { action: "DO_NOT_SIGN", max_uses: 0 } })), 422, "REQUEST_SCHEMA_INVALID");
});

test("compatibility projection preserves provenance and remains explicitly non-deployed", () => {
  const projected = buildPaymentDecisionCompatibilityProjection(request(), {
    organizationId: "org_nomos",
    authenticatedAgentId: "agent_codex_01",
  });
  assert.equal(projected.adapter_status, PAYMENT_DECISION_ADAPTER_STATUS);
  assert.equal(projected.deployment_authorized, false);
  assert.equal(projected.canonical_endpoint, "POST /v1/decisions");
  assert.equal(projected.canonical_action.type, "x402_purchase");
  assert.equal(projected.canonical_action.parameters.payment.amount.atomic_value, "25000000");
  assert.equal(projected.provenance.organization_id, "org_nomos");
  contractError(
    () => buildPaymentDecisionCompatibilityProjection(request(), { organizationId: "org_nomos", authenticatedAgentId: "other_agent" }),
    403,
    "AGENT_IDENTITY_MISMATCH",
  );
});

test("4xx/5xx transport envelopes fail closed and 5xx never masquerades as policy DENY", () => {
  const caller = paymentDecisionTransportEnvelope(422, { code: "REQUEST_SCHEMA_INVALID", reasonCodes: ["REQUEST_INVALID"] });
  assert.equal(caller.enforcement_effect, "DENY");
  assert.equal("decision" in caller, false);
  const system = paymentDecisionTransportEnvelope(503, { code: "DENY" });
  assert.equal(system.error, "INTERNAL_INVARIANT_FAILED");
  assert.equal("decision" in system, false);
});

test("SignGate reason and audit mapping is complete, deterministic, and fail-closed", () => {
  const nonDeny = {
    PREVIEW_DEPLOY_POLICY_PASSED: "ALLOW",
    APPROVAL_GRANT_ACCEPTED: "ALLOW",
    PRODUCTION_GATE_4_REQUIRED: "REQUIRE_APPROVAL",
    PERMISSION_CHANGE_REQUIRES_APPROVAL: "REQUIRE_APPROVAL",
    DNS_CHANGE_REQUIRES_APPROVAL: "REQUIRE_APPROVAL",
    CREDENTIAL_CHANGE_REQUIRES_APPROVAL: "REQUIRE_APPROVAL",
  };
  for (const [code, paymentCode] of Object.entries(SIGNGATE_PAYMENT_REASON_CODE_MAP)) {
    const auditId = `audit_${code.toLowerCase()}`;
    const mapped = mapSignGateDecisionResultToPaymentDecision({
      decision: nonDeny[code] || "DENY",
      reason_codes: [code],
      audit_id: auditId,
    });
    assert.deepEqual(mapped.reason_codes, [paymentCode]);
    assert.equal(mapped.audit_ref, auditId);
  }
  contractError(
    () => mapSignGateDecisionResultToPaymentDecision({ decision: "DENY", reason_codes: ["UNMAPPED"], audit_id: "audit_1" }),
    422,
    "REASON_CODE_MAPPING_UNDEFINED",
  );
  contractError(
    () => mapSignGateDecisionResultToPaymentDecision({ decision: "ALLOW", reason_codes: ["PREVIEW_DEPLOY_POLICY_PASSED"], audit_id: null }),
    422,
    "AUDIT_MAPPING_UNDEFINED",
  );
  contractError(
    () => mapSignGateDecisionResultToPaymentDecision({ decision: "DENY", reason_codes: ["PREVIEW_DEPLOY_POLICY_PASSED"], audit_id: "audit_1" }),
    422,
    "REASON_CODE_MAPPING_CONTRADICTS_DECISION",
  );
});

test("schema, prose, adapter and OpenAPI stay in candidate-unit conformance", () => {
  const schema = JSON.parse(readFileSync(new URL("../specs/payment-decision-contract.schema.json", import.meta.url), "utf8"));
  const prose = readFileSync(new URL("../docs/contracts/PAYMENT_DECISION_CONTRACT.md", import.meta.url), "utf8");
  const adapter = readFileSync(new URL("../docs/contracts/PAYMENT_DECISION_COMPATIBILITY_ADAPTER.md", import.meta.url), "utf8");
  const openapi = YAML.parse(readFileSync(new URL("../openapi/signgate.openapi.yaml", import.meta.url), "utf8"));
  assert.deepEqual(schema.$defs.Decision.enum, ["ALLOW", "REQUIRE_APPROVAL", "DENY"]);
  assert.match(prose, /RECONCILIATION_CANDIDATE/);
  assert.match(prose, /specs\/payment-decision-contract\.schema\.json/);
  assert.match(adapter, /PREVIEW \/ PLANNED \/ NOT DEPLOYED/);
  assert.equal(openapi.info.version, "0.1-candidate");
  assert.deepEqual(openapi.components.schemas.PaymentDecision.enum, schema.$defs.Decision.enum);
  assert.equal(openapi.paths["/v1/agentic-commerce/preflight"]["x-signgate-status"], "PREVIEW_PLANNED_NOT_DEPLOYED");
  assert.equal(openapi.paths["/v1/decisions"].post.responses["200"].description.includes("ALLOW"), true);
});

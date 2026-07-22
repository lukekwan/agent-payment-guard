import { parse as parseJsonAst } from "@humanwhocodes/momoa";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import canonicalize from "canonicalize";

import paymentDecisionSchema from "../specs/payment-decision-contract.schema.json" with { type: "json" };

export const PAYMENT_DECISION_SCHEMA_VERSION = "payment_decision_contract.v1.candidate";
export const PAYMENT_DECISION_REASON_REGISTRY = "payment_decision_reason_codes.v1.candidate";
export const PAYMENT_DECISION_ENFORCEMENT_PROFILE_VERSION = "payment_decision_enforcement_profiles.v1.candidate";
export const PAYMENT_DECISION_REQUEST_DOMAIN = "signgate.payment_decision_contract.v1.candidate.request\n";
export const PAYMENT_DECISION_EVIDENCE_DOMAIN = "signgate.payment_decision_contract.v1.candidate.evidence\n";
export const PAYMENT_DECISION_ADAPTER_STATUS = "PREVIEW_PLANNED_NOT_DEPLOYED";

export const PAYMENT_DECISION_JSON_LIMITS = Object.freeze({
  maxBytes: 64 * 1024,
  maxDepth: 24,
  maxObjectMembers: 256,
  maxArrayLength: 256,
  maxStringBytes: 8192,
});

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const MAX_UINT256 = (1n << 256n) - 1n;
const REQUEST_KEYS = Object.freeze([
  "schema_version",
  "request_id",
  "agent",
  "buyer",
  "mandate",
  "merchant",
  "resource",
  "payment_intent",
  "evidence",
  "context",
]);
const RESPONSE_KEYS = new Set([
  "schema_version",
  "decision_id",
  "decision",
  "reason_codes",
  "reason_code_registry_version",
  "policy_version",
  "policy",
  "evaluated_at",
  "expires_at",
  "request_fingerprint",
  "evidence_fingerprint",
  "authorization_subject_fingerprint",
  "approval_ref",
  "mandate_id",
  "merchant_id",
  "resource_id",
  "signer_directive",
  "enforcement_requirements",
  "audit_ref",
]);
const SECURITY_EXPECTATION_KEYS = new Set([
  "now",
  "request_fingerprint",
  "evidence_fingerprint",
  "authorization_subject_fingerprint",
  "mandate_id",
  "merchant_id",
  "resource_id",
  "approval_ref",
  "policy_version",
]);
const DECISION_REASON_CODES = Object.freeze({
  ALLOW: new Set(["POLICY_MATCH"]),
  REQUIRE_APPROVAL: new Set(["APPROVAL_REQUIRED_BY_POLICY"]),
  DENY: new Set([
    "MERCHANT_DENIED",
    "NETWORK_NOT_ALLOWED",
    "AMOUNT_EXCEEDS_LIMIT",
    "ASSET_METADATA_UNVERIFIED",
    "EVIDENCE_INVALID",
    "REQUEST_INVALID",
  ]),
});

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictRequired: false,
  strictTypes: false,
});
addFormats(ajv);
const validateEnvelopeSchema = ajv.compile(paymentDecisionSchema);
const validateRequestSchema = ajv.compile({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $ref: `${paymentDecisionSchema.$id}#/$defs/PaymentDecisionRequest`,
});
const validateResponseSchema = ajv.compile({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $ref: `${paymentDecisionSchema.$id}#/$defs/PaymentDecisionResponse`,
});

export class PaymentDecisionContractError extends Error {
  constructor(status, code, detail = "", validationErrors = []) {
    super(detail || code);
    this.name = "PaymentDecisionContractError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.validationErrors = validationErrors;
  }
}

function validationFailure(errors) {
  const safeErrors = (errors || []).map(({ instancePath, keyword, message, params }) => ({
    instancePath,
    keyword,
    message,
    params,
  }));
  return new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Payment Decision schema validation failed", safeErrors);
}

function assertWellFormedUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        throw new PaymentDecisionContractError(400, "MALFORMED_JSON", "Unpaired high surrogate");
      }
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new PaymentDecisionContractError(400, "MALFORMED_JSON", "Unpaired low surrogate");
    }
  }
}

function detectDuplicatesAndBounds(node, depth = 0) {
  if (depth > PAYMENT_DECISION_JSON_LIMITS.maxDepth) {
    throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum JSON depth exceeded");
  }
  if (!node || typeof node !== "object") return;
  if (node.type === "Object") {
    if (node.members.length > PAYMENT_DECISION_JSON_LIMITS.maxObjectMembers) {
      throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum object member count exceeded");
    }
    const names = new Set();
    for (const member of node.members) {
      const key = member.name.value;
      assertWellFormedUnicode(key);
      if (names.has(key)) {
        throw new PaymentDecisionContractError(400, "MALFORMED_JSON", `Duplicate JSON key: ${key}`);
      }
      names.add(key);
      if (TEXT_ENCODER.encode(key).byteLength > PAYMENT_DECISION_JSON_LIMITS.maxStringBytes) {
        throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum JSON key length exceeded");
      }
      detectDuplicatesAndBounds(member.value, depth + 1);
    }
    return;
  }
  if (node.type === "Array") {
    if (node.elements.length > PAYMENT_DECISION_JSON_LIMITS.maxArrayLength) {
      throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum array length exceeded");
    }
    for (const element of node.elements) detectDuplicatesAndBounds(element.value, depth + 1);
    return;
  }
  if (node.type === "String") {
    assertWellFormedUnicode(node.value);
    if (TEXT_ENCODER.encode(node.value).byteLength > PAYMENT_DECISION_JSON_LIMITS.maxStringBytes) {
      throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum string length exceeded");
    }
  }
}

function runSchemaValidator(validator, value) {
  if (!validator(value)) throw validationFailure(validator.errors);
  return structuredClone(value);
}

export function validatePaymentDecisionEnvelope(value) {
  return runSchemaValidator(validateEnvelopeSchema, value);
}

export function validatePaymentDecisionRequest(value) {
  const validated = runSchemaValidator(validateRequestSchema, value);
  if (BigInt(validated.payment_intent.amount.atomic_value) > MAX_UINT256) {
    throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "atomic_value exceeds uint256");
  }
  return validated;
}

export function validatePaymentDecisionResponse(value) {
  return runSchemaValidator(validateResponseSchema, value);
}

export function parsePaymentDecisionJson(bytes, kind = "request") {
  const input = bytes instanceof Uint8Array ? bytes : TEXT_ENCODER.encode(String(bytes));
  if (input.byteLength > PAYMENT_DECISION_JSON_LIMITS.maxBytes) {
    throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Maximum raw JSON bytes exceeded");
  }
  let text;
  try {
    text = TEXT_DECODER.decode(input);
  } catch {
    throw new PaymentDecisionContractError(400, "MALFORMED_JSON", "Invalid UTF-8");
  }
  try {
    const ast = parseJsonAst(text, { mode: "json", allowTrailingCommas: false });
    detectDuplicatesAndBounds(ast.body);
  } catch (error) {
    if (error instanceof PaymentDecisionContractError) throw error;
    throw new PaymentDecisionContractError(400, "MALFORMED_JSON", error.message);
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new PaymentDecisionContractError(400, "MALFORMED_JSON", error.message);
  }
  if (kind === "request") return validatePaymentDecisionRequest(value);
  if (kind === "response") return validatePaymentDecisionResponse(value);
  if (kind === "envelope") return validatePaymentDecisionEnvelope(value);
  throw new TypeError(`Unsupported Payment Decision JSON kind: ${kind}`);
}

export function canonicalPaymentDecisionJson(value) {
  const serialized = canonicalize(value);
  if (typeof serialized !== "string") {
    throw new PaymentDecisionContractError(422, "REQUEST_SCHEMA_INVALID", "Value cannot be serialized by RFC 8785 JCS");
  }
  return serialized;
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", TEXT_ENCODER.encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function projectRequestForFingerprint(request) {
  const projected = {};
  for (const key of REQUEST_KEYS) projected[key] = structuredClone(request[key]);
  return projected;
}

export async function paymentDecisionRequestFingerprint(request) {
  const validated = validatePaymentDecisionRequest(request);
  return `sha256:${await sha256(PAYMENT_DECISION_REQUEST_DOMAIN + canonicalPaymentDecisionJson(projectRequestForFingerprint(validated)))}`;
}

export async function paymentDecisionEvidenceFingerprint(requestOrEvidence) {
  const evidence = Array.isArray(requestOrEvidence)
    ? structuredClone(requestOrEvidence)
    : validatePaymentDecisionRequest(requestOrEvidence).evidence;
  return `sha256:${await sha256(PAYMENT_DECISION_EVIDENCE_DOMAIN + canonicalPaymentDecisionJson(evidence))}`;
}

export function normalizeLegacyPaymentDecision(value) {
  if (value === "APPROVAL_REQUIRED") return "REQUIRE_APPROVAL";
  if (["ALLOW", "REQUIRE_APPROVAL", "DENY"].includes(value)) return value;
  throw new PaymentDecisionContractError(422, "LEGACY_DECISION_INVALID", "Unknown legacy decision value");
}

function assertKnownKeys(value, allowed, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PaymentDecisionContractError(422, code, "Object required");
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new PaymentDecisionContractError(422, code, `Unknown field: ${key}`);
  }
}

export function normalizeLegacyPaymentDecisionResponse(value) {
  assertKnownKeys(value, new Set([...RESPONSE_KEYS, "status"]), "LEGACY_RESPONSE_INVALID");
  const normalized = {};
  for (const key of RESPONSE_KEYS) {
    if (value[key] !== undefined) normalized[key] = structuredClone(value[key]);
  }
  normalized.decision = normalizeLegacyPaymentDecision(value.decision ?? value.status);
  return validatePaymentDecisionResponse(normalized);
}

export function validatePaymentDecisionConsumerResponse(value, expected = {}) {
  assertKnownKeys(expected, SECURITY_EXPECTATION_KEYS, "CONSUMER_EXPECTATION_INVALID");
  const sanitized = validatePaymentDecisionResponse(value);
  const allowedReasons = DECISION_REASON_CODES[sanitized.decision];
  if (!sanitized.reason_codes.every(code => allowedReasons.has(code))) {
    throw new PaymentDecisionContractError(422, "RESPONSE_INVARIANT_FAILED", "Reason code contradicts decision");
  }
  const executable = sanitized.decision === "ALLOW";
  const expectedDirective = executable ? "ALLOW_SIGNING_AFTER_ENFORCEMENT" : "DO_NOT_SIGN";
  const expectedMaxUses = executable ? 1 : 0;
  const expectedProfile = executable
    ? "sg.enforcement.v1.atomic_single_use_authority_revalidation"
    : "sg.enforcement.v1.non_executable_fresh_evaluation";
  const expectedChecks = executable
    ? ["atomic_authority_revalidation", "single_use_consume"]
    : ["fresh_evaluation"];
  if (
    sanitized.reason_code_registry_version !== PAYMENT_DECISION_REASON_REGISTRY ||
    sanitized.signer_directive.action !== expectedDirective ||
    sanitized.signer_directive.max_uses !== expectedMaxUses ||
    sanitized.enforcement_requirements.profile !== expectedProfile ||
    canonicalPaymentDecisionJson([...sanitized.enforcement_requirements.required_before_execution].sort()) !== canonicalPaymentDecisionJson(expectedChecks) ||
    (sanitized.policy && sanitized.policy.policy_version !== sanitized.policy_version) ||
    (sanitized.policy?.reason_code_registry_version && sanitized.policy.reason_code_registry_version !== sanitized.reason_code_registry_version)
  ) {
    throw new PaymentDecisionContractError(422, "RESPONSE_INVARIANT_FAILED", "Signer or enforcement profile contradicts decision");
  }
  for (const key of [
    "request_fingerprint",
    "evidence_fingerprint",
    "authorization_subject_fingerprint",
    "mandate_id",
    "merchant_id",
    "resource_id",
    "approval_ref",
    "policy_version",
  ]) {
    if (expected[key] !== undefined && sanitized[key] !== expected[key]) {
      throw new PaymentDecisionContractError(409, "RESPONSE_BINDING_MISMATCH", `${key} mismatch`);
    }
  }
  if (expected.now !== undefined) {
    const now = typeof expected.now === "number" ? expected.now : Date.parse(expected.now);
    if (!Number.isFinite(now) || now < Date.parse(sanitized.evaluated_at) || now >= Date.parse(sanitized.expires_at)) {
      throw new PaymentDecisionContractError(409, "DECISION_EXPIRED", "Decision is outside its validity interval");
    }
  }
  return sanitized;
}

export function buildPaymentDecisionCompatibilityProjection(request, { organizationId, authenticatedAgentId } = {}) {
  const validated = validatePaymentDecisionRequest(request);
  if (!organizationId || !authenticatedAgentId) {
    throw new PaymentDecisionContractError(403, "TENANT_CONTEXT_MISMATCH", "Authenticated tenant and agent are required");
  }
  if (validated.agent.id !== authenticatedAgentId) {
    throw new PaymentDecisionContractError(403, "AGENT_IDENTITY_MISMATCH", "Caller agent does not match authenticated principal");
  }
  return {
    adapter_status: PAYMENT_DECISION_ADAPTER_STATUS,
    deployment_authorized: false,
    canonical_endpoint: "POST /v1/decisions",
    canonical_action: {
      type: validated.payment_intent.scheme === "x402" ? "x402_purchase" : "payment",
      target: {
        counterparty: structuredClone(validated.merchant),
        resource: structuredClone(validated.resource),
      },
      parameters: {
        payment: structuredClone(validated.payment_intent),
      },
    },
    provenance: {
      organization_id: organizationId,
      authenticated_agent_id: authenticatedAgentId,
      buyer: structuredClone(validated.buyer),
      mandate: structuredClone(validated.mandate),
      evidence: structuredClone(validated.evidence),
      context: structuredClone(validated.context),
      authorization: validated.authorization ? structuredClone(validated.authorization) : undefined,
    },
  };
}

export function paymentDecisionTransportEnvelope(status, { code, reasonCodes = [], requestId = null, auditId = null } = {}) {
  if (!Number.isInteger(status) || status < 400 || status > 599) throw new TypeError("Error status must be 4xx or 5xx");
  const body = {
    schema_version: PAYMENT_DECISION_SCHEMA_VERSION,
    error: code || (status >= 500 ? "INTERNAL_INVARIANT_FAILED" : "REQUEST_INVALID"),
    reason_codes: [...reasonCodes],
    request_id: requestId,
    enforcement_effect: "DENY",
    audit_ref: auditId,
  };
  if (status >= 500) {
    delete body.decision;
    if (["DENY", "ALLOW", "REQUIRE_APPROVAL"].includes(body.error)) body.error = "INTERNAL_INVARIANT_FAILED";
  }
  return body;
}

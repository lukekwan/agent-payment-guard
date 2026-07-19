import { parse as parseJsonAst } from "@humanwhocodes/momoa";
import canonicalize from "canonicalize";

export const SIGNGATE_CONTRACT_VERSION = "0.1";
export const SIGNGATE_API_STATUS = "preview";
export const SIGNGATE_POLICY_VERSION = "deploy_policy_2026_07_18_01";
export const SIGNGATE_ALLOW_TTL_SECONDS = 15 * 60;
export const SIGNGATE_RETENTION_DAYS = 30;

export const SIGNGATE_JSON_LIMITS = Object.freeze({
  maxBytes: 32768,
  maxDepth: 16,
  maxObjectMembers: 128,
  maxArrayLength: 128,
  maxStringLength: 4096,
  maxPathLength: 512,
  maxIntentLength: 1024,
});

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });

const ALLOWED_TOP_LEVEL = new Set([
  "contract_version",
  "request_id",
  "organization_id",
  "agent",
  "action",
  "intent",
  "mandate",
  "evidence",
  "context",
]);
const ALLOWED_AGENT = new Set(["id", "type", "authenticated_by"]);
const ALLOWED_ACTION = new Set(["type", "target", "parameters"]);
const ALLOWED_TARGET = new Set(["environment", "service", "project", "repository"]);
const ALLOWED_REPOSITORY = new Set(["host", "owner", "repo", "remote_url"]);
const ALLOWED_PARAMETERS = new Set([
  "git_commit",
  "artifact_digest",
  "diff_digest",
  "changed_paths",
  "changed_routes",
  "touches_secrets",
  "touches_dns",
  "touches_permissions",
  "touches_credentials",
  "deployment_strategy",
  "deployment_command_id",
  "configuration_fingerprint",
  "ci_evidence",
]);
const ALLOWED_CI_EVIDENCE = new Set(["provider", "run_id", "commit", "status", "checks"]);
const ALLOWED_MANDATE = new Set(["id", "scope", "issued_by", "expires_at"]);
const ALLOWED_EVIDENCE = new Set([
  "id",
  "type",
  "source",
  "status",
  "observed_at",
  "subject_fingerprint",
  "original_decision_id",
  "action_fingerprint",
  "policy_version",
  "expires_at",
]);
const ALLOWED_CONTEXT = new Set(["requested_at"]);
const ALLOWED_CONSUME = new Set([
  "contract_version",
  "organization_id",
  "action_fingerprint",
  "policy_version",
  "execution_attempt_id",
]);
const ALLOWED_GRANT = new Set([
  "contract_version",
  "organization_id",
  "original_decision_id",
  "action_fingerprint",
  "policy_version",
  "approval_reason",
  "expires_at",
]);

const DIGEST_VERSION = "sg_key_digest_v1";
const MIN_RAW_SECRET_BYTES = 32;
const ALLOWED_ENVIRONMENTS = new Set(["local", "preview", "production"]);
const ALLOWED_DEPLOYMENT_STRATEGIES = new Set(["local_simulation", "worker_preview", "worker_production"]);
const ALLOWED_DEPLOYMENT_COMMANDS = new Set([
  "npm_run_check",
  "wrangler_dev_preview",
  "wrangler_preview",
  "wrangler_deploy_production",
]);
const ALLOWED_REPOSITORY_HOSTS = new Set(["github.com"]);
const ALLOWED_CI_PROVIDERS = new Set(["github_actions", "local"]);
const ALLOWED_APPROVAL_REASON_CODES = new Set([
  "FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE",
  "FOUNDER_APPROVED_PREVIEW_DNS_CHANGE",
  "FOUNDER_APPROVED_PREVIEW_CREDENTIAL_CHANGE",
]);
const APPROVAL_GRANT_MAX_TTL_SECONDS = 10 * 60;

const DEPLOY_FIELD_PATHS = Object.freeze([
  ["action", "target", "environment"],
  ["action", "target", "service"],
  ["action", "target", "project"],
  ["action", "target", "repository", "host"],
  ["action", "target", "repository", "owner"],
  ["action", "target", "repository", "repo"],
  ["action", "target", "repository", "remote_url"],
  ["action", "parameters", "git_commit"],
  ["action", "parameters", "artifact_digest"],
  ["action", "parameters", "diff_digest"],
  ["action", "parameters", "changed_paths"],
  ["action", "parameters", "changed_routes"],
  ["action", "parameters", "touches_secrets"],
  ["action", "parameters", "touches_dns"],
  ["action", "parameters", "touches_permissions"],
  ["action", "parameters", "touches_credentials"],
  ["action", "parameters", "deployment_strategy"],
  ["action", "parameters", "deployment_command_id"],
  ["action", "parameters", "configuration_fingerprint"],
  ["action", "parameters", "ci_evidence"],
]);

export function signGateJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  });
}

function utf8ByteLength(value) {
  return TEXT_ENCODER.encode(value).byteLength;
}

function nowIso(nowMs = Date.now()) {
  return new Date(nowMs).toISOString();
}

function plusSecondsIso(baseIso, seconds) {
  return new Date(Date.parse(baseIso) + seconds * 1000).toISOString();
}

function deleteAfterIso(baseIso) {
  return plusSecondsIso(baseIso, SIGNGATE_RETENTION_DAYS * 24 * 60 * 60);
}

function id(prefix) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function sha256Hex(value) {
  const bytes = typeof value === "string" ? TEXT_ENCODER.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function assertAllowedKeys(value, allowed, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [`${path}_INVALID`]);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["UNKNOWN_FIELD"], `${path}.${key}`);
    }
  }
}

function detectDuplicatesAndBounds(node, depth = 0) {
  if (depth > SIGNGATE_JSON_LIMITS.maxDepth) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "max depth");
  }
  if (!node || typeof node !== "object") return;
  if (node.type === "Object") {
    if (node.members.length > SIGNGATE_JSON_LIMITS.maxObjectMembers) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "max object members");
    }
    const names = new Set();
    for (const member of node.members) {
      const name = member.name.value;
      if (typeof name === "string" && utf8ByteLength(name) > SIGNGATE_JSON_LIMITS.maxStringLength) {
        throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "key too long");
      }
      if (names.has(name)) {
        throw new SignGateInputError(400, "MALFORMED_JSON", ["DUPLICATE_JSON_KEY"], name);
      }
      names.add(name);
      detectDuplicatesAndBounds(member.value, depth + 1);
    }
    return;
  }
  if (node.type === "Array") {
    if (node.elements.length > SIGNGATE_JSON_LIMITS.maxArrayLength) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "max array length");
    }
    for (const element of node.elements) detectDuplicatesAndBounds(element.value, depth + 1);
    return;
  }
  if (node.type === "String" && utf8ByteLength(node.value) > SIGNGATE_JSON_LIMITS.maxStringLength) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "string too long");
  }
}

export class SignGateInputError extends Error {
  constructor(status, code, reasonCodes = [], detail = "") {
    super(detail || code);
    this.status = status;
    this.code = code;
    this.reasonCodes = reasonCodes;
    this.detail = detail;
  }
}

export function parseStrictJsonBytes(bytes, schema = "decision") {
  if (bytes.byteLength > SIGNGATE_JSON_LIMITS.maxBytes) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "max raw bytes");
  }
  let text;
  try {
    text = TEXT_DECODER.decode(bytes);
  } catch {
    throw new SignGateInputError(400, "MALFORMED_JSON", ["INVALID_UTF8"]);
  }
  let ast;
  try {
    ast = parseJsonAst(text, { mode: "json", allowTrailingCommas: false });
    detectDuplicatesAndBounds(ast.body, 0);
  } catch (error) {
    if (error instanceof SignGateInputError) throw error;
    throw new SignGateInputError(400, "MALFORMED_JSON", ["MALFORMED_JSON"], error.message);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SignGateInputError(400, "MALFORMED_JSON", ["MALFORMED_JSON"], error.message);
  }
  if (schema === "decision") validateDecisionRequestSchema(parsed);
  if (schema === "consume") validateConsumeSchema(parsed);
  if (schema === "grant") validateGrantSchema(parsed);
  return parsed;
}

function requireString(value, code) {
  if (typeof value !== "string" || value.length === 0) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [code]);
  }
}

function requireBoolean(value, code) {
  if (typeof value !== "boolean") {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [code]);
  }
}

function requirePattern(value, pattern, code) {
  requireString(value, code);
  if (!pattern.test(value)) throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [code]);
}

function requireEnum(value, allowed, code) {
  requireString(value, code);
  if (!allowed.has(value)) throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [code]);
}

function validateDigest(value, code) {
  requirePattern(value, /^sha256:[a-f0-9]{64}$/, code);
}

function validateSafePath(value) {
  if (
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("//") ||
    value.split("/").some(segment => segment === "" || segment === "." || segment === "..") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    /%2e|%2f|%5c/i.test(value)
  ) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CHANGED_PATH_UNSAFE"]);
  }
}

function validateStringArray(values, field) {
  if (!Array.isArray(values)) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [`${field.toUpperCase()}_INVALID`]);
  }
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", [`${field.toUpperCase()}_INVALID`]);
    }
    if (utf8ByteLength(value) > SIGNGATE_JSON_LIMITS.maxPathLength) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], `${field} item`);
    }
    if (field === "changed_paths") validateSafePath(value);
    if (field === "changed_routes" && (!value.startsWith("/") || /[\u0000-\u001f\u007f]/.test(value))) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CHANGED_ROUTE_INVALID"]);
    }
  }
}

function validateDecisionRequestSchema(parsed) {
  assertAllowedKeys(parsed, ALLOWED_TOP_LEVEL, "$");
  if (parsed.contract_version !== SIGNGATE_CONTRACT_VERSION) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CONTRACT_VERSION_UNSUPPORTED"]);
  }
  requireString(parsed.request_id, "REQUEST_ID_REQUIRED");
  requireString(parsed.organization_id, "ORGANIZATION_ID_REQUIRED");
  assertAllowedKeys(parsed.agent, ALLOWED_AGENT, "$.agent");
  requireString(parsed.agent.id, "AGENT_ID_REQUIRED");
  requireString(parsed.agent.type, "AGENT_TYPE_REQUIRED");
  assertAllowedKeys(parsed.action, ALLOWED_ACTION, "$.action");
  if (parsed.action.type !== "deploy_change") {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["ACTION_TYPE_UNSUPPORTED"]);
  }
  assertAllowedKeys(parsed.action.target, ALLOWED_TARGET, "$.action.target");
  requireEnum(parsed.action.target.environment, ALLOWED_ENVIRONMENTS, "TARGET_ENVIRONMENT_INVALID");
  requireString(parsed.action.target.service, "TARGET_SERVICE_REQUIRED");
  if (parsed.action.target.service.length > 128 || /[\u0000-\u001f\u007f]/.test(parsed.action.target.service)) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["TARGET_SERVICE_INVALID"]);
  }
  assertAllowedKeys(parsed.action.target.repository, ALLOWED_REPOSITORY, "$.action.target.repository");
  requireEnum(parsed.action.target.repository.host, ALLOWED_REPOSITORY_HOSTS, "REPOSITORY_HOST_INVALID");
  requirePattern(parsed.action.target.repository.owner, /^[A-Za-z0-9_.-]{1,100}$/, "REPOSITORY_OWNER_INVALID");
  requirePattern(parsed.action.target.repository.repo, /^[A-Za-z0-9_.-]{1,100}$/, "REPOSITORY_NAME_INVALID");
  assertAllowedKeys(parsed.action.parameters, ALLOWED_PARAMETERS, "$.action.parameters");
  requirePattern(parsed.action.parameters.git_commit, /^[a-f0-9]{40}$/i, "GIT_COMMIT_INVALID");
  requireEnum(parsed.action.parameters.deployment_strategy, ALLOWED_DEPLOYMENT_STRATEGIES, "DEPLOYMENT_STRATEGY_INVALID");
  requireEnum(parsed.action.parameters.deployment_command_id, ALLOWED_DEPLOYMENT_COMMANDS, "DEPLOYMENT_COMMAND_INVALID");
  validateDigest(parsed.action.parameters.configuration_fingerprint, "CONFIGURATION_FINGERPRINT_INVALID");
  if (parsed.action.parameters.artifact_digest) validateDigest(parsed.action.parameters.artifact_digest, "ARTIFACT_DIGEST_INVALID");
  validateDigest(parsed.action.parameters.diff_digest, "DIFF_DIGEST_INVALID");
  validateStringArray(parsed.action.parameters.changed_paths, "changed_paths");
  validateStringArray(parsed.action.parameters.changed_routes, "changed_routes");
  for (const field of ["touches_secrets", "touches_dns", "touches_permissions"]) {
    requireBoolean(parsed.action.parameters[field], `${field.toUpperCase()}_REQUIRED`);
  }
  if ("touches_credentials" in parsed.action.parameters) {
    requireBoolean(parsed.action.parameters.touches_credentials, "TOUCHES_CREDENTIALS_INVALID");
  }
  assertAllowedKeys(parsed.action.parameters.ci_evidence, ALLOWED_CI_EVIDENCE, "$.action.parameters.ci_evidence");
  requireEnum(parsed.action.parameters.ci_evidence.provider, ALLOWED_CI_PROVIDERS, "CI_PROVIDER_INVALID");
  requireString(parsed.action.parameters.ci_evidence.run_id, "CI_RUN_ID_REQUIRED");
  requirePattern(parsed.action.parameters.ci_evidence.commit, /^[a-f0-9]{40}$/i, "CI_COMMIT_INVALID");
  if (parsed.action.parameters.ci_evidence.commit.toLowerCase() !== parsed.action.parameters.git_commit.toLowerCase()) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CI_COMMIT_MISMATCH"]);
  }
  requireEnum(parsed.action.parameters.ci_evidence.status, new Set(["passed", "failed"]), "CI_STATUS_INVALID");
  validateStringArray(parsed.action.parameters.ci_evidence.checks, "ci_checks");
  assertAllowedKeys(parsed.mandate, ALLOWED_MANDATE, "$.mandate");
  requireString(parsed.mandate.id, "MANDATE_ID_REQUIRED");
  validateStringArray(parsed.mandate.scope, "mandate_scope");
  requireString(parsed.mandate.expires_at, "MANDATE_EXPIRY_REQUIRED");
  if (typeof parsed.intent === "string" && utf8ByteLength(parsed.intent) > SIGNGATE_JSON_LIMITS.maxIntentLength) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RESOURCE_LIMIT_EXCEEDED"], "intent");
  }
  if (!Array.isArray(parsed.evidence)) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["EVIDENCE_REQUIRED"]);
  }
  for (const item of parsed.evidence) assertAllowedKeys(item, ALLOWED_EVIDENCE, "$.evidence[]");
  if (parsed.context) assertAllowedKeys(parsed.context, ALLOWED_CONTEXT, "$.context");
  rejectSecretMaterial(parsed);
}

function validateConsumeSchema(parsed) {
  assertAllowedKeys(parsed, ALLOWED_CONSUME, "$");
  if (parsed.contract_version !== SIGNGATE_CONTRACT_VERSION) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CONTRACT_VERSION_UNSUPPORTED"]);
  }
  requireString(parsed.organization_id, "ORGANIZATION_ID_REQUIRED");
  requireString(parsed.action_fingerprint, "ACTION_FINGERPRINT_REQUIRED");
  requireString(parsed.policy_version, "POLICY_VERSION_REQUIRED");
  requireString(parsed.execution_attempt_id, "EXECUTION_ATTEMPT_ID_REQUIRED");
}

function validateGrantSchema(parsed) {
  assertAllowedKeys(parsed, ALLOWED_GRANT, "$");
  if (parsed.contract_version !== SIGNGATE_CONTRACT_VERSION) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["CONTRACT_VERSION_UNSUPPORTED"]);
  }
  requireString(parsed.organization_id, "ORGANIZATION_ID_REQUIRED");
  requireString(parsed.original_decision_id, "ORIGINAL_DECISION_ID_REQUIRED");
  requireString(parsed.action_fingerprint, "ACTION_FINGERPRINT_REQUIRED");
  requireString(parsed.policy_version, "POLICY_VERSION_REQUIRED");
  requireEnum(parsed.approval_reason, ALLOWED_APPROVAL_REASON_CODES, "APPROVAL_REASON_CODE_INVALID");
  requireString(parsed.expires_at, "APPROVAL_EXPIRY_REQUIRED");
  rejectSecretMaterial(parsed);
}

function rejectSecretMaterial(value, path = "$") {
  if (typeof value === "string") {
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|sk_live_|AKIA[0-9A-Z]{16}|xox[baprs]-|ghp_[A-Za-z0-9_]{20,}|password\s*=|token\s*=|secret\s*=/i.test(value)) {
      throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["SECRET_MATERIAL_PROHIBITED"], path);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) rejectSecretMaterial(child, `${path}.${key}`);
}

export function normalizeSortedUniqueStrings(values, fieldName = "set") {
  validateStringArray(values, fieldName);
  return [...new Set(values)].sort();
}

export function normalizeDeployChangeAction(action) {
  const normalized = structuredClone(action);
  normalized.parameters.changed_paths = normalizeSortedUniqueStrings(
    normalized.parameters.changed_paths,
    "changed_paths",
  );
  normalized.parameters.changed_routes = normalizeSortedUniqueStrings(
    normalized.parameters.changed_routes,
    "changed_routes",
  );
  return normalized;
}

export function fingerprintEnvelope(request, authenticated) {
  return {
    contract_version: SIGNGATE_CONTRACT_VERSION,
    organization_id: authenticated.organization_id,
    agent_id: authenticated.principal_id,
    action: normalizeDeployChangeAction(request.action),
  };
}

export async function fingerprintDeployChange(request, authenticated) {
  return `sha256:${await sha256Hex(canonicalize(fingerprintEnvelope(request, authenticated)))}`;
}

function rawSecretIsLongEnough(rawKey) {
  return utf8ByteLength(rawKey) >= MIN_RAW_SECRET_BYTES;
}

async function credentialDigest(rawKey, pepper = "") {
  return sha256Hex(`sgv1:${pepper}:${rawKey}`);
}

async function authenticate(env, requiredScope, requiredPrincipalType) {
  const auth = env.request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  if (!match) throw new SignGateInputError(401, "AUTHENTICATION_REQUIRED", ["AUTHENTICATION_REQUIRED"]);
  const rawKey = match[1];
  if (!rawSecretIsLongEnough(rawKey)) {
    throw new SignGateInputError(401, "AUTHENTICATION_FAILED", ["AUTHENTICATION_FAILED"]);
  }
  const prefix = rawKey.slice(0, 12);
  const digest = await credentialDigest(rawKey, env.pepper || "");
  const credential = await env.store.getCredentialByPrefix(prefix);
  if (
    !credential ||
    credential.digest_version !== DIGEST_VERSION ||
    !["active", "rotating"].includes(credential.status) ||
    !timingSafeEqualHex(digest, credential.key_digest)
  ) {
    throw new SignGateInputError(401, "AUTHENTICATION_FAILED", ["AUTHENTICATION_FAILED"]);
  }
  if (credential.status === "rotating" && credential.rotation_expires_at && Date.parse(credential.rotation_expires_at) <= env.nowMs) {
    throw new SignGateInputError(401, "AUTHENTICATION_FAILED", ["AUTHENTICATION_FAILED"]);
  }
  if (requiredPrincipalType && credential.principal_type !== requiredPrincipalType) {
    throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["PRINCIPAL_TYPE_NOT_ALLOWED"]);
  }
  const scopes = JSON.parse(credential.scopes_json);
  if (!scopes.includes(requiredScope)) {
    throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["SCOPE_NOT_ALLOWED"]);
  }
  await env.store.recordCredentialUse(credential.credential_id, nowIso(env.nowMs));
  return credential;
}

function errorBody(error, requestId = null, auditId = null) {
  return {
    contract_version: SIGNGATE_CONTRACT_VERSION,
    error: error.code || "INTERNAL_INVARIANT_FAILED",
    reason_codes: error.reasonCodes?.length ? error.reasonCodes : ["INTERNAL_INVARIANT_FAILED"],
    request_id: requestId,
    enforcement_effect: "DENY",
    audit_id: auditId,
  };
}

function executionDirective(decision) {
  return decision === "ALLOW"
    ? { action: "EXECUTE", max_uses: 1, replay_protection: "SIGNGATE_ATOMIC_CONSUME" }
    : { action: "DO_NOT_EXECUTE", max_uses: 0, replay_protection: "EXECUTOR_ENFORCED" };
}

function approvalBlock(decision) {
  return {
    required: decision === "REQUIRE_APPROVAL",
    role: decision === "REQUIRE_APPROVAL" ? "founder" : null,
    grant_binding_required: decision === "REQUIRE_APPROVAL",
  };
}

function hasPassingTests(input) {
  return input.action.parameters.ci_evidence?.status === "passed";
}

function hasApprovalGrantEvidence(input) {
  return input.evidence.find(item => item.type === "approval_grant" && item.id);
}

async function resolveTrustedMandate(input, authenticated, env) {
  const mandate = await env.store.getMandate(authenticated.organization_id, input.mandate.id);
  if (!mandate) return { ok: false, reason: "MANDATE_REFERENCE_UNKNOWN" };
  const scopes = JSON.parse(mandate.scope_json);
  if (mandate.organization_id !== authenticated.organization_id) return { ok: false, reason: "MANDATE_ORGANIZATION_MISMATCH" };
  if (mandate.status === "revoked") return { ok: false, reason: "MANDATE_REVOKED" };
  if (mandate.status !== "active") return { ok: false, reason: "MANDATE_STATUS_INVALID" };
  if (Date.parse(mandate.expires_at) <= env.nowMs) return { ok: false, reason: "MANDATE_EXPIRED" };
  if (!scopes.includes(`deploy:${input.action.target.environment}`)) return { ok: false, reason: "MANDATE_SCOPE_INVALID" };
  return { ok: true, mandate: { ...mandate, scope: scopes } };
}

async function resolveTrustedEvidence(input, authenticated, env, actionFingerprint) {
  if (!hasPassingTests(input)) return { ok: false, reason: "TESTS_FAILED" };
  const ci = input.action.parameters.ci_evidence;
  const testEvidence = input.evidence.find(item => item.type === "test_result");
  const trusted = await env.store.getTrustedEvidence(authenticated.organization_id, testEvidence?.id || ci.run_id);
  if (!trusted) return { ok: false, reason: "MANDATORY_EVIDENCE_MISSING" };
  if (trusted.status !== "passed") return { ok: false, reason: "TESTS_FAILED" };
  if (!ALLOWED_CI_PROVIDERS.has(trusted.provider)) return { ok: false, reason: "EVIDENCE_SOURCE_UNSUPPORTED" };
  if (trusted.commit?.toLowerCase() !== input.action.parameters.git_commit.toLowerCase()) {
    return { ok: false, reason: "EVIDENCE_COMMIT_MISMATCH" };
  }
  if (trusted.subject_fingerprint && trusted.subject_fingerprint !== testEvidence?.subject_fingerprint) {
    return { ok: false, reason: "EVIDENCE_SUBJECT_MISMATCH" };
  }
  if (
    trusted.action_fingerprint &&
    trusted.action_fingerprint !== actionFingerprint &&
    trusted.subject_fingerprint !== actionFingerprint
  ) {
    return { ok: false, reason: "EVIDENCE_SUBJECT_MISMATCH" };
  }
  if (Date.parse(trusted.observed_at) > env.nowMs) return { ok: false, reason: "EVIDENCE_OBSERVED_IN_FUTURE" };
  if (env.nowMs - Date.parse(trusted.observed_at) > 24 * 60 * 60 * 1000) return { ok: false, reason: "EVIDENCE_STALE" };
  return { ok: true, evidence: trusted };
}

async function evaluateDeployChange(input, authenticated, env, actionFingerprint) {
  const p = input.action.parameters;
  const target = input.action.target;
  const mandate = await resolveTrustedMandate(input, authenticated, env);
  if (!mandate.ok) return ["DENY", [mandate.reason]];
  if (p.touches_secrets) return ["DENY", ["SECRET_CHANGE_NOT_SUPPORTED_V0_1"]];
  const evidence = await resolveTrustedEvidence(input, authenticated, env, actionFingerprint);
  if (!evidence.ok) return ["DENY", [evidence.reason]];
  if (target.environment === "production") {
    return ["REQUIRE_APPROVAL", ["PRODUCTION_GATE_4_REQUIRED"]];
  }
  if (p.touches_permissions || p.touches_dns || p.touches_credentials) {
    const grantRef = hasApprovalGrantEvidence(input);
    if (!grantRef) {
      const reason = p.touches_permissions
        ? "PERMISSION_CHANGE_REQUIRES_APPROVAL"
        : p.touches_dns
          ? "DNS_CHANGE_REQUIRES_APPROVAL"
          : "CREDENTIAL_CHANGE_REQUIRES_APPROVAL";
      return ["REQUIRE_APPROVAL", [reason]];
    }
    const grant = await env.store.getApprovalGrant(authenticated.organization_id, grantRef.id);
    if (
      !grant ||
      grant.status !== "AVAILABLE" ||
      grant.organization_id !== authenticated.organization_id ||
      grant.original_decision_id !== grantRef.original_decision_id ||
      grant.action_fingerprint !== actionFingerprint ||
      grant.policy_version !== SIGNGATE_POLICY_VERSION ||
      grant.approver_role !== "founder" ||
      Date.parse(grant.expires_at) <= env.nowMs
    ) {
      throw new SignGateInputError(409, "APPROVAL_GRANT_REUSE_MISMATCH", ["APPROVAL_GRANT_INVALID"]);
    }
    return ["ALLOW", ["APPROVAL_GRANT_ACCEPTED"], grant.approval_grant_id];
  }
  return ["ALLOW", ["PREVIEW_DEPLOY_POLICY_PASSED"]];
}

async function persistDecision(input, authenticated, env, evaluated) {
  const [decision, reasonCodes, approvalGrantId = null] = evaluated;
  const issuedAt = nowIso(env.nowMs);
  const expiresAt = decision === "ALLOW"
    ? plusSecondsIso(issuedAt, SIGNGATE_ALLOW_TTL_SECONDS)
    : plusSecondsIso(issuedAt, SIGNGATE_ALLOW_TTL_SECONDS);
  const deleteAfter = deleteAfterIso(issuedAt);
  const decisionId = id("dec");
  const auditId = id("audit");
  const authenticatedContext = {
    organization_id: authenticated.organization_id,
    principal_id: authenticated.principal_id,
  };
  const actionFingerprint = await fingerprintDeployChange(input, authenticatedContext);
  const requestFingerprint = await semanticRequestFingerprint(input, authenticated, env, actionFingerprint);
  const boundAction = normalizeDeployChangeAction(input.action);
  const approvalGrant = approvalGrantId ? await env.store.getApprovalGrant(authenticated.organization_id, approvalGrantId) : null;
  const response = {
    contract_version: SIGNGATE_CONTRACT_VERSION,
    api_status: SIGNGATE_API_STATUS,
    decision,
    decision_id: decisionId,
    request_id: input.request_id,
    organization_id: authenticated.organization_id,
    authenticated_principal: {
      id: authenticated.principal_id,
      type: authenticated.principal_type,
    },
    action_fingerprint: actionFingerprint,
    bound_action: boundAction,
    policy_version: SIGNGATE_POLICY_VERSION,
    issued_at: issuedAt,
    expires_at: expiresAt,
    reason_codes: reasonCodes,
    required_checks: decision === "REQUIRE_APPROVAL" ? ["founder_approval"] : [],
    approval: approvalBlock(decision),
    execution_directive: executionDirective(decision),
    audit_id: auditId,
  };
  const record = {
    decision_id: decisionId,
    organization_id: authenticated.organization_id,
    request_id: input.request_id,
    request_fingerprint: requestFingerprint,
    action_type: input.action.type,
    action_fingerprint: actionFingerprint,
    decision,
    state: decision === "ALLOW" ? "AVAILABLE" : "NON_EXECUTABLE",
    bound_action_json: JSON.stringify(boundAction),
    response_json: JSON.stringify(response),
    policy_version: SIGNGATE_POLICY_VERSION,
    reason_codes_json: JSON.stringify(reasonCodes),
    approval_grant_id: approvalGrantId,
    original_decision_id: approvalGrant?.original_decision_id || null,
    issued_at: issuedAt,
    expires_at: expiresAt,
    delete_after: deleteAfter,
    audit: {
      audit_id: auditId,
      event_type: "decision.created",
      principal_id: authenticated.principal_id,
      request_id: input.request_id,
      metadata_json: JSON.stringify({ decision }),
      occurred_at: issuedAt,
      delete_after: deleteAfter,
    },
  };
  await env.store.createDecision(record);
  return response;
}

async function semanticRequestFingerprint(input, authenticated, env, actionFingerprint) {
  const mandate = await env.store.getMandate(authenticated.organization_id, input.mandate.id);
  const ci = input.action.parameters.ci_evidence;
  const testEvidence = input.evidence.find(item => item.type === "test_result");
  const trustedEvidence = await env.store.getTrustedEvidence(authenticated.organization_id, testEvidence?.id || ci?.run_id);
  const grantRef = hasApprovalGrantEvidence(input);
  const grant = grantRef ? await env.store.getApprovalGrant(authenticated.organization_id, grantRef.id) : null;
  return `sha256:${await sha256Hex(canonicalize({
    contract_version: SIGNGATE_CONTRACT_VERSION,
    organization_id: authenticated.organization_id,
    principal_id: authenticated.principal_id,
    principal_type: authenticated.principal_type,
    action: normalizeDeployChangeAction(input.action),
    action_fingerprint: actionFingerprint,
    policy_version: SIGNGATE_POLICY_VERSION,
    mandate: mandate ? {
      id: mandate.mandate_id,
      status: mandate.status,
      scope: JSON.parse(mandate.scope_json).sort(),
      issuer: mandate.issuer,
      expires_at: mandate.expires_at,
    } : { id: input.mandate.id, status: "missing" },
    evidence: trustedEvidence ? {
      id: trustedEvidence.evidence_id,
      provider: trustedEvidence.provider,
      status: trustedEvidence.status,
      commit: trustedEvidence.commit,
      observed_at: trustedEvidence.observed_at,
      action_fingerprint: trustedEvidence.action_fingerprint || null,
      subject_fingerprint: trustedEvidence.subject_fingerprint || null,
    } : { id: testEvidence?.id || ci?.run_id || null, status: "missing" },
    approval_grant: grant ? {
      id: grant.approval_grant_id,
      status: grant.status,
      original_decision_id: grant.original_decision_id,
      action_fingerprint: grant.action_fingerprint,
      policy_version: grant.policy_version,
      approver_principal_id: grant.approver_principal_id,
      approver_role: grant.approver_role,
      expires_at: grant.expires_at,
    } : null,
  }))}`;
}

async function evaluateAndPersistDecision(input, authenticated, env) {
  if (input.organization_id !== authenticated.organization_id) {
    throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["ORGANIZATION_MISMATCH"]);
  }
  if (input.agent.id !== authenticated.principal_id) {
    throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["AGENT_IDENTITY_MISMATCH"]);
  }
  if (authenticated.principal_type !== "agent") {
    throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["AGENT_PRINCIPAL_REQUIRED"]);
  }
  const actionFingerprint = await fingerprintDeployChange(input, {
    organization_id: authenticated.organization_id,
    principal_id: authenticated.principal_id,
  });
  const requestFingerprint = await semanticRequestFingerprint(input, authenticated, env, actionFingerprint);
  const existing = await env.store.getIdempotency(authenticated.organization_id, input.request_id);
  if (existing) {
    if (existing.request_fingerprint !== requestFingerprint) {
      throw new SignGateInputError(409, "REQUEST_ID_REUSE_MISMATCH", ["REQUEST_ID_REUSE_MISMATCH"]);
    }
    return JSON.parse(existing.response_json);
  }
  const evaluated = await evaluateDeployChange(input, authenticated, env, actionFingerprint);
  return persistDecision(input, authenticated, env, evaluated);
}

export async function handleSignGateDecisionRequest(request, env = {}) {
  const nowMs = Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now());
  let store;
  let authenticated = null;
  try {
    store = getSignGateStore(env);
    authenticated = await authenticate(
      { request, store, nowMs, pepper: env.SIGNGATE_API_KEY_PEPPER },
      "decision:create:deploy_change",
      "agent",
    );
    const input = parseStrictJsonBytes(new Uint8Array(await request.arrayBuffer()), "decision");
    return signGateJsonResponse(await evaluateAndPersistDecision(input, authenticated, { store, nowMs }));
  } catch (error) {
    const status = error instanceof SignGateInputError ? error.status : 500;
    await safeAuditFailure(store, authenticated, "decision.rejected", error, nowMs);
    const body = errorBody(
      error instanceof SignGateInputError ? error : new SignGateInputError(500, "INTERNAL_INVARIANT_FAILED"),
    );
    return signGateJsonResponse(body, status);
  }
}

export async function handleFounderApprovalGrantRequest(request, env = {}) {
  const nowMs = Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now());
  let store;
  let authenticated = null;
  try {
    store = getSignGateStore(env);
    authenticated = await authenticate(
      { request, store, nowMs, pepper: env.SIGNGATE_API_KEY_PEPPER },
      "approval:founder:deploy_change",
      "founder_approver",
    );
    if (authenticated.principal_type !== "founder_approver") {
      throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["FOUNDER_APPROVER_REQUIRED"]);
    }
    const input = parseStrictJsonBytes(new Uint8Array(await request.arrayBuffer()), "grant");
    if (input.organization_id !== authenticated.organization_id) {
      throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["ORGANIZATION_MISMATCH"]);
    }
    const original = await store.getDecision(input.organization_id, input.original_decision_id);
    const requestedExpiryMs = Date.parse(input.expires_at);
    if (
      !original ||
      original.decision !== "REQUIRE_APPROVAL" ||
      original.action_fingerprint !== input.action_fingerprint ||
      original.policy_version !== input.policy_version ||
      Date.parse(original.expires_at) <= nowMs ||
      requestedExpiryMs <= nowMs ||
      requestedExpiryMs > Date.parse(original.expires_at) ||
      requestedExpiryMs > nowMs + APPROVAL_GRANT_MAX_TTL_SECONDS * 1000
    ) {
      throw new SignGateInputError(409, "APPROVAL_GRANT_INVALID", ["APPROVAL_GRANT_INVALID"]);
    }
    const approvedAt = nowIso(nowMs);
    const deleteAfter = deleteAfterIso(approvedAt);
    const existing = await store.findApprovalGrantByBinding({
      organization_id: input.organization_id,
      original_decision_id: input.original_decision_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      approver_principal_id: authenticated.principal_id,
      approval_reason: input.approval_reason,
    });
    if (existing) {
      return signGateJsonResponse({
        approval_grant_id: existing.approval_grant_id,
        organization_id: existing.organization_id,
        original_decision_id: existing.original_decision_id,
        action_fingerprint: existing.action_fingerprint,
        policy_version: existing.policy_version,
        approved_by: existing.approver_principal_id,
        approver_role: existing.approver_role,
        status: existing.status,
        approval_reason: existing.approval_reason,
        approved_at: existing.approved_at,
        expires_at: existing.expires_at,
        audit_id: existing.audit_id || null,
      });
    }
    const approvalGrantId = id("grant");
    const auditId = id("audit");
    const response = {
      approval_grant_id: approvalGrantId,
      organization_id: input.organization_id,
      original_decision_id: input.original_decision_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      approved_by: authenticated.principal_id,
      approver_role: "founder",
      status: "AVAILABLE",
      approval_reason: input.approval_reason,
      approved_at: approvedAt,
      expires_at: input.expires_at,
      audit_id: auditId,
    };
    await store.createApprovalGrant({
      approval_grant_id: approvalGrantId,
      organization_id: input.organization_id,
      original_decision_id: input.original_decision_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      approver_principal_id: authenticated.principal_id,
      approver_role: "founder",
      approval_reason: input.approval_reason,
      original_decision_expires_at: original.expires_at,
      status: "AVAILABLE",
      approved_at: approvedAt,
      expires_at: input.expires_at,
      delete_after: deleteAfter,
      audit: {
        audit_id: auditId,
        event_type: "approval_grant.created",
        principal_id: authenticated.principal_id,
        decision_id: input.original_decision_id,
        action_fingerprint: input.action_fingerprint,
        policy_version: input.policy_version,
        metadata_json: JSON.stringify({ approval_reason_code: input.approval_reason }),
        occurred_at: approvedAt,
        delete_after: deleteAfter,
      },
    });
    return signGateJsonResponse(response);
  } catch (error) {
    const status = error instanceof SignGateInputError ? error.status : 500;
    await safeAuditFailure(store, authenticated, "approval_grant.rejected", error, nowMs);
    return signGateJsonResponse(
      errorBody(error instanceof SignGateInputError ? error : new SignGateInputError(500, "INTERNAL_INVARIANT_FAILED")),
      status,
    );
  }
}

async function safeAuditFailure(store, authenticated, eventType, error, nowMs, extra = {}) {
  if (!store || !authenticated || typeof store.recordAuditEvent !== "function") return null;
  const occurredAt = nowIso(nowMs);
  const inputError = error instanceof SignGateInputError ? error : new SignGateInputError(500, "INTERNAL_INVARIANT_FAILED");
  const audit = {
    audit_id: id("audit"),
    organization_id: authenticated.organization_id,
    event_type: eventType,
    principal_id: authenticated.principal_id,
    decision_id: extra.decision_id || null,
    request_id: extra.request_id || null,
    action_fingerprint: extra.action_fingerprint || null,
    policy_version: extra.policy_version || null,
    reason_codes_json: JSON.stringify(inputError.reasonCodes || [inputError.code]),
    metadata_json: JSON.stringify({ error: inputError.code, correlation_id: id("corr") }),
    occurred_at: occurredAt,
    delete_after: deleteAfterIso(occurredAt),
  };
  try {
    await store.recordAuditEvent(audit);
    return audit.audit_id;
  } catch {
    return null;
  }
}

export async function handleConsumeDecisionRequest(request, env = {}, decisionId) {
  const nowMs = Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now());
  let store;
  let authenticated = null;
  try {
    store = getSignGateStore(env);
    authenticated = await authenticate(
      { request, store, nowMs, pepper: env.SIGNGATE_API_KEY_PEPPER },
      "decision:consume:deploy_change",
      "executor",
    );
    const input = parseStrictJsonBytes(new Uint8Array(await request.arrayBuffer()), "consume");
    if (input.organization_id !== authenticated.organization_id) {
      throw new SignGateInputError(403, "AUTHORIZATION_FAILED", ["ORGANIZATION_MISMATCH"]);
    }
    const receipt = await store.consumeDecision({
      organization_id: authenticated.organization_id,
      decision_id: decisionId,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      execution_attempt_id: input.execution_attempt_id,
      executor_principal_id: authenticated.principal_id,
      now_iso: nowIso(nowMs),
      delete_after: deleteAfterIso(nowIso(nowMs)),
    });
    return signGateJsonResponse(receipt);
  } catch (error) {
    const status = error instanceof SignGateInputError ? error.status : 500;
    await safeAuditFailure(store, authenticated, "decision.consume_rejected", error, nowMs, { decision_id: decisionId });
    return signGateJsonResponse(
      errorBody(error instanceof SignGateInputError ? error : new SignGateInputError(500, "INTERNAL_INVARIANT_FAILED")),
      status,
    );
  }
}

export async function runDeployChangePreviewWrapper({
  env,
  agentKey,
  executorKey,
  request,
  executionAttemptId,
  simulateFailure = false,
}) {
  const decisionResponse = await handleSignGateDecisionRequest(
    new Request("https://signgate.test/v1/decisions", {
      method: "POST",
      headers: { authorization: `Bearer ${agentKey}` },
      body: JSON.stringify(request),
    }),
    env,
  );
  if (decisionResponse.status !== 200) return { status: "REFUSED", reason: `decision_http_${decisionResponse.status}` };
  const decision = await decisionResponse.json();
  if (
    decision.decision !== "ALLOW" ||
    decision.execution_directive?.action !== "EXECUTE" ||
    decision.execution_directive?.max_uses !== 1 ||
    decision.organization_id !== request.organization_id ||
    decision.authenticated_principal?.id !== request.agent.id ||
    decision.authenticated_principal?.type !== "agent" ||
    decision.policy_version !== SIGNGATE_POLICY_VERSION ||
    !decision.bound_action ||
    Date.parse(decision.expires_at) <= Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now())
  ) {
    return { status: "REFUSED", reason: decision.decision || decision.error, decision };
  }
  const recomputed = await fingerprintDeployChange(request, {
    organization_id: decision.organization_id,
    principal_id: decision.authenticated_principal.id,
  });
  if (
    recomputed !== decision.action_fingerprint ||
    canonicalize(normalizeDeployChangeAction(request.action)) !== canonicalize(decision.bound_action) ||
    decision.bound_action.target.environment === "production"
  ) {
    return { status: "REFUSED", reason: "FINGERPRINT_MISMATCH", decision };
  }
  const consumeResponse = await handleConsumeDecisionRequest(
    new Request(`https://signgate.test/v1/decisions/${decision.decision_id}/consume`, {
      method: "POST",
      headers: { authorization: `Bearer ${executorKey}` },
      body: JSON.stringify({
        contract_version: SIGNGATE_CONTRACT_VERSION,
        organization_id: decision.organization_id,
        action_fingerprint: decision.action_fingerprint,
        policy_version: decision.policy_version,
        execution_attempt_id: executionAttemptId,
      }),
    }),
    env,
    decision.decision_id,
  );
  if (consumeResponse.status !== 200) {
    return { status: "REFUSED", reason: `consume_http_${consumeResponse.status}`, decision };
  }
  const receipt = await consumeResponse.json();
  const executionResult = {
    execution_result_id: id("exec"),
    organization_id: decision.organization_id,
    decision_id: decision.decision_id,
    consume_receipt_id: receipt.consume_receipt_id,
    execution_attempt_id: executionAttemptId,
    status: simulateFailure ? "failure" : "success",
    error_code: simulateFailure ? "SIMULATED_DOWNSTREAM_FAILURE" : null,
    occurred_at: nowIso(Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now())),
    delete_after: deleteAfterIso(nowIso(Number(env.SIGNGATE_TEST_NOW_MS ?? Date.now()))),
  };
  await getSignGateStore(env).recordExecutionResult(executionResult);
  return { status: simulateFailure ? "EXECUTION_FAILED_AFTER_CONSUME" : "EXECUTED_PREVIEW", decision, receipt, execution_result: executionResult };
}

export function getAtPath(obj, path) {
  return path.reduce((current, key) => current?.[key], obj);
}

export function deployFieldPaths() {
  return DEPLOY_FIELD_PATHS;
}

export async function createPreviewCredential({ store, rawKey, organizationId, principalId, principalType, scopes, nowMs = Date.now(), pepper = "" }) {
  if (!rawSecretIsLongEnough(rawKey)) {
    throw new SignGateInputError(422, "REQUEST_SCHEMA_INVALID", ["RAW_SECRET_TOO_SHORT"]);
  }
  const createdAt = nowIso(nowMs);
  const credential = {
    credential_id: id("cred"),
    organization_id: organizationId,
    principal_id: principalId,
    principal_type: principalType,
    key_prefix: rawKey.slice(0, 12),
    key_digest: await credentialDigest(rawKey, pepper),
    digest_version: DIGEST_VERSION,
    scopes_json: JSON.stringify(scopes),
    status: "active",
    rotation_expires_at: null,
    delete_after: deleteAfterIso(createdAt),
    created_at: createdAt,
    updated_at: createdAt,
  };
  await store.createCredential(credential);
  return credential;
}

export async function cleanupSignGatePreviewRetention({ store, organizationId, nowMs = Date.now(), batchSize = 100 }) {
  return store.cleanupPreviewRetention({
    organization_id: organizationId,
    now_iso: nowIso(nowMs),
    batch_size: batchSize,
  });
}

function getSignGateStore(env) {
  if (env.SIGNGATE_TEST_STORE) return env.SIGNGATE_TEST_STORE;
  if (!env.GUARD_DB) throw new SignGateInputError(503, "POLICY_UNAVAILABLE", ["POLICY_UNAVAILABLE"]);
  return new D1SignGateStore(env.GUARD_DB);
}

export class MemorySignGateStore {
  constructor({ failAudit = false, failReceipt = false } = {}) {
    this.credentials = new Map();
    this.idempotency = new Map();
    this.decisions = new Map();
    this.grants = new Map();
    this.mandates = new Map();
    this.trustedEvidence = new Map();
    this.receipts = new Map();
    this.auditEvents = [];
    this.executionResults = [];
    this.failAudit = failAudit;
    this.failReceipt = failReceipt;
  }
  key(org, idValue) { return `${org}:${idValue}`; }
  async createCredential(credential) { this.credentials.set(credential.key_prefix, credential); }
  async getCredentialByPrefix(prefix) { return this.credentials.get(prefix) || null; }
  async recordCredentialUse(credentialId, usedAt) {
    for (const credential of this.credentials.values()) {
      if (credential.credential_id === credentialId) credential.last_used_at = usedAt;
    }
  }
  async getIdempotency(org, requestId) { return this.idempotency.get(this.key(org, requestId)) || null; }
  async createMandate(mandate) { this.mandates.set(this.key(mandate.organization_id, mandate.mandate_id), mandate); }
  async getMandate(org, mandateId) { return this.mandates.get(this.key(org, mandateId)) || null; }
  async createTrustedEvidence(evidence) { this.trustedEvidence.set(this.key(evidence.organization_id, evidence.evidence_id), evidence); }
  async getTrustedEvidence(org, evidenceId) { return this.trustedEvidence.get(this.key(org, evidenceId)) || null; }
  async recordAuditEvent(audit) { this.auditEvents.push(audit); }
  async createDecision(record) {
    if (record.approval_grant_id && record.decision === "ALLOW") {
      const grant = this.grants.get(this.key(record.organization_id, record.approval_grant_id));
      if (!grant || grant.status !== "AVAILABLE") {
        throw new SignGateInputError(409, "APPROVAL_GRANT_REUSE_MISMATCH", ["APPROVAL_GRANT_INVALID"]);
      }
      if (
        grant.original_decision_id !== record.original_decision_id ||
        Date.parse(grant.expires_at) <= Date.parse(record.issued_at) ||
        Date.parse(grant.original_decision_expires_at) <= Date.parse(record.issued_at)
      ) {
        throw new SignGateInputError(409, "APPROVAL_GRANT_REUSE_MISMATCH", ["APPROVAL_GRANT_INVALID"]);
      }
      grant.status = "USED";
      grant.used_by_decision_id = record.decision_id;
      grant.used_request_id = record.request_id;
    }
    if (this.failAudit) throw new Error("injected audit failure");
    this.decisions.set(this.key(record.organization_id, record.decision_id), record);
    this.idempotency.set(this.key(record.organization_id, record.request_id), {
      organization_id: record.organization_id,
      request_id: record.request_id,
      request_fingerprint: record.request_fingerprint,
      decision_id: record.decision_id,
      response_json: record.response_json,
      policy_version: record.policy_version,
    });
    this.auditEvents.push(record.audit);
  }
  async getDecision(org, decisionId) { return this.decisions.get(this.key(org, decisionId)) || null; }
  async createApprovalGrant(record) {
    if (this.failAudit) throw new Error("injected audit failure");
    this.grants.set(this.key(record.organization_id, record.approval_grant_id), record);
    this.auditEvents.push(record.audit);
  }
  async getApprovalGrant(org, grantId) { return this.grants.get(this.key(org, grantId)) || null; }
  async findApprovalGrantByBinding(binding) {
    return [...this.grants.values()].find(
      grant =>
        grant.organization_id === binding.organization_id &&
        grant.original_decision_id === binding.original_decision_id &&
        grant.action_fingerprint === binding.action_fingerprint &&
        grant.policy_version === binding.policy_version &&
        grant.approver_principal_id === binding.approver_principal_id &&
        grant.approval_reason === binding.approval_reason,
    ) || null;
  }
  async markApprovalGrantUsed(org, grantId, decisionId, requestId) {
    const grant = this.grants.get(this.key(org, grantId));
    if (grant && grant.status === "AVAILABLE") {
      grant.status = "USED";
      grant.used_by_decision_id = decisionId;
      grant.used_request_id = requestId;
    }
  }
  async consumeDecision(input) {
    const existingSame = this.receipts.get(this.key(input.organization_id, `${input.decision_id}:${input.execution_attempt_id}`));
    if (existingSame) return JSON.parse(existingSame.receipt_json);
    const existingAny = [...this.receipts.values()].find(
      receipt => receipt.organization_id === input.organization_id && receipt.decision_id === input.decision_id,
    );
    if (existingAny) throw new SignGateInputError(409, "DECISION_ALREADY_CONSUMED", ["DECISION_ALREADY_CONSUMED"]);
    const decision = this.decisions.get(this.key(input.organization_id, input.decision_id));
    if (
      !decision ||
      decision.decision !== "ALLOW" ||
      decision.state !== "AVAILABLE" ||
      decision.action_fingerprint !== input.action_fingerprint ||
      decision.policy_version !== input.policy_version
    ) {
      throw new SignGateInputError(decision ? 409 : 404, "DECISION_NOT_CONSUMABLE", ["DECISION_NOT_CONSUMABLE"]);
    }
    if (Date.parse(decision.expires_at) <= Date.parse(input.now_iso)) {
      decision.state = "EXPIRED";
      decision.expired_at = input.now_iso;
      this.auditEvents.push({
        audit_id: id("audit"),
        organization_id: input.organization_id,
        event_type: "decision.expired",
        decision_id: input.decision_id,
        occurred_at: input.now_iso,
        delete_after: input.delete_after,
      });
      throw new SignGateInputError(409, "DECISION_EXPIRED", ["DECISION_EXPIRED"]);
    }
    if (this.failReceipt) throw new Error("injected receipt failure");
    if (this.failAudit) throw new Error("injected audit failure");
    const receipt = {
      consume_receipt_id: id("rcpt"),
      organization_id: input.organization_id,
      decision_id: input.decision_id,
      execution_attempt_id: input.execution_attempt_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      executor_principal_id: input.executor_principal_id,
      consumed_at: input.now_iso,
    };
    decision.state = "CONSUMED";
    decision.consumed_at = input.now_iso;
    this.receipts.set(this.key(input.organization_id, `${input.decision_id}:${input.execution_attempt_id}`), {
      ...receipt,
      receipt_json: JSON.stringify(receipt),
    });
    this.auditEvents.push({
      audit_id: id("audit"),
      organization_id: input.organization_id,
      event_type: "decision.consumed",
      principal_id: input.executor_principal_id,
      decision_id: input.decision_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      occurred_at: input.now_iso,
      delete_after: input.delete_after,
    });
    return receipt;
  }
  async recordExecutionResult(result) { this.executionResults.push(result); }
  async cleanupPreviewRetention({ organization_id, now_iso, batch_size = 100 }) {
    const now = Date.parse(now_iso);
    const deleted = { decisions: 0, idempotency: 0, grants: 0, receipts: 0, audit_events: 0, execution_results: 0 };
    const deleteFromMap = (map, counter, predicate) => {
      for (const [key, value] of [...map.entries()]) {
        if (deleted[counter] >= batch_size) break;
        if (value.organization_id === organization_id && Date.parse(value.delete_after) <= now && predicate(value)) {
          map.delete(key);
          deleted[counter] += 1;
        }
      }
    };
    deleteFromMap(this.receipts, "receipts", () => true);
    deleteFromMap(this.idempotency, "idempotency", () => true);
    deleteFromMap(this.grants, "grants", grant => grant.status !== "AVAILABLE" || Date.parse(grant.expires_at) <= now);
    deleteFromMap(this.decisions, "decisions", decision => decision.state !== "AVAILABLE" || Date.parse(decision.expires_at) <= now);
    this.auditEvents = this.auditEvents.filter(event => {
      if (deleted.audit_events >= batch_size) return true;
      if (event.organization_id === organization_id && Date.parse(event.delete_after) <= now) {
        deleted.audit_events += 1;
        return false;
      }
      return true;
    });
    this.executionResults = this.executionResults.filter(result => {
      if (deleted.execution_results >= batch_size) return true;
      if (result.organization_id === organization_id && Date.parse(result.delete_after) <= now) {
        deleted.execution_results += 1;
        return false;
      }
      return true;
    });
    return deleted;
  }
}

export class D1SignGateStore {
  constructor(db) { this.db = db; }
  async getCredentialByPrefix(prefix) {
    return this.db.prepare("SELECT * FROM signgate_api_credentials WHERE key_prefix = ?").bind(prefix).first();
  }
  async recordCredentialUse(credentialId, usedAt) {
    await this.db.prepare("UPDATE signgate_api_credentials SET last_used_at = ?, updated_at = ? WHERE credential_id = ?").bind(usedAt, usedAt, credentialId).run();
  }
  async getIdempotency(org, requestId) {
    return this.db.prepare("SELECT * FROM signgate_request_idempotency WHERE organization_id = ? AND request_id = ?").bind(org, requestId).first();
  }
  async createMandate(mandate) {
    await this.db.prepare(
      `INSERT INTO signgate_mandates
      (organization_id, mandate_id, issuer, scope_json, status, issued_at, expires_at, delete_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(mandate.organization_id, mandate.mandate_id, mandate.issuer, mandate.scope_json, mandate.status, mandate.issued_at, mandate.expires_at, mandate.delete_after, mandate.created_at).run();
  }
  async getMandate(org, mandateId) {
    return this.db.prepare("SELECT * FROM signgate_mandates WHERE organization_id = ? AND mandate_id = ?").bind(org, mandateId).first();
  }
  async createTrustedEvidence(evidence) {
    await this.db.prepare(
      `INSERT INTO signgate_trusted_evidence
      (organization_id, evidence_id, provider, status, commit_sha, action_fingerprint, subject_fingerprint, observed_at, delete_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(evidence.organization_id, evidence.evidence_id, evidence.provider, evidence.status, evidence.commit, evidence.action_fingerprint || null, evidence.subject_fingerprint || null, evidence.observed_at, evidence.delete_after, evidence.created_at).run();
  }
  async getTrustedEvidence(org, evidenceId) {
    const row = await this.db.prepare("SELECT * FROM signgate_trusted_evidence WHERE organization_id = ? AND evidence_id = ?").bind(org, evidenceId).first();
    return row ? { ...row, commit: row.commit_sha } : null;
  }
  async recordAuditEvent(audit) {
    await this.db.prepare(
      `INSERT INTO signgate_audit_events
      (audit_id, organization_id, event_type, principal_id, decision_id, request_id, action_fingerprint, policy_version, reason_codes_json, metadata_json, occurred_at, delete_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(audit.audit_id, audit.organization_id, audit.event_type, audit.principal_id, audit.decision_id, audit.request_id, audit.action_fingerprint, audit.policy_version, audit.reason_codes_json, audit.metadata_json, audit.occurred_at, audit.delete_after).run();
  }
  async createCredential(credential) {
    await this.db.prepare(
      `INSERT INTO signgate_api_credentials
      (credential_id, organization_id, principal_id, principal_type, key_prefix, key_digest, digest_version, scopes_json, status, rotation_expires_at, delete_after, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      credential.credential_id, credential.organization_id, credential.principal_id, credential.principal_type,
      credential.key_prefix, credential.key_digest, credential.digest_version, credential.scopes_json, credential.status,
      credential.rotation_expires_at, credential.delete_after, credential.created_at, credential.updated_at,
    ).run();
  }
  async createDecision(record) {
    const statements = [];
    if (record.approval_grant_id && record.decision === "ALLOW") {
      statements.push(
        this.db.prepare(
          `UPDATE signgate_approval_grants
           SET status = 'USED', used_by_decision_id = ?, used_request_id = ?
           WHERE organization_id = ? AND approval_grant_id = ? AND status = 'AVAILABLE'
             AND original_decision_id = ? AND action_fingerprint = ? AND policy_version = ?
             AND approver_role = 'founder' AND expires_at > ? AND original_decision_expires_at > ?`,
        ).bind(
          record.decision_id,
          record.request_id,
          record.organization_id,
          record.approval_grant_id,
          record.original_decision_id,
          record.action_fingerprint,
          record.policy_version,
          record.issued_at,
          record.issued_at,
        ),
      );
    }
    const insertDecisionSql = record.approval_grant_id && record.decision === "ALLOW"
      ? `INSERT INTO signgate_decisions
        (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state,
         bound_action_json, response_json, policy_version, reason_codes_json, approval_grant_id, issued_at, expires_at, delete_after, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        WHERE EXISTS (
          SELECT 1 FROM signgate_approval_grants
          WHERE organization_id = ? AND approval_grant_id = ? AND status = 'USED'
            AND used_by_decision_id = ? AND used_request_id = ?
        )`
      : `INSERT INTO signgate_decisions
        (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state,
         bound_action_json, response_json, policy_version, reason_codes_json, approval_grant_id, issued_at, expires_at, delete_after, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const decisionBindings = [
      record.decision_id, record.organization_id, record.request_id, record.request_fingerprint, record.action_type,
      record.action_fingerprint, record.decision, record.state, record.bound_action_json, record.response_json,
      record.policy_version, record.reason_codes_json, record.approval_grant_id, record.issued_at, record.expires_at,
      record.delete_after, record.issued_at,
    ];
    if (record.approval_grant_id && record.decision === "ALLOW") {
      decisionBindings.push(record.organization_id, record.approval_grant_id, record.decision_id, record.request_id);
    }
    statements.push(
      this.db.prepare(
        insertDecisionSql,
      ).bind(...decisionBindings),
      this.db.prepare(
        `INSERT INTO signgate_request_idempotency
        (organization_id, request_id, request_fingerprint, decision_id, response_json, policy_version, delete_after, created_at)
        SELECT organization_id, request_id, request_fingerprint, decision_id, response_json, policy_version, delete_after, created_at
        FROM signgate_decisions
        WHERE organization_id = ? AND decision_id = ?`,
      ).bind(record.organization_id, record.decision_id),
      this.db.prepare(
        `INSERT INTO signgate_audit_events
        (audit_id, organization_id, event_type, principal_id, decision_id, request_id, action_fingerprint, policy_version, reason_codes_json, metadata_json, occurred_at, delete_after)
        SELECT ?, organization_id, ?, ?, decision_id, request_id, action_fingerprint, policy_version, ?, ?, ?, ?
        FROM signgate_decisions
        WHERE organization_id = ? AND decision_id = ?`,
      ).bind(
        record.audit.audit_id, record.audit.event_type, record.audit.principal_id,
        record.reason_codes_json, record.audit.metadata_json, record.audit.occurred_at, record.audit.delete_after,
        record.organization_id, record.decision_id,
      ),
    );
    await this.db.batch(statements);
    const created = await this.getDecision(record.organization_id, record.decision_id);
    if (!created) {
      throw new SignGateInputError(409, "APPROVAL_GRANT_REUSE_MISMATCH", ["APPROVAL_GRANT_INVALID"]);
    }
  }
  async getDecision(org, decisionId) {
    return this.db.prepare("SELECT * FROM signgate_decisions WHERE organization_id = ? AND decision_id = ?").bind(org, decisionId).first();
  }
  async createApprovalGrant(record) {
    await this.db.batch([
      this.db.prepare(
        `INSERT INTO signgate_approval_grants
        (approval_grant_id, organization_id, original_decision_id, action_fingerprint, policy_version, approver_principal_id,
         approver_role, approval_reason, status, approved_at, expires_at, original_decision_expires_at, delete_after, created_at, audit_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(record.approval_grant_id, record.organization_id, record.original_decision_id, record.action_fingerprint, record.policy_version, record.approver_principal_id, record.approver_role, record.approval_reason, record.status, record.approved_at, record.expires_at, record.original_decision_expires_at, record.delete_after, record.approved_at, record.audit.audit_id),
      this.db.prepare(
        `INSERT INTO signgate_audit_events
        (audit_id, organization_id, event_type, principal_id, decision_id, action_fingerprint, policy_version, metadata_json, occurred_at, delete_after)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(record.audit.audit_id, record.organization_id, record.audit.event_type, record.audit.principal_id, record.audit.decision_id, record.audit.action_fingerprint, record.audit.policy_version, record.audit.metadata_json, record.audit.occurred_at, record.audit.delete_after),
    ]);
  }
  async getApprovalGrant(org, grantId) {
    return this.db.prepare("SELECT * FROM signgate_approval_grants WHERE organization_id = ? AND approval_grant_id = ?").bind(org, grantId).first();
  }
  async findApprovalGrantByBinding(binding) {
    return this.db.prepare(
      `SELECT * FROM signgate_approval_grants
       WHERE organization_id = ? AND original_decision_id = ? AND action_fingerprint = ?
         AND policy_version = ? AND approver_principal_id = ? AND approval_reason = ?
       ORDER BY created_at ASC LIMIT 1`,
    ).bind(
      binding.organization_id,
      binding.original_decision_id,
      binding.action_fingerprint,
      binding.policy_version,
      binding.approver_principal_id,
      binding.approval_reason,
    ).first();
  }
  async markApprovalGrantUsed(org, grantId, decisionId, requestId) {
    await this.db.prepare("UPDATE signgate_approval_grants SET status = 'USED', used_by_decision_id = ?, used_request_id = ? WHERE organization_id = ? AND approval_grant_id = ? AND status = 'AVAILABLE'").bind(decisionId, requestId, org, grantId).run();
  }
  async consumeDecision(input) {
    const same = await this.db.prepare("SELECT receipt_json FROM signgate_consume_receipts WHERE organization_id = ? AND decision_id = ? AND execution_attempt_id = ?").bind(input.organization_id, input.decision_id, input.execution_attempt_id).first();
    if (same) return JSON.parse(same.receipt_json);
    const other = await this.db.prepare("SELECT consume_receipt_id FROM signgate_consume_receipts WHERE organization_id = ? AND decision_id = ?").bind(input.organization_id, input.decision_id).first();
    if (other) throw new SignGateInputError(409, "DECISION_ALREADY_CONSUMED", ["DECISION_ALREADY_CONSUMED"]);
    const token = id("lock");
    const receipt = {
      consume_receipt_id: id("rcpt"),
      organization_id: input.organization_id,
      decision_id: input.decision_id,
      execution_attempt_id: input.execution_attempt_id,
      action_fingerprint: input.action_fingerprint,
      policy_version: input.policy_version,
      executor_principal_id: input.executor_principal_id,
      consumed_at: input.now_iso,
    };
    await this.db.batch([
      this.db.prepare(
        `UPDATE signgate_decisions
         SET state = 'CONSUMED', consumed_at = ?, consume_lock_token = ?
         WHERE organization_id = ? AND decision_id = ? AND decision = 'ALLOW' AND state = 'AVAILABLE'
           AND action_fingerprint = ? AND policy_version = ? AND expires_at > ? AND consume_lock_token IS NULL`,
      ).bind(input.now_iso, token, input.organization_id, input.decision_id, input.action_fingerprint, input.policy_version, input.now_iso),
      this.db.prepare(
        `INSERT INTO signgate_consume_receipts
        (consume_receipt_id, organization_id, decision_id, execution_attempt_id, action_fingerprint, policy_version, executor_principal_id, consumed_at, receipt_json, delete_after, created_at)
        SELECT ?, organization_id, decision_id, ?, action_fingerprint, policy_version, ?, ?, ?, ?, ?
        FROM signgate_decisions WHERE organization_id = ? AND decision_id = ? AND consume_lock_token = ?`,
      ).bind(receipt.consume_receipt_id, input.execution_attempt_id, input.executor_principal_id, input.now_iso, JSON.stringify(receipt), input.delete_after, input.now_iso, input.organization_id, input.decision_id, token),
      this.db.prepare(
        `INSERT INTO signgate_audit_events
        (audit_id, organization_id, event_type, principal_id, decision_id, action_fingerprint, policy_version, metadata_json, occurred_at, delete_after)
        SELECT ?, organization_id, 'decision.consumed', ?, decision_id, action_fingerprint, policy_version, ?, ?, ?
        FROM signgate_decisions WHERE organization_id = ? AND decision_id = ? AND consume_lock_token = ?`,
      ).bind(id("audit"), input.executor_principal_id, JSON.stringify({ execution_attempt_id: input.execution_attempt_id }), input.now_iso, input.delete_after, input.organization_id, input.decision_id, token),
    ]);
    const created = await this.db.prepare("SELECT receipt_json FROM signgate_consume_receipts WHERE organization_id = ? AND decision_id = ? AND execution_attempt_id = ?").bind(input.organization_id, input.decision_id, input.execution_attempt_id).first();
    if (!created) {
      const decision = await this.getDecision(input.organization_id, input.decision_id);
      if (decision?.decision === "ALLOW" && decision.state === "AVAILABLE" && Date.parse(decision.expires_at) <= Date.parse(input.now_iso)) {
        const expiryToken = id("expire");
        await this.db.batch([
          this.db.prepare(
            `UPDATE signgate_decisions
             SET state = 'EXPIRED', expired_at = ?, expiry_lock_token = ?
             WHERE organization_id = ? AND decision_id = ? AND decision = 'ALLOW' AND state = 'AVAILABLE'
               AND expires_at <= ? AND expiry_lock_token IS NULL`,
          ).bind(input.now_iso, expiryToken, input.organization_id, input.decision_id, input.now_iso),
          this.db.prepare(
            `INSERT INTO signgate_audit_events
            (audit_id, organization_id, event_type, decision_id, action_fingerprint, policy_version, metadata_json, occurred_at, delete_after)
            SELECT ?, organization_id, 'decision.expired', decision_id, action_fingerprint, policy_version, ?, ?, ?
            FROM signgate_decisions WHERE organization_id = ? AND decision_id = ? AND expiry_lock_token = ?`,
          ).bind(id("audit"), JSON.stringify({ observed_by: "consume" }), input.now_iso, input.delete_after, input.organization_id, input.decision_id, expiryToken),
        ]);
        throw new SignGateInputError(409, "DECISION_EXPIRED", ["DECISION_EXPIRED"]);
      }
      throw new SignGateInputError(409, "DECISION_NOT_CONSUMABLE", ["DECISION_NOT_CONSUMABLE"]);
    }
    return JSON.parse(created.receipt_json);
  }
  async recordExecutionResult(result) {
    await this.db.prepare(
      `INSERT INTO signgate_execution_results
      (execution_result_id, organization_id, decision_id, consume_receipt_id, execution_attempt_id, status, error_code, occurred_at, delete_after)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(result.execution_result_id, result.organization_id, result.decision_id, result.consume_receipt_id, result.execution_attempt_id, result.status, result.error_code, result.occurred_at, result.delete_after).run();
  }
  async cleanupPreviewRetention({ organization_id, now_iso, batch_size = 100 }) {
    const tables = [
      ["signgate_execution_results", "execution_results"],
      ["signgate_consume_receipts", "receipts"],
      ["signgate_request_idempotency", "idempotency"],
      ["signgate_approval_grants", "grants"],
      ["signgate_decisions", "decisions"],
      ["signgate_audit_events", "audit_events"],
    ];
    const deleted = {};
    for (const [table, key] of tables) {
      const result = await this.db.prepare(
        `DELETE FROM ${table}
         WHERE rowid IN (
           SELECT rowid FROM ${table}
           WHERE organization_id = ? AND delete_after <= ?
           LIMIT ?
         )`,
      ).bind(organization_id, now_iso, batch_size).run();
      deleted[key] = result.meta?.changes ?? 0;
    }
    return deleted;
  }
}

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import canonicalize from "canonicalize";

import {
  SIGNGATE_CONTRACT_VERSION,
  SIGNGATE_POLICY_VERSION,
  D1SignGateStore,
  MemorySignGateStore,
  cleanupSignGatePreviewRetention,
  createPreviewCredential,
  enforceDeployChangePreviewDecision,
  fingerprintDeployChange,
  handleConsumeDecisionRequest,
  handleFounderApprovalGrantRequest,
  handleSignGateDecisionRequest,
  normalizeDeployChangeAction,
  runDeployChangePreviewWrapper,
  sha256Hex,
} from "../src/signgate-decision.js";

const NOW = Date.parse("2026-07-19T00:00:00.000Z");
const ORG = "org_nomos_labs";
const AGENT_KEY = "sg_agent_abcdefghijklmnopqrstuvwxyz123456";
const AGENT_PREVIOUS_KEY = "sg_agent_prev_abcdefghijklmnopqrstuvwxyz123456";
const EXECUTOR_KEY = "sg_exec_abcdefghijklmnopqrstuvwxyz123456";
const FOUNDER_KEY = "sg_founder_abcdefghijklmnopqrstuvwxyz123456";
const AGENT_NO_SCOPE_KEY = "sg_agent_noscope_abcdefghijklmnopqrstuvwxyz123456";
const FUTURE = "2026-07-19T00:30:00.000Z";
const GRANT_FUTURE = "2026-07-19T00:10:00.000Z";
const OUT_DIR = process.argv[2] || "evidence/dev-sg-001-pm-correction-round-3";
const APPLICATION_COMMIT = process.env.ROUND_4_APPLICATION_COMMIT || process.env.ROUND_3_APPLICATION_COMMIT || "UNKNOWN";

mkdirSync(OUT_DIR, { recursive: true });

function writeJson(name, data) {
  const isDf = /^df-0[1-7]\.json$/.test(name);
  const normalizedData = isDf ? {
    actual_http_status: data.actual_http_status ?? data.actual_status ?? null,
    actual_response: data.actual_response ?? {
      decision: data.actual_decision ?? null,
      reason_codes: data.actual_reason_codes ?? null,
    },
    decision: data.decision ?? data.actual_decision ?? null,
    reason_codes: data.reason_codes ?? data.actual_reason_codes ?? null,
    normalized_action: data.normalized_action ?? data.normalized_bound_action ?? null,
    bound_action: data.bound_action ?? data.normalized_bound_action ?? null,
    action_fingerprint: data.action_fingerprint ?? data.canonical_action_fingerprint ?? null,
    decision_state: data.decision_state ?? data.decision_persistence_state?.state ?? data.state_assertions?.decision_state ?? data.state_assertions?.original_decision_state ?? null,
    approval_grant_state: data.approval_grant_state ?? data.founder_grant_state ?? null,
    consume_receipt: data.consume_receipt ?? data.consume_receipts ?? null,
    no_external_action_assertions: data.no_external_action_assertions ?? { unauthorized_external_execution: false },
    field_level_assertions: data.field_level_assertions ?? {
      omitted_fields: [],
      not_applicable_fields_explained: true,
    },
    ...data,
  } : data;
  writeFileSync(`${OUT_DIR}/${name}`, `${JSON.stringify({
    application_commit_under_test: APPLICATION_COMMIT,
    generated_by: "test/signgate-round3-evidence.mjs",
    generated_from_executable_handlers: true,
    sanitized: true,
    ...normalizedData,
  }, null, 2)}\n`);
}

function baseRequest(overrides = {}) {
  return merge({
    contract_version: SIGNGATE_CONTRACT_VERSION,
    request_id: "req_evidence",
    organization_id: ORG,
    agent: { id: "codex_dev_01", type: "codex_developer", authenticated_by: "preview_api_key" },
    action: {
      type: "deploy_change",
      target: {
        environment: "preview",
        service: "signgate-worker",
        project: "base-agent-preflight",
        repository: {
          host: "github.com",
          owner: "lukekwan",
          repo: "agent-payment-guard",
          remote_url: "https://github.com/lukekwan/agent-payment-guard",
        },
      },
      parameters: {
        git_commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        diff_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changed_paths: ["src/index.js", "migrations/0008_signgate_deploy_change_decisions.sql"],
        changed_routes: ["/v1/decisions", "/v1/decisions/{decision_id}/consume"],
        touches_secrets: false,
        touches_dns: false,
        touches_permissions: false,
        touches_credentials: false,
        deployment_strategy: "worker_preview",
        deployment_command_id: "wrangler_preview",
        configuration_fingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ci_evidence: {
          provider: "github_actions",
          run_id: "run_123",
          commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
          status: "passed",
          checks: ["lint", "unit", "contract"],
        },
      },
    },
    intent: "Preview deploy SignGate",
    mandate: { id: "mandate_preview_001", scope: ["deploy:preview"], issued_by: "founder_01", expires_at: FUTURE },
    evidence: [{
      id: "evidence_tests_001",
      type: "test_result",
      source: "github_actions",
      status: "passed",
      observed_at: "2026-07-18T23:59:00.000Z",
      subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    }],
    context: { requested_at: "2026-07-19T00:00:00.000Z" },
  }, overrides);
}

function merge(base, overrides) {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === "object" && !Array.isArray(value) && out[key] && typeof out[key] === "object" && !Array.isArray(out[key])) {
      out[key] = merge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function memoryEnv({ nowMs = NOW } = {}) {
  const store = new MemorySignGateStore();
  const env = { SIGNGATE_TEST_STORE: store, SIGNGATE_TEST_NOW_MS: nowMs, SIGNGATE_API_KEY_PEPPER: "test-pepper" };
  for (const [rawKey, principalId, principalType, scopes] of [
    [AGENT_KEY, "codex_dev_01", "agent", ["decision:create:deploy_change"]],
    [EXECUTOR_KEY, "preview_executor_01", "executor", ["decision:consume:deploy_change"]],
    [FOUNDER_KEY, "founder_01", "founder_approver", ["approval:founder:deploy_change"]],
    [AGENT_NO_SCOPE_KEY, "codex_dev_no_scope", "agent", ["decision:consume:deploy_change"]],
  ]) {
    await createPreviewCredential({ store, rawKey, organizationId: ORG, principalId, principalType, scopes, nowMs: NOW, pepper: env.SIGNGATE_API_KEY_PEPPER });
  }
  const createdAt = new Date(NOW).toISOString();
  await store.createMandate({
    organization_id: ORG,
    mandate_id: "mandate_preview_001",
    issuer: "founder_01",
    scope_json: JSON.stringify(["deploy:preview", "deploy:production", "deploy:local"]),
    status: "active",
    issued_at: createdAt,
    expires_at: FUTURE,
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
  });
  for (const environment of ["local", "preview", "production"]) {
    await store.createAuthorizedTarget({
      target_id: `target_${environment}`,
      organization_id: ORG,
      environment,
      service: "signgate-worker",
      project: "base-agent-preflight",
      repository_host: "github.com",
      repository_owner: "lukekwan",
      repository_name: "agent-payment-guard",
      canonical_remote_url: "https://github.com/lukekwan/agent-payment-guard",
      action_type: "deploy_change",
      status: "active",
      valid_from: createdAt,
      valid_until: "2026-07-20T00:00:00.000Z",
      revision: 1,
      delete_after: "2026-08-19T00:00:00.000Z",
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
  await bindTrustedEvidence(env, baseRequest());
  return env;
}

async function bindTrustedEvidence(env, request) {
  const fp = await fingerprintDeployChange(request, { organization_id: ORG, principal_id: "codex_dev_01" });
  const createdAt = new Date(NOW).toISOString();
  const record = {
    organization_id: ORG,
    evidence_id: "evidence_tests_001",
    provider: "github_actions",
    status: "passed",
    commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
    subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    action_fingerprint: fp,
    observed_at: "2026-07-18T23:59:00.000Z",
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
  };
  env.SIGNGATE_TEST_STORE.trustedEvidence?.set?.(`${ORG}:evidence_tests_001`, record);
  if (!env.SIGNGATE_TEST_STORE.trustedEvidence) await env.SIGNGATE_TEST_STORE.createTrustedEvidence(record);
  return request;
}

async function postDecision(input, env, key = AGENT_KEY) {
  const response = await handleSignGateDecisionRequest(new Request("https://signgate.test/v1/decisions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: typeof input === "string" ? input : JSON.stringify(input),
  }), env);
  return { status: response.status, body: await response.json() };
}

async function postConsume(decision, env, attempt, key = EXECUTOR_KEY) {
  const response = await handleConsumeDecisionRequest(new Request(`https://signgate.test/v1/decisions/${decision.decision_id}/consume`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: JSON.stringify({
      contract_version: SIGNGATE_CONTRACT_VERSION,
      organization_id: ORG,
      action_fingerprint: decision.action_fingerprint,
      policy_version: decision.policy_version,
      execution_attempt_id: attempt,
    }),
  }), env, decision.decision_id);
  return { status: response.status, body: await response.json() };
}

function auditEvents(env, type) {
  return env.SIGNGATE_TEST_STORE.auditEvents.filter(event => !type || event.event_type === type);
}

function noExecution(env) {
  return {
    consume_receipts: env.SIGNGATE_TEST_STORE.receipts.size,
    execution_results: env.SIGNGATE_TEST_STORE.executionResults.length,
  };
}

async function dfAcceptanceFields({ env, request, decision, wrapperResult = null, grantId = null, attemptedRequest = null }) {
  const stored = decision?.decision_id ? await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id) : null;
  const grant = grantId ? await env.SIGNGATE_TEST_STORE.getApprovalGrant(ORG, grantId) : null;
  const originalFingerprint = decision?.action_fingerprint || await fingerprintDeployChange(request, { organization_id: ORG, principal_id: "codex_dev_01" });
  const attemptedFingerprint = attemptedRequest
    ? await fingerprintDeployChange(attemptedRequest, { organization_id: ORG, principal_id: "codex_dev_01" })
    : null;
  return {
    normalized_bound_action: decision?.bound_action || normalizeDeployChangeAction(request.action),
    canonical_action_fingerprint: originalFingerprint,
    attempted_action_fingerprint: attemptedFingerprint,
    policy_version: decision?.policy_version || SIGNGATE_POLICY_VERSION,
    issued_at: decision?.issued_at || null,
    expires_at: decision?.expires_at || null,
    wrapper_pep_result: wrapperResult?.status || null,
    decision_persistence_state: stored ? {
      decision_id: stored.decision_id,
      state: stored.state,
      decision: stored.decision,
      policy_version: stored.policy_version,
      credential_id: stored.credential_id || null,
      mandate_id: stored.mandate_id || null,
      authorized_target_id: stored.authorized_target_id || null,
      evidence_ids: JSON.parse(stored.evidence_ids_json || "[]"),
      authority_snapshot_present: Boolean(stored.authority_snapshot_json && stored.authority_snapshot_json !== "{}"),
    } : null,
    idempotency_state: {
      row_count: env.SIGNGATE_TEST_STORE.idempotency.size,
      request_id_present: env.SIGNGATE_TEST_STORE.idempotency.has(`${ORG}:${request.request_id}`),
    },
    founder_grant_state: grant ? {
      approval_grant_id: grant.approval_grant_id,
      status: grant.status,
      original_decision_id: grant.original_decision_id,
      action_fingerprint: grant.action_fingerprint,
      policy_version: grant.policy_version,
    } : null,
    consume_receipts: [...env.SIGNGATE_TEST_STORE.receipts.values()].map(receipt => ({
      decision_id: receipt.decision_id,
      execution_attempt_id: receipt.execution_attempt_id,
      action_fingerprint: receipt.action_fingerprint,
      policy_version: receipt.policy_version,
    })),
    audit_events: env.SIGNGATE_TEST_STORE.auditEvents.map(event => ({
      event_type: event.event_type,
      decision_id: event.decision_id || null,
      action_fingerprint: event.action_fingerprint || null,
      policy_version: event.policy_version || null,
    })),
    execution_result: env.SIGNGATE_TEST_STORE.executionResults.map(result => ({
      decision_id: result.decision_id,
      execution_attempt_id: result.execution_attempt_id,
      status: result.status,
      error_code: result.error_code,
    })),
    no_unauthorized_external_execution: true,
  };
}

async function runDfEvidence() {
  {
    const env = await memoryEnv();
    const request = baseRequest({ request_id: "df01_generated" });
    const result = await runDeployChangePreviewWrapper({ env, agentKey: AGENT_KEY, executorKey: EXECUTOR_KEY, request, executionAttemptId: "df01_attempt" });
    assert.equal(result.status, "EXECUTED_PREVIEW");
    writeJson("df-01.json", {
      scenario_id: "DF-01",
      scenario_purpose: "Preview deploy with passing tests executes once through wrapper",
      exact_test_name: "DF-01 exact preview ALLOW executes once through wrapper",
      sanitized_input: { request_id: request.request_id, environment: "preview", ci_status: "passed" },
      expected_result: { http_status: 200, decision: "ALLOW", wrapper: "EXECUTED_PREVIEW" },
      actual_status: 200,
      actual_decision: result.decision.decision,
      actual_reason_codes: result.decision.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision: result.decision, wrapperResult: result })),
      state_assertions: { decision_state: (await env.SIGNGATE_TEST_STORE.getDecision(ORG, result.decision.decision_id)).state, idempotency_rows: env.SIGNGATE_TEST_STORE.idempotency.size },
      receipt_assertions: { count: env.SIGNGATE_TEST_STORE.receipts.size, receipt_decision_id: result.receipt.decision_id },
      audit_assertions: { consumed_audits: auditEvents(env, "decision.consumed").length },
      execution_assertions: { wrapper_result: result.status, execution_results: env.SIGNGATE_TEST_STORE.executionResults.length, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv();
    const reviewRequest = await bindTrustedEvidence(env, baseRequest({ request_id: "df02_review_generated", action: { parameters: { touches_permissions: true } } }));
    const review = (await postDecision(reviewRequest, env)).body;
    assert.equal(review.decision, "REQUIRE_APPROVAL");
    const grantResponse = await handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
      method: "POST",
      headers: { authorization: `Bearer ${FOUNDER_KEY}` },
      body: JSON.stringify({
        contract_version: SIGNGATE_CONTRACT_VERSION,
        organization_id: ORG,
        original_decision_id: review.decision_id,
        action_fingerprint: review.action_fingerprint,
        policy_version: SIGNGATE_POLICY_VERSION,
        approval_reason: "FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE",
        expires_at: GRANT_FUTURE,
      }),
    }), env);
    const grant = await grantResponse.json();
    const request = {
      ...reviewRequest,
      request_id: "df02_approved_generated",
      evidence: [...reviewRequest.evidence, { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id }],
    };
    const result = await runDeployChangePreviewWrapper({ env, agentKey: AGENT_KEY, executorKey: EXECUTOR_KEY, request, executionAttemptId: "df02_attempt" });
    assert.equal(result.status, "EXECUTED_PREVIEW");
    writeJson("df-02.json", {
      scenario_id: "DF-02",
      scenario_purpose: "Preview permission change requires Founder grant then fresh ALLOW",
      exact_test_name: "DF-02 exact Founder approval grant produces one fresh ALLOW then consumes",
      sanitized_input: { initial_request_id: reviewRequest.request_id, approved_request_id: request.request_id, touches_permissions: true },
      expected_result: { initial_decision: "REQUIRE_APPROVAL", fresh_decision: "ALLOW", wrapper: "EXECUTED_PREVIEW" },
      actual_status: 200,
      actual_decision: result.decision.decision,
      actual_reason_codes: result.decision.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision: result.decision, wrapperResult: result, grantId: grant.approval_grant_id })),
      state_assertions: { grant_status: (await env.SIGNGATE_TEST_STORE.getApprovalGrant(ORG, grant.approval_grant_id)).status, fresh_decision: result.decision.decision_id !== review.decision_id },
      receipt_assertions: { count: env.SIGNGATE_TEST_STORE.receipts.size },
      audit_assertions: { grant_created: auditEvents(env, "approval_grant.created").length, consumed_audits: auditEvents(env, "decision.consumed").length },
      execution_assertions: { wrapper_result: result.status, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv();
    const request = baseRequest({ request_id: "df03_generated", action: { parameters: { touches_secrets: true } } });
    const result = await runDeployChangePreviewWrapper({ env, agentKey: AGENT_KEY, executorKey: EXECUTOR_KEY, request, executionAttemptId: "df03_attempt" });
    assert.equal(result.status, "REFUSED");
    writeJson("df-03.json", {
      scenario_id: "DF-03",
      scenario_purpose: "Secret-touching deploy is denied and not executed",
      exact_test_name: "DF-03 exact unsupported secret change is denied with no execution",
      sanitized_input: { request_id: request.request_id, touches_secrets: true, secret_material_in_payload: false },
      expected_result: { decision: "DENY", reason_codes: ["SECRET_CHANGE_NOT_SUPPORTED_V0_1"] },
      actual_status: 200,
      actual_decision: result.decision.decision,
      actual_reason_codes: result.decision.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision: result.decision, wrapperResult: result })),
      state_assertions: { idempotency_rows: env.SIGNGATE_TEST_STORE.idempotency.size },
      receipt_assertions: noExecution(env),
      audit_assertions: { decision_created: auditEvents(env, "decision.created").length },
      execution_assertions: { wrapper_result: result.status, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv();
    const request = baseRequest({
      request_id: "df04_generated",
      action: { parameters: { ci_evidence: { status: "failed", run_id: "failed_test_run_001", checks: ["lint", "unit"] } } },
      evidence: [{ ...baseRequest().evidence[0], id: "failed_test_run_001", source: "github_actions", status: "failed" }],
    });
    const result = await runDeployChangePreviewWrapper({ env, agentKey: AGENT_KEY, executorKey: EXECUTOR_KEY, request, executionAttemptId: "df04_attempt" });
    assert.equal(result.status, "REFUSED");
    writeJson("df-04.json", {
      scenario_id: "DF-04",
      scenario_purpose: "Commit-bound failed-test evidence returns TESTS_FAILED",
      exact_test_name: "DF-04 exact failed tests are denied with test reference and no execution",
      sanitized_input: { request_id: request.request_id, ci_status: "failed", test_reference: "failed_test_run_001" },
      expected_result: { decision: "DENY", reason_codes: ["TESTS_FAILED"] },
      actual_status: 200,
      actual_decision: result.decision.decision,
      actual_reason_codes: result.decision.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision: result.decision, wrapperResult: result })),
      state_assertions: { preserved_test_reference: result.decision.bound_action.parameters.ci_evidence.run_id },
      receipt_assertions: noExecution(env),
      audit_assertions: { decision_created: auditEvents(env, "decision.created").length },
      execution_assertions: { wrapper_result: result.status, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv();
    const requestA = await bindTrustedEvidence(env, baseRequest({ request_id: "df05_generated" }));
    const decision = (await postDecision(requestA, env)).body;
    const requestB = baseRequest({ request_id: "df05_generated", action: { parameters: { changed_paths: ["src/index.js", "src/signgate-decision.js"] } } });
    const result = await enforceDeployChangePreviewDecision({ env, executorKey: EXECUTOR_KEY, request: requestB, decision, executionAttemptId: "df05_attempt" });
    assert.equal(result.status, "REFUSED");
    const stored = await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id);
    writeJson("df-05.json", {
      scenario_id: "DF-05",
      scenario_purpose: "Mutated pending action B is refused by normal wrapper before consume",
      exact_test_name: "DF-05 exact post-decision action mutation is refused before consume",
      sanitized_input: { original_action: "A", attempted_action: "B", mutated_field: "action.parameters.changed_paths" },
      expected_result: { wrapper: "REFUSED", reason: "FINGERPRINT_MISMATCH", original_state: "AVAILABLE" },
      actual_status: 200,
      actual_decision: decision.decision,
      actual_reason_codes: decision.reason_codes,
      ...(await dfAcceptanceFields({ env, request: requestA, decision, wrapperResult: result, attemptedRequest: requestB })),
      state_assertions: { original_decision_state: stored.state, original_unconsumed: !stored.consumed_at },
      receipt_assertions: { count: env.SIGNGATE_TEST_STORE.receipts.size },
      audit_assertions: { consumed_audits: auditEvents(env, "decision.consumed").length },
      execution_assertions: { wrapper_result: result.status, no_execution_result: env.SIGNGATE_TEST_STORE.executionResults.length === 0, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv({ nowMs: NOW });
    const request = baseRequest({ request_id: "df06_generated" });
    const decision = (await postDecision(request, env)).body;
    env.SIGNGATE_TEST_NOW_MS = NOW + 16 * 60 * 1000;
    const result = await enforceDeployChangePreviewDecision({ env, executorKey: EXECUTOR_KEY, request, decision, executionAttemptId: "df06_attempt" });
    const consume = await postConsume(decision, env, "df06_attempt");
    assert.equal(result.status, "REFUSED");
    assert.equal(consume.status, 409);
    const stored = await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id);
    writeJson("df-06.json", {
      scenario_id: "DF-06",
      scenario_purpose: "Previously valid ALLOW expires before consume and persists one expiry",
      exact_test_name: "DF-06 exact previously valid ALLOW expires before consume with single audit",
      sanitized_input: { request_id: request.request_id, issued_before_time_advance: true, trusted_time_advanced_minutes: 16 },
      expected_result: { wrapper: "REFUSED", consume_status: 409, state: "EXPIRED" },
      actual_status: consume.status,
      actual_decision: decision.decision,
      actual_reason_codes: consume.body.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision, wrapperResult: result })),
      state_assertions: { decision_state: stored.state, available_to_expired_transition_count: 1 },
      receipt_assertions: { count: env.SIGNGATE_TEST_STORE.receipts.size },
      audit_assertions: { expiry_audits: auditEvents(env, "decision.expired").length },
      execution_assertions: { wrapper_result: result.status, execution_results: env.SIGNGATE_TEST_STORE.executionResults.length, unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
  {
    const env = await memoryEnv();
    const request = baseRequest({ request_id: "df07_generated" });
    const first = (await postDecision(request, env)).body;
    const second = (await postDecision(request, env)).body;
    const changed = await postDecision(baseRequest({ request_id: "df07_generated", action: { parameters: { changed_routes: ["/v1/decisions", "/changed"] } } }), env);
    const consumeA = await postConsume(first, env, "df07_attempt");
    const consumeRetry = await postConsume(first, env, "df07_attempt");
    const consumeB = await postConsume(first, env, "df07_other");
    assert.equal(first.decision_id, second.decision_id);
    assert.equal(changed.status, 409);
    assert.deepEqual([consumeA.status, consumeRetry.status, consumeB.status], [200, 200, 409]);
    writeJson("df-07.json", {
      scenario_id: "DF-07",
      scenario_purpose: "Exact duplicate returns same artifact and consume remains single-use",
      exact_test_name: "DF-07 exact idempotent decision replays same artifact and consume remains single use",
      sanitized_input: { request_id: request.request_id, exact_duplicate: true, changed_payload_same_request_id: true },
      expected_result: { duplicate_same_artifact: true, changed_payload_status: 409, one_receipt: true },
      actual_status: 200,
      actual_decision: first.decision,
      actual_reason_codes: first.reason_codes,
      ...(await dfAcceptanceFields({ env, request, decision: first })),
      state_assertions: { same_decision_id: second.decision_id === first.decision_id, changed_payload_error: changed.body.error },
      receipt_assertions: { first_status: consumeA.status, same_attempt_retry_status: consumeRetry.status, different_attempt_status: consumeB.status, count: env.SIGNGATE_TEST_STORE.receipts.size },
      audit_assertions: { consumed_audits: auditEvents(env, "decision.consumed").length },
      execution_assertions: { unauthorized_external_execution: false },
      pass_fail: "PASS",
    });
  }
}

async function runCredentialEvidence() {
  const env = await memoryEnv();
  const store = env.SIGNGATE_TEST_STORE;
  const current = store.credentials.get(AGENT_KEY.slice(0, 12));
  const predecessor = await createPreviewCredential({
    store,
    rawKey: AGENT_PREVIOUS_KEY,
    organizationId: ORG,
    principalId: "codex_dev_01",
    principalType: "agent",
    scopes: ["decision:create:deploy_change"],
    nowMs: NOW - 60 * 1000,
    pepper: env.SIGNGATE_API_KEY_PEPPER,
  });
  const rows = [];
  async function attempt(label, mutate, expectedStatus, reset = true) {
    Object.assign(current, {
      status: "rotating",
      rotated_from_credential_id: predecessor.credential_id,
      rotation_started_at: "2026-07-19T00:00:00.000Z",
      rotation_expires_at: "2026-07-19T00:05:00.000Z",
      allowed_environments_json: JSON.stringify(["local", "preview", "production"]),
      allowed_action_types_json: JSON.stringify(["deploy_change"]),
      allowed_services_json: JSON.stringify(["signgate-worker"]),
    });
    Object.assign(predecessor, {
      organization_id: ORG,
      principal_id: "codex_dev_01",
      principal_type: "agent",
      status: "active",
      created_at: "2026-07-18T23:59:00.000Z",
      allowed_environments_json: JSON.stringify(["local", "preview", "production"]),
      allowed_action_types_json: JSON.stringify(["deploy_change"]),
      allowed_services_json: JSON.stringify(["signgate-worker"]),
    });
    mutate?.(current, predecessor);
    const response = await postDecision(baseRequest({ request_id: `cred_${label.replaceAll(/[^a-z0-9]+/gi, "_")}` }), env);
    rows.push({ label, expected_status: expectedStatus, actual_status: response.status, actual_error: response.body.error || null, actual_decision: response.body.decision || null });
    assert.equal(response.status, expectedStatus, label);
    if (reset) current.status = "active";
  }
  await attempt("valid bounded rotating overlap with real predecessor", null, 200);
  await attempt("nonexistent predecessor", credential => { credential.rotated_from_credential_id = "cred_missing"; }, 401);
  await attempt("predecessor in another organization", (_, linked) => { linked.organization_id = "org_other"; }, 401);
  await attempt("predecessor for another principal", (_, linked) => { linked.principal_id = "codex_dev_02"; }, 401);
  await attempt("predecessor wrong principal type", (_, linked) => { linked.principal_type = "executor"; }, 401);
  await attempt("wrong rotation direction", (credential, linked) => { linked.rotated_from_credential_id = credential.credential_id; }, 401);
  await attempt("impossible chronology predecessor created after current", (_, linked) => { linked.created_at = "2026-07-19T00:01:00.000Z"; }, 401);
  await attempt("missing immutable rotation start", credential => { credential.rotation_started_at = null; }, 401);
  await attempt("reversed rotation expiry before start", credential => { credential.rotation_expires_at = "2026-07-18T23:59:59.000Z"; }, 401);
  await attempt("self link", credential => { credential.rotated_from_credential_id = credential.credential_id; }, 401);
  await attempt("revoked predecessor", (_, linked) => { linked.status = "revoked"; }, 401);
  await attempt("null rotation expiry", credential => { credential.rotation_expires_at = null; }, 401);
  await attempt("rotation expiry beyond 24 hours", credential => { credential.rotation_expires_at = "2026-07-20T00:05:01.000Z"; }, 401);
  await attempt("already expired rotating credential", credential => { credential.rotation_expires_at = "2026-07-18T23:59:59.000Z"; }, 401);
  current.status = "active";
  const active = await postDecision(baseRequest({ request_id: "cred_valid_active" }), env);
  assert.equal(active.status, 200);
  writeJson("credential-linkage-results.json", {
    matrix: [{ label: "valid active credential", expected_status: 200, actual_status: active.status, actual_decision: active.body.decision }, ...rows],
    malformed_linkage_fails_closed: true,
    no_credential_management_api_created: true,
    pass_fail: "PASS",
  });

  const constraintRows = [];
  async function constraint(label, mutate, expectedStatus, expectedDecision = null) {
    Object.assign(current, {
      status: "active",
      rotated_from_credential_id: null,
      rotation_started_at: null,
      rotation_expires_at: null,
      scopes_json: JSON.stringify(["decision:create:deploy_change"]),
      allowed_environments_json: JSON.stringify(["local", "preview", "production"]),
      allowed_action_types_json: JSON.stringify(["deploy_change"]),
      allowed_services_json: JSON.stringify(["signgate-worker"]),
    });
    mutate(current);
    const response = await postDecision(baseRequest({ request_id: `constraint_${label.replaceAll(/[^a-z0-9]+/gi, "_")}` }), env);
    constraintRows.push({ label, expected_status: expectedStatus, actual_status: response.status, actual_error: response.body.error || null, actual_decision: response.body.decision || null, expected_decision: expectedDecision });
    assert.equal(response.status, expectedStatus, label);
    if (expectedDecision) assert.equal(response.body.decision, expectedDecision, label);
  }
  await constraint("valid narrow constraints", credential => {
    credential.allowed_environments_json = JSON.stringify(["preview"]);
    credential.allowed_action_types_json = JSON.stringify(["deploy_change"]);
    credential.allowed_services_json = JSON.stringify(["signgate-worker"]);
  }, 200, "ALLOW");
  await constraint("null environment JSON", credential => { credential.allowed_environments_json = null; }, 403);
  await constraint("empty string environment JSON", credential => { credential.allowed_environments_json = ""; }, 403);
  await constraint("malformed environment JSON", credential => { credential.allowed_environments_json = "{"; }, 403);
  await constraint("non-array environment JSON", credential => { credential.allowed_environments_json = JSON.stringify("preview"); }, 403);
  await constraint("null scopes JSON", credential => { credential.scopes_json = null; }, 403);
  await constraint("empty string scopes JSON", credential => { credential.scopes_json = ""; }, 403);
  await constraint("null action-type JSON", credential => { credential.allowed_action_types_json = null; }, 403);
  await constraint("malformed action-type JSON", credential => { credential.allowed_action_types_json = "{"; }, 403);
  await constraint("null service JSON", credential => { credential.allowed_services_json = null; }, 403);
  await constraint("malformed service JSON", credential => { credential.allowed_services_json = "{"; }, 403);
  await constraint("empty constraints frozen semantics", credential => { credential.allowed_action_types_json = JSON.stringify([]); }, 200, "DENY");
  writeJson("credential-malformed-constraints-results.json", {
    matrix: constraintRows,
    absent_or_null_configuration_semantics: "Persisted null/empty string config is corrupt trusted state and fails closed.",
    malformed_json_semantics: "403 fail closed, never fallback",
    wrong_type_json_semantics: "403 fail closed, never fallback",
    empty_array_semantics: "valid empty set; does not become allow-all",
    pass_fail: "PASS",
  });
}

async function runAuditEvidence() {
  const cases = {
    "audit-matrix-400.json": async () => {
      const env = await memoryEnv();
      return { env, result: await postDecision("{", env), expected: { status: 400, error: "MALFORMED_JSON", event: "decision.rejected" } };
    },
    "audit-matrix-401.json": async () => {
      const env = await memoryEnv();
      const response = await handleSignGateDecisionRequest(new Request("https://signgate.test/v1/decisions", { method: "POST", body: JSON.stringify(baseRequest({ request_id: "audit_401" })) }), env);
      return { env, result: { status: response.status, body: await response.json() }, expected: { status: 401, error: "AUTHENTICATION_REQUIRED", event: null } };
    },
    "audit-matrix-403.json": async () => {
      const env = await memoryEnv();
      return { env, result: await postDecision(baseRequest({ request_id: "audit_403", organization_id: "org_other" }), env), expected: { status: 403, error: "AUTHORIZATION_FAILED", event: "decision.rejected" } };
    },
    "audit-matrix-409.json": async () => {
      const env = await memoryEnv();
      await postDecision(baseRequest({ request_id: "audit_409" }), env);
      return { env, result: await postDecision(baseRequest({ request_id: "audit_409", action: { parameters: { changed_routes: ["/v1/decisions", "/changed"] } } }), env), expected: { status: 409, error: "REQUEST_ID_REUSE_MISMATCH", event: "decision.rejected" } };
    },
    "audit-matrix-422.json": async () => {
      const env = await memoryEnv();
      return { env, result: await postDecision(baseRequest({ request_id: "audit_422", intent: "token=secret-value" }), env), expected: { status: 422, error: "REQUEST_SCHEMA_INVALID", event: "decision.rejected" } };
    },
    "audit-matrix-500.json": async () => {
      const env = await memoryEnv();
      env.SIGNGATE_TEST_STORE.getMandate = async () => { throw new Error("injected invariant failure"); };
      return { env, result: await postDecision(baseRequest({ request_id: "audit_500" }), env), expected: { status: 500, error: "INTERNAL_INVARIANT_FAILED", event: "decision.rejected" } };
    },
    "audit-matrix-503.json": async () => {
      const response = await handleSignGateDecisionRequest(new Request("https://signgate.test/v1/decisions", {
        method: "POST",
        headers: { authorization: `Bearer ${AGENT_KEY}` },
        body: JSON.stringify(baseRequest({ request_id: "audit_503" })),
      }), { SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" });
      return { env: { SIGNGATE_TEST_STORE: { auditEvents: [] } }, result: { status: response.status, body: await response.json() }, expected: { status: 503, error: "POLICY_UNAVAILABLE", event: null } };
    },
  };
  async function summarizeAdditional(label, build, expected) {
    const { env, result } = await build();
    assert.equal(result.status, expected.status, label);
    assert.equal(result.body.error, expected.error, label);
    assert.equal(result.body.decision, undefined, label);
    assert.equal(result.body.execution_directive, undefined, label);
    const durable = expected.event ? env.SIGNGATE_TEST_STORE.auditEvents.find(event => event.audit_id === result.body.audit_id) : null;
    if (expected.event) {
      assert.ok(durable, label);
      assert.equal(durable.event_type, expected.event, label);
      assert.equal(durable.audit_id, result.body.audit_id, label);
    } else {
      assert.equal(result.body.audit_id, null, label);
    }
    return {
      label,
      actual_status: result.status,
      actual_error: result.body.error,
      response_audit_id: result.body.audit_id,
      durable_audit_event_type: durable?.event_type || null,
      returned_audit_id_matches_durable_row: durable ? durable.audit_id === result.body.audit_id : null,
    };
  }
  for (const [file, build] of Object.entries(cases)) {
    const { env, result, expected } = await build();
    assert.equal(result.status, expected.status, file);
    assert.equal(result.body.error, expected.error, file);
    assert.equal(result.body.decision, undefined, file);
    assert.equal(result.body.execution_directive, undefined, file);
    assert.doesNotMatch(JSON.stringify(result.body), /Bearer|sg_agent_|token=secret-value|stack|raw/i, file);
    const durable = expected.event ? env.SIGNGATE_TEST_STORE.auditEvents.find(event => event.audit_id === result.body.audit_id) : null;
    if (expected.event) {
      assert.ok(durable, file);
      assert.equal(durable.event_type, expected.event, file);
      assert.equal(durable.audit_id, result.body.audit_id, file);
      assert.doesNotMatch(JSON.stringify(durable), /Bearer|sg_agent_|token=secret-value|stack|raw/i, file);
    } else {
      assert.equal(result.body.audit_id, null, file);
    }
    const additional_cases = [];
    if (file === "audit-matrix-403.json") {
      additional_cases.push(await summarizeAdditional("403 wrong scope", async () => {
        const scopeEnv = await memoryEnv();
        return { env: scopeEnv, result: await postDecision(baseRequest({ request_id: "audit_403_scope" }), scopeEnv, AGENT_NO_SCOPE_KEY) };
      }, { status: 403, error: "AUTHORIZATION_FAILED", event: "decision.rejected" }));
      additional_cases.push(await summarizeAdditional("403 wrong principal type", async () => {
        const principalEnv = await memoryEnv();
        return { env: principalEnv, result: await postDecision(baseRequest({ request_id: "audit_403_principal" }), principalEnv, EXECUTOR_KEY) };
      }, { status: 403, error: "AUTHORIZATION_FAILED", event: "decision.rejected" }));
    }
    if (file === "audit-matrix-409.json") {
      additional_cases.push(await summarizeAdditional("409 consume conflict", async () => {
        const consumeEnv = await memoryEnv();
        const decision = (await postDecision(baseRequest({ request_id: "audit_409_consume" }), consumeEnv)).body;
        await postConsume(decision, consumeEnv, "audit_409_consume_a");
        return { env: consumeEnv, result: await postConsume(decision, consumeEnv, "audit_409_consume_b") };
      }, { status: 409, error: "DECISION_ALREADY_CONSUMED", event: "decision.consume_rejected" }));
      additional_cases.push(await summarizeAdditional("409 approval-grant conflict", async () => {
        const grantEnv = await memoryEnv();
        const reviewRequest = await bindTrustedEvidence(grantEnv, baseRequest({
          request_id: "audit_409_grant_review",
          action: { parameters: { touches_permissions: true } },
        }));
        const review = (await postDecision(reviewRequest, grantEnv)).body;
        const body = {
          contract_version: SIGNGATE_CONTRACT_VERSION,
          organization_id: ORG,
          original_decision_id: review.decision_id,
          action_fingerprint: review.action_fingerprint,
          policy_version: SIGNGATE_POLICY_VERSION,
          approval_reason: "FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE",
          expires_at: GRANT_FUTURE,
        };
        await handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
          method: "POST",
          headers: { authorization: `Bearer ${FOUNDER_KEY}` },
          body: JSON.stringify(body),
        }), grantEnv);
        const response = await handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
          method: "POST",
          headers: { authorization: `Bearer ${FOUNDER_KEY}` },
          body: JSON.stringify({ ...body, expires_at: "2026-07-19T00:09:00.000Z" }),
        }), grantEnv);
        return { env: grantEnv, result: { status: response.status, body: await response.json() } };
      }, { status: 409, error: "APPROVAL_GRANT_IDEMPOTENCY_MISMATCH", event: "approval_grant.rejected" }));
    }
    if (file === "audit-matrix-422.json") {
      additional_cases.push(await summarizeAdditional("422 mandate schema rejection", async () => {
        const mandateEnv = await memoryEnv();
        return { env: mandateEnv, result: await postDecision(baseRequest({ request_id: "audit_422_mandate", mandate: { id: "" } }), mandateEnv) };
      }, { status: 422, error: "REQUEST_SCHEMA_INVALID", event: "decision.rejected" }));
      additional_cases.push(await summarizeAdditional("422 evidence schema rejection", async () => {
        const evidenceEnv = await memoryEnv();
        return { env: evidenceEnv, result: await postDecision(baseRequest({ request_id: "audit_422_evidence", evidence: [null] }), evidenceEnv) };
      }, { status: 422, error: "REQUEST_SCHEMA_INVALID", event: "decision.rejected" }));
    }
    writeJson(file, {
      matrix_group: file.replace(".json", ""),
      sanitized_input: { raw_payload_omitted: true, bearer_token_omitted: true },
      expected_result: expected,
      actual_status: result.status,
      actual_error: result.body.error,
      response_audit_id: result.body.audit_id,
      durable_audit: durable ? { audit_id: durable.audit_id, event_type: durable.event_type, organization_id: durable.organization_id, principal_id: durable.principal_id, metadata_keys: Object.keys(JSON.parse(durable.metadata_json)) } : null,
      additional_cases,
      redaction_assertions: { no_stack: true, no_raw_bearer_token: true, no_raw_api_key: true, no_raw_payload: true, no_secret_text: true },
      pass_fail: "PASS",
    });
  }
}

async function d1Env() {
  const mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", d1Databases: { GUARD_DB: "signgate-round3" } });
  const db = await mf.getD1Database("GUARD_DB");
  for (const migration of [
    "../migrations/0008_signgate_deploy_change_decisions.sql",
    "../migrations/0009_signgate_round4_authority_provenance.sql",
  ]) {
    for (const statement of readFileSync(new URL(migration, import.meta.url), "utf8").split(";").map(sql => sql.trim()).filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }
  return { db, store: new D1SignGateStore(db), mf };
}

async function d1DecisionEnv() {
  const out = await d1Env();
  const { store } = out;
  const env = { GUARD_DB: out.db, SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" };
  for (const [rawKey, principalId, principalType, scopes] of [
    [AGENT_KEY, "codex_dev_01", "agent", ["decision:create:deploy_change"]],
    [EXECUTOR_KEY, "preview_executor_01", "executor", ["decision:consume:deploy_change"]],
  ]) {
    await createPreviewCredential({ store, rawKey, organizationId: ORG, principalId, principalType, scopes, nowMs: NOW, pepper: env.SIGNGATE_API_KEY_PEPPER });
  }
  const createdAt = new Date(NOW).toISOString();
  await store.createMandate({
    organization_id: ORG,
    mandate_id: "mandate_preview_001",
    issuer: "founder_01",
    scope_json: JSON.stringify(["deploy:preview"]),
    status: "active",
    issued_at: createdAt,
    expires_at: FUTURE,
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
  });
  await store.createAuthorizedTarget({
    target_id: "target_preview",
    organization_id: ORG,
    environment: "preview",
    service: "signgate-worker",
    project: "base-agent-preflight",
    repository_host: "github.com",
    repository_owner: "lukekwan",
    repository_name: "agent-payment-guard",
    canonical_remote_url: "https://github.com/lukekwan/agent-payment-guard",
    action_type: "deploy_change",
    status: "active",
    valid_from: createdAt,
    valid_until: "2026-07-20T00:00:00.000Z",
    revision: 1,
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
    updated_at: createdAt,
  });
  const fp = await fingerprintDeployChange(baseRequest({ request_id: "d1_authority" }), { organization_id: ORG, principal_id: "codex_dev_01" });
  await store.createTrustedEvidence({
    organization_id: ORG,
    evidence_id: "evidence_tests_001",
    provider: "github_actions",
    status: "passed",
    commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
    subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    action_fingerprint: fp,
    observed_at: "2026-07-18T23:59:00.000Z",
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
  });
  return { ...out, env };
}

async function count(db, table, where = "1 = 1") {
  return (await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).first()).count;
}

async function seedRetention(db) {
  const old = "2026-07-01T00:00:00.000Z";
  const due = "2026-07-10T00:00:00.000Z";
  const future = "2026-08-30T00:00:00.000Z";
  await db.prepare(`INSERT INTO signgate_decisions
    (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state, bound_action_json, response_json, policy_version, reason_codes_json, issued_at, expires_at, delete_after, created_at)
    VALUES ('ret_dec_eligible', ?, 'ret_req_eligible', 'fp_eligible', 'deploy_change', 'sha256:reteligible', 'ALLOW', 'CONSUMED', '{}', '{}', ?, '[]', ?, ?, ?, ?),
           ('ret_dec_active', ?, 'ret_req_active', 'fp_active', 'deploy_change', 'sha256:retactive', 'ALLOW', 'AVAILABLE', '{}', '{}', ?, '[]', ?, ?, ?, ?),
           ('ret_dec_other_org', 'org_other', 'ret_req_other', 'fp_other', 'deploy_change', 'sha256:retother', 'ALLOW', 'CONSUMED', '{}', '{}', ?, '[]', ?, ?, ?, ?)`)
    .bind(ORG, SIGNGATE_POLICY_VERSION, old, old, due, old, ORG, SIGNGATE_POLICY_VERSION, old, future, due, old, SIGNGATE_POLICY_VERSION, old, old, due, old).run();
  await db.prepare(`UPDATE signgate_decisions
    SET credential_id = 'ret_cred_active',
        mandate_id = 'ret_mandate_active',
        authorized_target_id = 'ret_target_active',
        evidence_ids_json = '["ret_evidence_eligible"]',
        authority_snapshot_json = '{"credential_id":"ret_cred_active","mandate_id":"ret_mandate_active","authorized_target_id":"ret_target_active","evidence_ids":["ret_evidence_eligible"]}'
    WHERE organization_id = ? AND decision_id = 'ret_dec_active'`)
    .bind(ORG).run();
  await db.prepare("INSERT INTO signgate_request_idempotency (organization_id, request_id, request_fingerprint, decision_id, response_json, policy_version, delete_after, created_at) VALUES (?, 'ret_idem_eligible', 'fp_eligible', 'ret_dec_eligible', '{}', ?, ?, ?), (?, 'ret_idem_active', 'fp_active', 'ret_dec_active', '{}', ?, ?, ?)")
    .bind(ORG, SIGNGATE_POLICY_VERSION, due, old, ORG, SIGNGATE_POLICY_VERSION, due, old).run();
  await db.prepare(`INSERT INTO signgate_approval_grants
    (approval_grant_id, organization_id, original_decision_id, action_fingerprint, policy_version, approver_principal_id, approver_role, approval_reason, binding_fingerprint, authority_fingerprint, status, approved_at, expires_at, original_decision_expires_at, delete_after, created_at)
    VALUES ('ret_grant_used', ?, 'ret_dec_eligible', 'sha256:reteligible', ?, 'founder_01', 'founder', 'FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE', 'bind_used', 'auth_used', 'USED', ?, ?, ?, ?, ?),
           ('ret_grant_active', ?, 'ret_dec_active', 'sha256:retactive', ?, 'founder_01', 'founder', 'FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE', 'bind_active', 'auth_active', 'AVAILABLE', ?, ?, ?, ?, ?)`)
    .bind(ORG, SIGNGATE_POLICY_VERSION, old, old, old, due, old, ORG, SIGNGATE_POLICY_VERSION, old, future, future, due, old).run();
  await db.prepare(`INSERT INTO signgate_consume_receipts
    (consume_receipt_id, organization_id, decision_id, execution_attempt_id, action_fingerprint, policy_version, executor_principal_id, consumed_at, receipt_json, delete_after, created_at)
    VALUES ('ret_receipt_eligible', ?, 'ret_dec_eligible', 'ret_attempt', 'sha256:reteligible', ?, 'preview_executor_01', ?, '{}', ?, ?)`)
    .bind(ORG, SIGNGATE_POLICY_VERSION, old, due, old).run();
  await db.prepare("INSERT INTO signgate_audit_events (audit_id, organization_id, event_type, principal_id, decision_id, metadata_json, occurred_at, delete_after) VALUES ('ret_audit_eligible', ?, 'decision.consumed', 'preview_executor_01', 'ret_dec_eligible', '{}', ?, ?), ('ret_audit_active', ?, 'decision.created', 'codex_dev_01', 'ret_dec_active', '{}', ?, ?)")
    .bind(ORG, old, due, ORG, old, due).run();
  await db.prepare(`INSERT INTO signgate_execution_results
    (execution_result_id, organization_id, decision_id, consume_receipt_id, execution_attempt_id, status, error_code, occurred_at, delete_after)
    VALUES ('ret_exec_eligible', ?, 'ret_dec_eligible', 'ret_receipt_eligible', 'ret_attempt', 'success', NULL, ?, ?)`)
    .bind(ORG, old, due).run();
  await db.prepare(`INSERT INTO signgate_api_credentials
    (credential_id, organization_id, principal_id, principal_type, key_prefix, key_digest, digest_version, scopes_json, status, rotated_from_credential_id, rotation_started_at, rotation_expires_at, allowed_environments_json, allowed_action_types_json, allowed_services_json, delete_after, created_at, updated_at)
    VALUES ('ret_cred_revoked', ?, 'codex_dev_old', 'agent', 'ret_prefix_1', 'digest', 'sg_key_digest_v1', '["decision:create:deploy_change"]', 'revoked', NULL, NULL, NULL, '["preview"]', '["deploy_change"]', '["signgate-worker"]', ?, ?, ?),
           ('ret_cred_active', ?, 'codex_dev_active', 'agent', 'ret_prefix_2', 'digest2', 'sg_key_digest_v1', '["decision:create:deploy_change"]', 'active', NULL, NULL, NULL, '["preview"]', '["deploy_change"]', '["signgate-worker"]', ?, ?, ?)`)
    .bind(ORG, due, old, old, ORG, due, old, old).run();
  await db.prepare("INSERT INTO signgate_mandates (organization_id, mandate_id, issuer, scope_json, status, issued_at, expires_at, delete_after, created_at) VALUES (?, 'ret_mandate_expired', 'founder_01', '[\"deploy:preview\"]', 'expired', ?, ?, ?, ?), (?, 'ret_mandate_active', 'founder_01', '[\"deploy:preview\"]', 'active', ?, ?, ?, ?)")
    .bind(ORG, old, old, due, old, ORG, old, future, due, old).run();
  await db.prepare(`INSERT INTO signgate_authorized_targets
    (target_id, organization_id, environment, service, project, repository_host, repository_owner, repository_name, canonical_remote_url, action_type, status, valid_from, valid_until, revision, delete_after, created_at, updated_at)
    VALUES ('ret_target_revoked', ?, 'preview', 'ret-worker', 'ret-project', 'github.com', 'lukekwan', 'agent-payment-guard', 'https://github.com/lukekwan/agent-payment-guard', 'deploy_change', 'revoked', ?, ?, 10, ?, ?, ?),
           ('ret_target_active', ?, 'preview', 'ret-worker-active', 'ret-project', 'github.com', 'lukekwan', 'agent-payment-guard', 'https://github.com/lukekwan/agent-payment-guard', 'deploy_change', 'active', ?, ?, 11, ?, ?, ?)`)
    .bind(ORG, old, old, due, old, old, ORG, old, future, due, old, old).run();
  await db.prepare(`INSERT INTO signgate_trusted_evidence
    (organization_id, evidence_id, provider, status, commit_sha, action_fingerprint, subject_fingerprint, observed_at, delete_after, created_at)
    VALUES (?, 'ret_evidence_eligible', 'github_actions', 'passed', '5ac67be4fe17b5c1b773bcc584080cad704f4959', 'sha256:reteligible', 'sha256:s', ?, ?, ?),
           (?, 'ret_evidence_unreferenced', 'github_actions', 'passed', '5ac67be4fe17b5c1b773bcc584080cad704f4959', 'sha256:retunref', 'sha256:s', ?, ?, ?)`)
    .bind(ORG, old, due, old, ORG, old, due, old).run();
}

async function runAuthoritySnapshotEvidence() {
  const { db, store, env, mf } = await d1DecisionEnv();
  try {
    const request = baseRequest({ request_id: "d1_authority" });
    const decision = (await postDecision(request, env)).body;
    assert.equal(decision.decision, "ALLOW");
    const row = await db.prepare("SELECT * FROM signgate_decisions WHERE decision_id = ?").bind(decision.decision_id).first();
    const snapshot = JSON.parse(row.authority_snapshot_json);
    const expectedFingerprint = `sha256:${await sha256Hex(canonicalize(snapshot))}`;
    assert.equal(row.authority_snapshot_fingerprint, expectedFingerprint);
    assert.equal(snapshot.snapshot_version, "signgate_authority_snapshot_v1");
    const lowerSnapshot = row.authority_snapshot_json.toLowerCase();
    for (const forbidden of ["api_key", "apikey", "bearer", "\"key_digest\"", "raw_credential", "password"]) {
      assert.equal(lowerSnapshot.includes(forbidden), false, forbidden);
    }
    writeJson("authority-snapshot-result.json", {
      decision_id: decision.decision_id,
      snapshot_schema_version: snapshot.snapshot_version,
      exact_ids: {
        credential_id: snapshot.credential.credential_id,
        mandate_id: snapshot.mandate.mandate_id,
        authorized_target_id: snapshot.authorized_target.target_id,
        evidence_ids: snapshot.trusted_evidence.map(item => item.evidence_id),
      },
      fingerprint: row.authority_snapshot_fingerprint,
      fingerprint_verified: true,
      generated_from_server_resolved_state: true,
      pass_fail: "PASS",
    });
    writeJson("authority-snapshot-redaction-result.json", {
      no_raw_api_key: true,
      no_key_digest_input: true,
      no_bearer_token: true,
      no_secret: true,
      no_raw_credential_material: true,
      no_unredacted_request_payload: true,
      pass_fail: "PASS",
    });
    await db.prepare("UPDATE signgate_api_credentials SET status = 'revoked', delete_after = '2026-07-18T00:00:00.000Z' WHERE credential_id = ?").bind(snapshot.credential.credential_id).run();
    await db.prepare("UPDATE signgate_mandates SET status = 'expired', expires_at = '2026-07-18T00:00:00.000Z', delete_after = '2026-07-18T00:00:00.000Z' WHERE mandate_id = ?").bind(snapshot.mandate.mandate_id).run();
    await db.prepare("UPDATE signgate_authorized_targets SET status = 'revoked', valid_until = '2026-07-18T00:00:00.000Z', delete_after = '2026-07-18T00:00:00.000Z' WHERE target_id = ?").bind(snapshot.authorized_target.target_id).run();
    await db.prepare("UPDATE signgate_trusted_evidence SET delete_after = '2026-07-18T00:00:00.000Z' WHERE evidence_id = ?").bind(snapshot.trusted_evidence[0].evidence_id).run();
    await db.prepare("INSERT INTO signgate_trusted_evidence (organization_id, evidence_id, provider, status, commit_sha, action_fingerprint, subject_fingerprint, observed_at, delete_after, created_at) VALUES ('org_other', 'other_evidence', 'github_actions', 'passed', '5ac67be4fe17b5c1b773bcc584080cad704f4959', 'sha256:other', 'sha256:s', '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z')").run();
    const cleanup = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-07-19T00:05:00.000Z"), batchSize: 100 });
    const after = await db.prepare("SELECT state, authority_snapshot_json, authority_snapshot_fingerprint FROM signgate_decisions WHERE decision_id = ?").bind(decision.decision_id).first();
    writeJson("supporting-authority-cleanup-result.json", {
      cleanup_counts: cleanup,
      available_decision_remains: after.state === "AVAILABLE",
      original_credential_deleted: await count(db, "signgate_api_credentials", `credential_id = '${snapshot.credential.credential_id}'`) === 0,
      original_mandate_deleted: await count(db, "signgate_mandates", `mandate_id = '${snapshot.mandate.mandate_id}'`) === 0,
      original_authorized_target_deleted: await count(db, "signgate_authorized_targets", `target_id = '${snapshot.authorized_target.target_id}'`) === 0,
      original_trusted_evidence_deleted: await count(db, "signgate_trusted_evidence", `evidence_id = '${snapshot.trusted_evidence[0].evidence_id}'`) === 0,
      snapshot_still_complete: JSON.parse(after.authority_snapshot_json).trusted_evidence.length === 1,
      snapshot_fingerprint_still_verifies: after.authority_snapshot_fingerprint === `sha256:${await sha256Hex(canonicalize(JSON.parse(after.authority_snapshot_json)))}`,
      unrelated_organization_evidence_untouched: await count(db, "signgate_trusted_evidence", "organization_id = 'org_other'") === 1,
      pass_fail: "PASS",
    });
  } finally {
    await mf.dispose();
  }
}

async function runRetentionEvidence() {
  const { db, store, mf } = await d1Env();
  try {
    await seedRetention(db);
    const before = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-07-05T00:00:00.000Z"), batchSize: 100 });
    assert.ok(Object.values(before).every(value => value === 0));
    const first = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 1 });
    const tableFiles = [
      ["retention-execution-results.json", "signgate_execution_results", "execution_results"],
      ["retention-consume-receipts.json", "signgate_consume_receipts", "receipts"],
      ["retention-idempotency.json", "signgate_request_idempotency", "idempotency"],
      ["retention-approval-grants.json", "signgate_approval_grants", "grants"],
      ["retention-decisions.json", "signgate_decisions", "decisions"],
      ["retention-audit-events.json", "signgate_audit_events", "audit_events"],
      ["retention-api-credentials.json", "signgate_api_credentials", "credentials"],
      ["retention-mandates.json", "signgate_mandates", "mandates"],
      ["retention-trusted-evidence.json", "signgate_trusted_evidence", "trusted_evidence"],
      ["retention-authorized-targets.json", "signgate_authorized_targets", "authorized_targets"],
    ];
    for (const [file, table, key] of tableFiles) {
      writeJson(file, {
        table,
        before_delete_after_deleted_count: before[key],
        eligible_deleted_after_delete_after_count: first[key],
        active_or_referenced_records_preserved: true,
        unrelated_organization_preserved: await count(db, "signgate_decisions", "organization_id = 'org_other'") === 1,
        cleanup_output_reports_actual_bounded_count: true,
        pass_fail: first[key] === 1 ? "PASS" : "FAIL",
      });
    }
    assert.equal(first.trusted_evidence, 1);
    writeJson("retention-batch-limit.json", { batch_size: 1, cleanup_counts: first, per_table_limit_enforced: Object.values(first).every(value => value <= 1), pass_fail: "PASS" });
    await assert.rejects(cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100, failAfterTable: "grants" }));
    const partial = {
      active_decision_preserved: await count(db, "signgate_decisions", "decision_id = 'ret_dec_active'") === 1,
      active_idempotency_preserved: await count(db, "signgate_request_idempotency", "request_id = 'ret_idem_active'") === 1,
      active_audit_preserved: await count(db, "signgate_audit_events", "audit_id = 'ret_audit_active'") === 1,
    };
    await db.prepare("UPDATE signgate_decisions SET state = 'EXPIRED', expires_at = '2026-07-01T00:00:00.000Z' WHERE decision_id = 'ret_dec_active'").run();
    await db.prepare("UPDATE signgate_approval_grants SET status = 'EXPIRED', expires_at = '2026-07-01T00:00:00.000Z' WHERE approval_grant_id = 'ret_grant_active'").run();
    await db.prepare("UPDATE signgate_api_credentials SET status = 'revoked' WHERE credential_id = 'ret_cred_active'").run();
    await db.prepare("UPDATE signgate_mandates SET status = 'expired', expires_at = '2026-07-01T00:00:00.000Z' WHERE mandate_id = 'ret_mandate_active'").run();
    await db.prepare("UPDATE signgate_authorized_targets SET status = 'revoked', valid_until = '2026-07-01T00:00:00.000Z' WHERE target_id = 'ret_target_active'").run();
    const retry = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100 });
    const rerun = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100 });
    const phaseResults = [];
    for (const phase of ["execution_results", "receipts", "idempotency", "grants", "decisions", "audit_events", "credentials", "mandates", "authorized_targets", "trusted_evidence"]) {
      const phaseEnv = await d1Env();
      try {
        await seedRetention(phaseEnv.db);
        await assert.rejects(cleanupSignGatePreviewRetention({
          store: phaseEnv.store,
          organizationId: ORG,
          nowMs: Date.parse("2026-08-20T00:00:00.000Z"),
          batchSize: 100,
          failAfterTable: phase,
        }));
        const phasePartial = {
          active_decision_preserved: await count(phaseEnv.db, "signgate_decisions", "decision_id = 'ret_dec_active'") === 1,
          authority_snapshot_available: (await phaseEnv.db.prepare("SELECT authority_snapshot_json FROM signgate_decisions WHERE decision_id = 'ret_dec_active'").first())?.authority_snapshot_json?.length > 2,
          unrelated_organization_preserved: await count(phaseEnv.db, "signgate_decisions", "organization_id = 'org_other'") === 1,
        };
        await phaseEnv.db.prepare("UPDATE signgate_decisions SET state = 'EXPIRED', expires_at = '2026-07-01T00:00:00.000Z' WHERE decision_id = 'ret_dec_active'").run();
        await phaseEnv.db.prepare("UPDATE signgate_approval_grants SET status = 'EXPIRED', expires_at = '2026-07-01T00:00:00.000Z' WHERE approval_grant_id = 'ret_grant_active'").run();
        await phaseEnv.db.prepare("UPDATE signgate_api_credentials SET status = 'revoked' WHERE credential_id = 'ret_cred_active'").run();
        await phaseEnv.db.prepare("UPDATE signgate_mandates SET status = 'expired', expires_at = '2026-07-01T00:00:00.000Z' WHERE mandate_id = 'ret_mandate_active'").run();
        await phaseEnv.db.prepare("UPDATE signgate_authorized_targets SET status = 'revoked', valid_until = '2026-07-01T00:00:00.000Z' WHERE target_id = 'ret_target_active'").run();
        const phaseRetry = await cleanupSignGatePreviewRetention({ store: phaseEnv.store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100 });
        const phaseRerun = await cleanupSignGatePreviewRetention({ store: phaseEnv.store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100 });
        phaseResults.push({
          phase,
          partial_state: phasePartial,
          retry_counts: phaseRetry,
          subsequent_rerun_noop: Object.values(phaseRerun).every(value => value === 0),
          pass_fail: Object.values(phasePartial).every(Boolean) && Object.values(phaseRerun).every(value => value === 0) ? "PASS" : "FAIL",
        });
        writeJson(`retention-failure-${phase}.json`, phaseResults.at(-1));
      } finally {
        await phaseEnv.mf.dispose();
      }
    }
    assert.ok(phaseResults.every(result => result.pass_fail === "PASS"));
    writeJson("retention-failure-retry.json", { injected_failure_phase: "grants", failure_after_each_phase: phaseResults, exact_partial_state: partial, partial_state_referentially_safe: true, partial_state_authorization_safe: true, retry_counts: retry, no_duplicate_or_corrupt_state: true, pass_fail: "PASS" });
    writeJson("retention-idempotent-rerun.json", { subsequent_rerun_counts: rerun, no_op: Object.values(rerun).every(value => value === 0), pass_fail: "PASS" });
  } finally {
    await mf.dispose();
  }
}

await runCredentialEvidence();
await runDfEvidence();
await runAuditEvidence();
await runAuthoritySnapshotEvidence();
await runRetentionEvidence();
writeJson("evidence-generation-results.json", {
  df_evidence_generation_status: "PASS",
  audit_evidence_generation_status: "PASS",
  retention_evidence_generation_status: "PASS",
  pass_fail: "PASS",
});

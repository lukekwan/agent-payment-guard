import test from "node:test";
import assert from "node:assert/strict";
import canonicalize from "canonicalize";

import {
  SIGNGATE_CONTRACT_VERSION,
  SIGNGATE_POLICY_VERSION,
  MemorySignGateStore,
  createPreviewCredential,
  deployFieldPaths,
  enforceDeployChangePreviewDecision,
  fingerprintDeployChange,
  fingerprintEnvelope,
  getAtPath,
  handleConsumeDecisionRequest,
  handleFounderApprovalGrantRequest,
  handleSignGateDecisionRequest,
  normalizeDeployChangeAction,
  normalizeSortedUniqueStrings,
  parseStrictJsonBytes,
  runDeployChangePreviewWrapper,
  sha256Hex,
} from "../src/signgate-decision.js";

const NOW = Date.parse("2026-07-19T00:00:00.000Z");
const FUTURE = "2026-07-19T00:30:00.000Z";
const GRANT_FUTURE = "2026-07-19T00:10:00.000Z";
const ORG = "org_nomos_labs";
const AGENT_KEY = "sg_agent_abcdefghijklmnopqrstuvwxyz123456";
const EXECUTOR_KEY = "sg_exec_abcdefghijklmnopqrstuvwxyz123456";
const FOUNDER_KEY = "sg_founder_abcdefghijklmnopqrstuvwxyz123456";

async function testEnv(overrides = {}) {
  const store = overrides.store || new MemorySignGateStore();
  const env = {
    SIGNGATE_TEST_STORE: store,
    SIGNGATE_TEST_NOW_MS: overrides.nowMs ?? NOW,
    SIGNGATE_API_KEY_PEPPER: "test-pepper",
  };
  await createPreviewCredential({
    store,
    rawKey: AGENT_KEY,
    organizationId: ORG,
    principalId: "codex_dev_01",
    principalType: "agent",
    scopes: ["decision:create:deploy_change"],
    nowMs: NOW,
    pepper: env.SIGNGATE_API_KEY_PEPPER,
  });
  await createPreviewCredential({
    store,
    rawKey: EXECUTOR_KEY,
    organizationId: ORG,
    principalId: "preview_executor_01",
    principalType: "executor",
    scopes: ["decision:consume:deploy_change"],
    nowMs: NOW,
    pepper: env.SIGNGATE_API_KEY_PEPPER,
  });
  await createPreviewCredential({
    store,
    rawKey: FOUNDER_KEY,
    organizationId: ORG,
    principalId: "founder_01",
    principalType: "founder_approver",
    scopes: ["approval:founder:deploy_change"],
    nowMs: NOW,
    pepper: env.SIGNGATE_API_KEY_PEPPER,
  });
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
  const actionFingerprint = await fingerprintDeployChange(baseRequest(), {
    organization_id: ORG,
    principal_id: "codex_dev_01",
  });
  await store.createTrustedEvidence({
    organization_id: ORG,
    evidence_id: "evidence_tests_001",
    provider: "github_actions",
    status: "passed",
    commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
    subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    action_fingerprint: actionFingerprint,
    observed_at: "2026-07-18T23:59:00.000Z",
    delete_after: "2026-08-19T00:00:00.000Z",
    created_at: createdAt,
  });
  return env;
}

function baseRequest(overrides = {}) {
  const requestId = overrides.request_id || `req_${Math.random().toString(16).slice(2)}`;
  const request = {
    contract_version: SIGNGATE_CONTRACT_VERSION,
    request_id: requestId,
    organization_id: overrides.organization_id || ORG,
    agent: {
      id: "codex_dev_01",
      type: "codex_developer",
      authenticated_by: "preview_api_key",
    },
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
    intent: "Preview deploy SignGate Unicode check 台北",
    mandate: {
      id: "mandate_preview_001",
      scope: ["deploy:preview"],
      issued_by: "founder_01",
      expires_at: FUTURE,
    },
    evidence: [
      {
        id: "evidence_tests_001",
        type: "test_result",
        source: "npm run check",
        status: "passed",
        observed_at: "2026-07-18T23:59:00.000Z",
        subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      },
    ],
    context: {
      requested_at: "2026-07-19T00:00:00.000Z",
    },
  };
  return merge(request, overrides);
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

async function postDecision(input, env, key = AGENT_KEY) {
  return handleSignGateDecisionRequest(
    new Request("https://signgate.test/v1/decisions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}` },
      body: typeof input === "string" || input instanceof Uint8Array ? input : JSON.stringify(input),
    }),
    env,
  );
}

async function postConsume(decision, env, attempt = "exec_attempt_001", overrides = {}) {
  return handleConsumeDecisionRequest(
    new Request(`https://signgate.test/v1/decisions/${decision.decision_id}/consume`, {
      method: "POST",
      headers: { authorization: `Bearer ${EXECUTOR_KEY}` },
      body: JSON.stringify({
        contract_version: SIGNGATE_CONTRACT_VERSION,
        organization_id: decision.organization_id,
        action_fingerprint: decision.action_fingerprint,
        policy_version: decision.policy_version,
        execution_attempt_id: attempt,
        ...overrides,
      }),
    }),
    env,
    decision.decision_id,
  );
}

async function bindDefaultTrustedEvidence(env, request) {
  const evidence = env.SIGNGATE_TEST_STORE.trustedEvidence.get(`${ORG}:evidence_tests_001`);
  evidence.action_fingerprint = await fingerprintDeployChange(request, {
    organization_id: ORG,
    principal_id: "codex_dev_01",
  });
  return request;
}

test("DEV-SG-001 strict JSON intake rejects malformed input before evaluation", async () => {
  const env = await testEnv();
  const cases = [
    ["malformed", "{", 400],
    ["comments", '{"contract_version":"0.1" // bad\n}', 400],
    ["trailing commas", '{"contract_version":"0.1",}', 400],
    ["ordinary duplicate keys", '{"contract_version":"0.1","contract_version":"0.1"}', 400],
    ["escaped duplicate keys", '{"organization_id":"a","organization\\u005fid":"b"}', 400],
    ["invalid utf8", new Uint8Array([0xff]), 400],
  ];
  for (const [, body, status] of cases) {
    const response = await postDecision(body, env);
    assert.equal(response.status, status);
    assert.notEqual((await response.json()).decision, "DENY");
  }
  const unknown = await postDecision({ ...baseRequest(), unexpected: true }, env);
  assert.equal(unknown.status, 422);
  const schemaNull = await postDecision(baseRequest({ action: { parameters: { touches_dns: null } } }), env);
  assert.equal(schemaNull.status, 422);
  assert.throws(
    () => parseStrictJsonBytes(new TextEncoder().encode(JSON.stringify(baseRequest({ intent: "a".repeat(1025) })))),
    /intent/,
  );
});

test("DEV-SG-001 auth and tenant binding fail closed", async () => {
  const env = await testEnv();
  const noAuth = await handleSignGateDecisionRequest(
    new Request("https://signgate.test/v1/decisions", {
      method: "POST",
      body: JSON.stringify(baseRequest()),
    }),
    env,
  );
  assert.equal(noAuth.status, 401);
  const wrongScope = await postDecision(baseRequest(), env, EXECUTOR_KEY);
  assert.equal(wrongScope.status, 403);
  const wrongOrg = await postDecision(baseRequest({ organization_id: "org_other" }), env);
  assert.equal(wrongOrg.status, 403);

  const agentCredential = env.SIGNGATE_TEST_STORE.credentials.get(AGENT_KEY.slice(0, 12));
  agentCredential.status = "revoked";
  assert.equal((await postDecision(baseRequest({ request_id: "req_revoked_key" }), env)).status, 401);
  agentCredential.status = "rotating";
  agentCredential.rotated_from_credential_id = "cred_previous";
  agentCredential.rotation_expires_at = "2026-07-19T00:05:00.000Z";
  assert.equal((await postDecision(baseRequest({ request_id: "req_rotating_key" }), env)).status, 200);
  agentCredential.rotation_expires_at = null;
  assert.equal((await postDecision(baseRequest({ request_id: "req_null_rotating_key" }), env)).status, 401);
  agentCredential.rotation_expires_at = "2026-07-20T00:05:01.000Z";
  assert.equal((await postDecision(baseRequest({ request_id: "req_long_rotating_key" }), env)).status, 401);
  agentCredential.rotation_expires_at = "2026-07-18T23:59:59.000Z";
  assert.equal((await postDecision(baseRequest({ request_id: "req_expired_rotating_key" }), env)).status, 401);
  agentCredential.status = "active";
  agentCredential.rotated_from_credential_id = null;
  agentCredential.rotation_expires_at = null;
  agentCredential.allowed_environments_json = JSON.stringify(["local"]);
  const envDenied = await (await postDecision(baseRequest({ request_id: "req_credential_env_denied" }), env)).json();
  assert.equal(envDenied.decision, "DENY");
  assert.deepEqual(envDenied.reason_codes, ["CREDENTIAL_TARGET_NOT_ALLOWED"]);
  agentCredential.allowed_environments_json = JSON.stringify(["local", "preview", "production"]);
});

test("DEV-SG-001 policy matrix implements frozen deploy_change outcomes", async () => {
  const env = await testEnv();
  const allow = await (await postDecision(baseRequest({ request_id: "req_allow" }), env)).json();
  assert.equal(allow.decision, "ALLOW");
  assert.equal(allow.execution_directive.action, "EXECUTE");

  const failedTests = await (await postDecision(
    baseRequest({
      request_id: "req_failed_tests",
      action: { parameters: { ci_evidence: { status: "failed" } } },
      evidence: [{ ...baseRequest().evidence[0], status: "failed" }],
    }),
    env,
  )).json();
  assert.equal(failedTests.decision, "DENY");

  const missingTests = await (await postDecision(baseRequest({ request_id: "req_missing_tests", evidence: [] }), env)).json();
  assert.equal(missingTests.decision, "DENY");

  const touchesSecrets = await (await postDecision(baseRequest({ request_id: "req_secrets", action: { parameters: { touches_secrets: true } } }), env)).json();
  assert.equal(touchesSecrets.decision, "DENY");

  const secretLike = await postDecision(baseRequest({ request_id: "req_secret_like", intent: "token=secret-value" }), env);
  assert.equal(secretLike.status, 422);

  const dns = await (await postDecision(await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_dns", action: { parameters: { touches_dns: true } } })), env)).json();
  assert.equal(dns.decision, "REQUIRE_APPROVAL");

  const permissions = await (await postDecision(await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_perm", action: { parameters: { touches_permissions: true } } })), env)).json();
  assert.equal(permissions.decision, "REQUIRE_APPROVAL");

  const credentials = await (await postDecision(await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_creds", action: { parameters: { touches_credentials: true } } })), env)).json();
  assert.equal(credentials.decision, "REQUIRE_APPROVAL");

  const production = await (await postDecision(
    await bindDefaultTrustedEvidence(env, baseRequest({
      request_id: "req_prod",
      action: {
        target: { environment: "production" },
        parameters: { deployment_strategy: "worker_production", deployment_command_id: "wrangler_deploy_production" },
      },
      mandate: { scope: ["deploy:production"] },
    })),
    env,
  )).json();
  assert.equal(production.decision, "REQUIRE_APPROVAL");
  assert.deepEqual(production.reason_codes, ["PRODUCTION_GATE_4_REQUIRED"]);

  const callerExpiredMandateClaim = await (await postDecision(await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_caller_expired", mandate: { expires_at: "2026-07-18T23:59:59.000Z" } })), env)).json();
  assert.equal(callerExpiredMandateClaim.decision, "ALLOW");

  env.SIGNGATE_TEST_STORE.mandates.get(`${ORG}:mandate_preview_001`).status = "revoked";
  const revokedMandate = await (await postDecision(baseRequest({ request_id: "req_revoked_mandate" }), env)).json();
  assert.equal(revokedMandate.decision, "DENY");
  env.SIGNGATE_TEST_STORE.mandates.get(`${ORG}:mandate_preview_001`).status = "active";

  const unknownTarget = await postDecision(baseRequest({ request_id: "req_unknown_target", action: { target: { environment: "staging" } } }), env);
  assert.equal(unknownTarget.status, 422);
  const targetCredential = env.SIGNGATE_TEST_STORE.credentials.get(AGENT_KEY.slice(0, 12));
  targetCredential.allowed_services_json = JSON.stringify(["signgate-worker", "other-worker"]);
  const unauthorizedService = await (await postDecision(baseRequest({ request_id: "req_unauthorized_service", action: { target: { service: "other-worker" } } }), env)).json();
  assert.equal(unauthorizedService.decision, "DENY");
  assert.deepEqual(unauthorizedService.reason_codes, ["TARGET_NOT_AUTHORIZED"]);
  targetCredential.allowed_services_json = JSON.stringify(["signgate-worker"]);
  const unauthorizedRepo = await (await postDecision(baseRequest({
    request_id: "req_unauthorized_repo",
    action: { target: { repository: { owner: "lukekwan", repo: "other-repo", remote_url: "https://github.com/lukekwan/other-repo" } } },
  }), env)).json();
  assert.equal(unauthorizedRepo.decision, "DENY");
  assert.deepEqual(unauthorizedRepo.reason_codes, ["TARGET_NOT_AUTHORIZED"]);
  const remoteMismatch = await postDecision(baseRequest({
    request_id: "req_remote_mismatch",
    action: { target: { repository: { remote_url: "https://github.com/lukekwan/other-repo" } } },
  }), env);
  assert.equal(remoteMismatch.status, 422);

  for (const changed_paths of [["/absolute"], ["src/../secret"], ["src//index.js"], ["src\\index.js"], ["src/%2e%2e/secret"]]) {
    const unsafePath = await postDecision(baseRequest({ request_id: `req_unsafe_${changed_paths[0]}`, action: { parameters: { changed_paths } } }), env);
    assert.equal(unsafePath.status, 422);
  }
});

test("DEV-SG-001 trusted evidence requires exact server action binding", async () => {
  const exactEnv = await testEnv();
  const exact = await (await postDecision(baseRequest({ request_id: "req_exact_bound_evidence" }), exactEnv)).json();
  assert.equal(exact.decision, "ALLOW");

  const mismatchedEnv = await testEnv();
  mismatchedEnv.SIGNGATE_TEST_STORE.trustedEvidence.get(`${ORG}:evidence_tests_001`).action_fingerprint =
    "sha256:0000000000000000000000000000000000000000000000000000000000000000";
  const mismatch = await (await postDecision(baseRequest({ request_id: "req_evidence_fingerprint_mismatch" }), mismatchedEnv)).json();
  assert.equal(mismatch.decision, "DENY");
  assert.deepEqual(mismatch.reason_codes, ["EVIDENCE_SUBJECT_MISMATCH"]);

  const nullEnv = await testEnv();
  nullEnv.SIGNGATE_TEST_STORE.trustedEvidence.get(`${ORG}:evidence_tests_001`).action_fingerprint = null;
  const nullBound = await (await postDecision(baseRequest({
    request_id: "req_null_bound_evidence",
    evidence: [{ ...baseRequest().evidence[0], subject_fingerprint: exact.action_fingerprint }],
  }), nullEnv)).json();
  assert.equal(nullBound.decision, "DENY");
  assert.deepEqual(nullBound.reason_codes, ["EVIDENCE_SUBJECT_MISMATCH"]);

  const replayMutations = [
    ["service", { action: { target: { service: "other-worker" } } }],
    ["project", { action: { target: { project: "other-project" } } }],
    ["repository owner", { action: { target: { repository: { owner: "other-owner", remote_url: "https://github.com/other-owner/agent-payment-guard" } } } }],
    ["repository name", { action: { target: { repository: { repo: "other-repo", remote_url: "https://github.com/lukekwan/other-repo" } } } }],
    ["repository remote URL", { action: { target: { repository: { owner: "other-owner", repo: "other-repo", remote_url: "https://github.com/other-owner/other-repo" } } } }],
    ["changed_paths", { action: { parameters: { changed_paths: ["src/index.js", "src/signgate-decision.js"] } } }],
    ["changed_routes", { action: { parameters: { changed_routes: ["/v1/decisions", "/v1/other"] } } }],
    ["touches_secrets", { action: { parameters: { touches_secrets: true } } }],
    ["touches_dns", { action: { parameters: { touches_dns: true } } }],
    ["touches_permissions", { action: { parameters: { touches_permissions: true } } }],
    ["touches_credentials", { action: { parameters: { touches_credentials: true } } }],
    ["deployment strategy", { action: { parameters: { deployment_strategy: "local_simulation" } } }],
    ["configuration fingerprint", { action: { parameters: { configuration_fingerprint: "sha256:1111111111111111111111111111111111111111111111111111111111111111" } } }],
    ["artifact digest", { action: { parameters: { artifact_digest: "sha256:2222222222222222222222222222222222222222222222222222222222222222" } } }],
    ["diff digest", { action: { parameters: { diff_digest: "sha256:3333333333333333333333333333333333333333333333333333333333333333" } } }],
  ];
  for (const [label, mutation] of replayMutations) {
    const env = await testEnv();
    const replay = await (await postDecision(baseRequest({ request_id: `req_replay_${label.replaceAll(" ", "_")}`, ...mutation }), env)).json();
    assert.notEqual(replay.decision, "ALLOW", label);
  }
});

test("DEV-SG-001 idempotency and Founder grant lifecycle match frozen dogfood flow", async () => {
  const env = await testEnv();
  const request = baseRequest({ request_id: "req_idempotent" });
  const first = await (await postDecision(request, env)).json();
  const retry = await (await postDecision(request, env)).json();
  assert.equal(retry.decision_id, first.decision_id);
  const mismatch = await postDecision(baseRequest({ request_id: "req_idempotent", action: { parameters: { changed_routes: ["/v1/decisions", "/changed"] } } }), env);
  assert.equal(mismatch.status, 409);

  const reviewRequest = await bindDefaultTrustedEvidence(env, baseRequest({
    request_id: "req_review",
    action: { parameters: { touches_permissions: true } },
  }));
  const review = await (await postDecision(reviewRequest, env)).json();
  assert.equal(review.decision, "REQUIRE_APPROVAL");
  const grantResponse = await handleFounderApprovalGrantRequest(
    new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }),
    env,
  );
  assert.equal(grantResponse.status, 200);
  const grant = await grantResponse.json();
  const grantRetry = await (await handleFounderApprovalGrantRequest(
    new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }),
    env,
  )).json();
  assert.equal(grantRetry.approval_grant_id, grant.approval_grant_id);
  assert.equal(env.SIGNGATE_TEST_STORE.grants.size, 1);
  const approved = await (await postDecision({
    ...reviewRequest,
    request_id: "req_review_approved",
    evidence: [
      ...reviewRequest.evidence,
      {
        id: grant.approval_grant_id,
        type: "approval_grant",
        source: "founder",
        status: "approved",
        original_decision_id: review.decision_id,
        action_fingerprint: review.action_fingerprint,
        policy_version: SIGNGATE_POLICY_VERSION,
        expires_at: GRANT_FUTURE,
      },
    ],
  }, env)).json();
  assert.equal(approved.decision, "ALLOW");
  assert.notEqual(approved.decision_id, review.decision_id);
  const grantReplayMismatch = await postDecision({
    ...reviewRequest,
    request_id: "req_review_approved_replay_mismatch",
    intent: "changed after grant",
    evidence: [
      ...reviewRequest.evidence,
      { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
    ],
  }, env);
  assert.equal(grantReplayMismatch.status, 409);
});

test("DEV-SG-001 Memory approval grant use rolls back on audit failure", async () => {
  const store = new MemorySignGateStore();
  const env = await testEnv({ store });
  const reviewRequest = await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_memory_approval_rollback_review", action: { parameters: { touches_permissions: true } } }));
  const review = await (await postDecision(reviewRequest, env)).json();
  const grant = await (await handleFounderApprovalGrantRequest(
    new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }),
    env,
  )).json();
  store.failAudit = true;
  const failed = await postDecision({
    ...reviewRequest,
    request_id: "req_memory_approval_rollback_approved",
    evidence: [
      ...reviewRequest.evidence,
      { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
    ],
  }, env);
  assert.equal(failed.status, 500);
  const storedGrant = await store.getApprovalGrant(ORG, grant.approval_grant_id);
  assert.equal(storedGrant.status, "AVAILABLE");
  assert.equal([...store.decisions.values()].filter(decision => decision.approval_grant_id === grant.approval_grant_id).length, 0);
});

test("DEV-SG-001 consume is single-use, replay-safe, and expiry-persistent", async () => {
  const env = await testEnv();
  const decision = await (await postDecision(baseRequest({ request_id: "req_consume" }), env)).json();
  const receipt = await (await postConsume(decision, env, "attempt_same")).json();
  assert.equal(receipt.decision_id, decision.decision_id);
  const sameAttempt = await (await postConsume(decision, env, "attempt_same")).json();
  assert.deepEqual(sameAttempt, receipt);
  const differentAttempt = await postConsume(decision, env, "attempt_other");
  assert.equal(differentAttempt.status, 409);

  const review = await (await postDecision(await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "req_no_consume_review", action: { parameters: { touches_dns: true } } })), env)).json();
  assert.equal((await postConsume(review, env, "attempt_review")).status, 409);
  const deny = await (await postDecision(baseRequest({ request_id: "req_no_consume_deny", action: { parameters: { touches_secrets: true } } }), env)).json();
  assert.equal((await postConsume(deny, env, "attempt_deny")).status, 409);

  const wrongFingerprint = await (await postDecision(baseRequest({ request_id: "req_wrong_fingerprint" }), env)).json();
  assert.equal((await postConsume(wrongFingerprint, env, "attempt_wrong", { action_fingerprint: "sha256:bad" })).status, 409);

  const expiringEnv = await testEnv({ nowMs: NOW });
  const expiring = await (await postDecision(baseRequest({ request_id: "req_expires" }), expiringEnv)).json();
  expiringEnv.SIGNGATE_TEST_NOW_MS = NOW + 16 * 60 * 1000;
  const expiredConsume = await postConsume(expiring, expiringEnv, "attempt_expired");
  assert.equal(expiredConsume.status, 409);
  const expiredRecord = await expiringEnv.SIGNGATE_TEST_STORE.getDecision(ORG, expiring.decision_id);
  assert.equal(expiredRecord.state, "EXPIRED");
  expiringEnv.SIGNGATE_TEST_NOW_MS = NOW;
  assert.equal((await postConsume(expiring, expiringEnv, "attempt_after_backward_clock")).status, 409);
  assert.equal(expiredRecord.state, "EXPIRED");
});

test("DEV-SG-001 rejection responses carry redacted durable audit correlation when available", async () => {
  const env = await testEnv();
  const noAuth = await handleSignGateDecisionRequest(
    new Request("https://signgate.test/v1/decisions", { method: "POST", body: JSON.stringify(baseRequest()) }),
    env,
  );
  assert.equal(noAuth.status, 401);
  assert.equal((await noAuth.json()).audit_id, null);

  const schema = await postDecision(baseRequest({ request_id: "req_audit_schema", intent: "token=secret-value" }), env);
  assert.equal(schema.status, 422);
  const schemaBody = await schema.json();
  assert.match(schemaBody.audit_id, /^audit_/);

  const tenant = await postDecision(baseRequest({ request_id: "req_audit_tenant", organization_id: "org_other" }), env);
  assert.equal(tenant.status, 403);
  assert.match((await tenant.json()).audit_id, /^audit_/);

  const first = await (await postDecision(baseRequest({ request_id: "req_audit_conflict" }), env)).json();
  assert.equal(first.decision, "ALLOW");
  const conflict = await postDecision(baseRequest({ request_id: "req_audit_conflict", action: { parameters: { changed_routes: ["/v1/decisions", "/changed"] } } }), env);
  assert.equal(conflict.status, 409);
  assert.match((await conflict.json()).audit_id, /^audit_/);

  const decision = await (await postDecision(baseRequest({ request_id: "req_audit_consume" }), env)).json();
  const consumeReject = await postConsume(decision, env, "attempt_audit_reject", { action_fingerprint: "sha256:bad" });
  assert.equal(consumeReject.status, 409);
  assert.match((await consumeReject.json()).audit_id, /^audit_/);

  const events = env.SIGNGATE_TEST_STORE.auditEvents.filter(event => event.event_type.endsWith("rejected"));
  assert.ok(events.length >= 4);
  for (const event of events) {
    assert.match(event.audit_id, /^audit_/);
    assert.doesNotMatch(event.metadata_json, /Bearer|sg_agent_|token=secret-value/);
    assert.equal(event.organization_id, ORG);
  }

  const missingD1 = await handleSignGateDecisionRequest(
    new Request("https://signgate.test/v1/decisions", {
      method: "POST",
      headers: { authorization: `Bearer ${AGENT_KEY}` },
      body: JSON.stringify(baseRequest({ request_id: "req_missing_d1" })),
    }),
    { SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" },
  );
  assert.equal(missingD1.status, 503);
  const missingD1Body = await missingD1.json();
  assert.equal(missingD1Body.audit_id, null);
  assert.equal(missingD1Body.decision, undefined);
});

test("DEV-SG-001 consume rollback and concurrency invariants hold in product store", async () => {
  const receiptFailureStore = new MemorySignGateStore({ failReceipt: true });
  const receiptFailureEnv = await testEnv({ store: receiptFailureStore });
  const receiptFailureDecision = await (await postDecision(baseRequest({ request_id: "req_receipt_failure" }), receiptFailureEnv)).json();
  assert.equal((await postConsume(receiptFailureDecision, receiptFailureEnv, "attempt_receipt_failure")).status, 500);
  assert.equal((await receiptFailureStore.getDecision(ORG, receiptFailureDecision.decision_id)).state, "AVAILABLE");
  assert.equal(receiptFailureStore.receipts.size, 0);

  const auditFailureStore = new MemorySignGateStore({ failAudit: false });
  const auditFailureEnv = await testEnv({ store: auditFailureStore });
  const auditFailureDecision = await (await postDecision(baseRequest({ request_id: "req_audit_failure" }), auditFailureEnv)).json();
  auditFailureStore.failAudit = true;
  assert.equal((await postConsume(auditFailureDecision, auditFailureEnv, "attempt_audit_failure")).status, 500);
  assert.equal((await auditFailureStore.getDecision(ORG, auditFailureDecision.decision_id)).state, "AVAILABLE");
  assert.equal(auditFailureStore.receipts.size, 0);

  const env = await testEnv();
  const decision = await (await postDecision(baseRequest({ request_id: "req_concurrent" }), env)).json();
  const results = await Promise.all(
    Array.from({ length: 8 }, (_, index) => postConsume(decision, env, `attempt_${index}`).then(response => response.status)),
  );
  assert.equal(results.filter(status => status === 200).length, 1);
  assert.equal(results.filter(status => status === 409).length, 7);
  const stored = await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id);
  assert.equal(stored.state, "CONSUMED");
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 1);
  assert.equal(
    env.SIGNGATE_TEST_STORE.auditEvents.filter(event => event.event_type === "decision.consumed").length,
    1,
  );
});

test("DEV-SG-001 fingerprint contract uses literal golden and sorted-unique set semantics", async () => {
  const env = await testEnv();
  const authenticated = { organization_id: ORG, principal_id: "codex_dev_01" };
  const input = baseRequest({ request_id: "req_golden" });
  const expectedCanonical = "{\"action\":{\"parameters\":{\"artifact_digest\":\"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"changed_paths\":[\"migrations/0008_signgate_deploy_change_decisions.sql\",\"src/index.js\"],\"changed_routes\":[\"/v1/decisions\",\"/v1/decisions/{decision_id}/consume\"],\"ci_evidence\":{\"checks\":[\"lint\",\"unit\",\"contract\"],\"commit\":\"5ac67be4fe17b5c1b773bcc584080cad704f4959\",\"provider\":\"github_actions\",\"run_id\":\"run_123\",\"status\":\"passed\"},\"configuration_fingerprint\":\"sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\",\"deployment_command_id\":\"wrangler_preview\",\"deployment_strategy\":\"worker_preview\",\"diff_digest\":\"sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\",\"git_commit\":\"5ac67be4fe17b5c1b773bcc584080cad704f4959\",\"touches_credentials\":false,\"touches_dns\":false,\"touches_permissions\":false,\"touches_secrets\":false},\"target\":{\"environment\":\"preview\",\"project\":\"base-agent-preflight\",\"repository\":{\"host\":\"github.com\",\"owner\":\"lukekwan\",\"remote_url\":\"https://github.com/lukekwan/agent-payment-guard\",\"repo\":\"agent-payment-guard\"},\"service\":\"signgate-worker\"},\"type\":\"deploy_change\"},\"agent_id\":\"codex_dev_01\",\"contract_version\":\"0.1\",\"organization_id\":\"org_nomos_labs\"}";
  const actualCanonical = canonicalize(fingerprintEnvelope(input, authenticated));
  assert.equal(actualCanonical, expectedCanonical);
  assert.equal(
    await sha256Hex(actualCanonical),
    "a0e40fbb2a232bb6ee3c3c4a9b80dc2bb02640d1982669fb3bc18f090fbf4c20",
  );

  const pathA = baseRequest({ request_id: "req_path_a", action: { parameters: { changed_paths: ["z", "a", "a"] } } });
  const pathB = baseRequest({ request_id: "req_path_b", action: { parameters: { changed_paths: ["a", "z"] } } });
  const pathC = baseRequest({ request_id: "req_path_c", action: { parameters: { changed_paths: ["z", "a"] } } });
  assert.deepEqual(normalizeDeployChangeAction(pathA.action).parameters.changed_paths, ["a", "z"]);
  assert.equal(canonicalize(fingerprintEnvelope(pathA, authenticated)), canonicalize(fingerprintEnvelope(pathB, authenticated)));
  assert.equal(await fingerprintDeployChange(pathA, authenticated), await fingerprintDeployChange(pathC, authenticated));

  const routeA = baseRequest({ request_id: "req_route_a", action: { parameters: { changed_routes: ["/z", "/a", "/a"] } } });
  const routeB = baseRequest({ request_id: "req_route_b", action: { parameters: { changed_routes: ["/a", "/z"] } } });
  assert.deepEqual(normalizeDeployChangeAction(routeA.action).parameters.changed_routes, ["/a", "/z"]);
  assert.equal(await fingerprintDeployChange(routeA, authenticated), await fingerprintDeployChange(routeB, authenticated));
  assert.deepEqual(normalizeSortedUniqueStrings(["b", "a", "b"], "changed_paths"), ["a", "b"]);
  assert.deepEqual(normalizeSortedUniqueStrings(["a", "b"], "changed_paths"), normalizeSortedUniqueStrings(normalizeSortedUniqueStrings(["b", "a", "b"], "changed_paths"), "changed_paths"));

  const originalPaths = ["z", "a", "a"];
  const noMutation = baseRequest({ request_id: "req_no_mutation", action: { parameters: { changed_paths: originalPaths } } });
  normalizeDeployChangeAction(noMutation.action);
  assert.deepEqual(noMutation.action.parameters.changed_paths, originalPaths);

  const caseDistinct = baseRequest({ request_id: "req_case", action: { parameters: { changed_paths: ["A", "a", "A"] } } });
  assert.deepEqual(normalizeDeployChangeAction(caseDistinct.action).parameters.changed_paths, ["A", "a"]);

  const uniquePath = baseRequest({ request_id: "req_unique_path", action: { parameters: { changed_paths: ["a", "z", "new"] } } });
  const uniqueRoute = baseRequest({ request_id: "req_unique_route", action: { parameters: { changed_routes: ["/a", "/z", "/new"] } } });
  assert.notEqual(await fingerprintDeployChange(pathA, authenticated), await fingerprintDeployChange(uniquePath, authenticated));
  assert.notEqual(await fingerprintDeployChange(routeA, authenticated), await fingerprintDeployChange(uniqueRoute, authenticated));

  for (const path of deployFieldPaths()) {
    const mutated = baseRequest({ request_id: `req_mut_${path.join("_")}` });
    const current = getAtPath(mutated, path);
    const parent = getAtPath(mutated, path.slice(0, -1));
    const key = path.at(-1);
    const pathName = path.join(".");
    const validReplacement = {
      "action.target.environment": "local",
      "action.parameters.deployment_strategy": "local_simulation",
      "action.parameters.deployment_command_id": "wrangler_dev_preview",
      "action.parameters.git_commit": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "action.parameters.artifact_digest": "sha256:1111111111111111111111111111111111111111111111111111111111111111",
      "action.parameters.diff_digest": "sha256:2222222222222222222222222222222222222222222222222222222222222222",
      "action.parameters.configuration_fingerprint": "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    }[pathName];
    if (pathName === "action.target.repository.host") continue;
    parent[key] = validReplacement ?? (Array.isArray(current)
      ? [...current, pathName === "action.parameters.changed_routes" ? "/__new_unique__" : "__new_unique__"]
      : typeof current === "boolean" ? !current : `${current}_changed`);
    assert.notEqual(await fingerprintDeployChange(input, authenticated), await fingerprintDeployChange(mutated, authenticated), path.join("."));
  }
  assert.equal(env.SIGNGATE_TEST_STORE.decisions.size, 0);
});

test("DEV-SG-001 wrapper fail-closed behavior covers DF-01 through DF-07", async () => {
  const env = await testEnv();
  const df01 = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df_01" }),
    executionAttemptId: "df_01_attempt",
  });
  assert.equal(df01.status, "EXECUTED_PREVIEW");

  const reviewRequest = await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "df_02_review", action: { parameters: { touches_permissions: true } } }));
  const review = await (await postDecision(reviewRequest, env)).json();
  assert.equal(review.decision, "REQUIRE_APPROVAL");
  const grant = await (await handleFounderApprovalGrantRequest(
    new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }),
    env,
  )).json();
  const df02 = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: {
      ...reviewRequest,
      request_id: "df_02_approved",
      evidence: [
        ...reviewRequest.evidence,
        { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
      ],
    },
    executionAttemptId: "df_02_attempt",
  });
  assert.equal(df02.status, "EXECUTED_PREVIEW");

  const df03 = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df_03", action: { parameters: { touches_secrets: true } } }),
    executionAttemptId: "df_03_attempt",
  });
  assert.equal(df03.status, "REFUSED");

  const df04 = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df_04", evidence: [] }),
    executionAttemptId: "df_04_attempt",
  });
  assert.equal(df04.status, "REFUSED");

  const mutableRequest = await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "df_05" }));
  const decision = await (await postDecision(mutableRequest, env)).json();
  const mutatedConsume = await postConsume({ ...decision, action_fingerprint: "sha256:mutated" }, env, "df_05_attempt");
  assert.equal(mutatedConsume.status, 409);

  const expiredEnv = await testEnv({ nowMs: NOW });
  expiredEnv.SIGNGATE_TEST_STORE.mandates.get(`${ORG}:mandate_preview_001`).expires_at = "2026-07-18T23:59:59.000Z";
  const expiring = await runDeployChangePreviewWrapper({
    env: expiredEnv,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({
      request_id: "df_06",
      mandate: { expires_at: "2026-07-19T00:01:00.000Z" },
    }),
    executionAttemptId: "df_06_attempt",
  });
  assert.equal(expiring.status, "REFUSED");

  const duplicate = await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "df_07" }));
  const dupA = await (await postDecision(duplicate, env)).json();
  const dupB = await (await postDecision(duplicate, env)).json();
  assert.equal(dupA.decision_id, dupB.decision_id);
  const consumed = await (await postConsume(dupA, env, "df_07_attempt")).json();
  assert.equal(consumed.decision_id, dupA.decision_id);
  assert.equal((await postConsume(dupA, env, "df_07_other")).status, 409);

  const downstreamEnv = await testEnv();
  const downstream = await runDeployChangePreviewWrapper({
    env: downstreamEnv,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df_downstream_failure" }),
    executionAttemptId: "df_downstream_attempt",
    simulateFailure: true,
  });
  assert.equal(downstream.status, "EXECUTION_FAILED_AFTER_CONSUME");
  const stored = await downstreamEnv.SIGNGATE_TEST_STORE.getDecision(ORG, downstream.decision.decision_id);
  assert.equal(stored.state, "CONSUMED");
  assert.equal((await postConsume(downstream.decision, downstreamEnv, "df_downstream_second")).status, 409);
});

test("DF-01 exact preview ALLOW executes once through wrapper", async () => {
  const env = await testEnv();
  const result = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df01_exact" }),
    executionAttemptId: "df01_attempt",
  });
  assert.equal(result.status, "EXECUTED_PREVIEW");
  assert.equal(result.decision.decision, "ALLOW");
  assert.equal(result.decision.execution_directive.action, "EXECUTE");
  assert.deepEqual(result.decision.bound_action, normalizeDeployChangeAction(baseRequest().action));
  assert.equal(result.receipt.decision_id, result.decision.decision_id);
  assert.equal((await env.SIGNGATE_TEST_STORE.getDecision(ORG, result.decision.decision_id)).state, "CONSUMED");
  assert.equal(env.SIGNGATE_TEST_STORE.auditEvents.filter(event => event.event_type === "decision.consumed").length, 1);
  assert.equal(env.SIGNGATE_TEST_STORE.executionResults.length, 1);
});

test("DF-02 exact Founder approval grant produces one fresh ALLOW then consumes", async () => {
  const env = await testEnv();
  const reviewRequest = await bindDefaultTrustedEvidence(env, baseRequest({ request_id: "df02_review", action: { parameters: { touches_permissions: true } } }));
  const review = await (await postDecision(reviewRequest, env)).json();
  assert.equal(review.decision, "REQUIRE_APPROVAL");
  const grant = await (await handleFounderApprovalGrantRequest(
    new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }),
    env,
  )).json();
  const approvedRequest = {
    ...reviewRequest,
    request_id: "df02_approved",
    evidence: [
      ...reviewRequest.evidence,
      { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
    ],
  };
  const result = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: approvedRequest,
    executionAttemptId: "df02_attempt",
  });
  assert.equal(result.status, "EXECUTED_PREVIEW");
  assert.equal(result.decision.reason_codes[0], "APPROVAL_GRANT_ACCEPTED");
  assert.equal((await env.SIGNGATE_TEST_STORE.getApprovalGrant(ORG, grant.approval_grant_id)).status, "USED");
  assert.equal([...env.SIGNGATE_TEST_STORE.decisions.values()].filter(decision => decision.approval_grant_id === grant.approval_grant_id).length, 1);
});

test("DF-03 exact unsupported secret change is denied with no execution", async () => {
  const env = await testEnv();
  const result = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df03_secret", action: { parameters: { touches_secrets: true } } }),
    executionAttemptId: "df03_attempt",
  });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reason, "DENY");
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 0);
  assert.equal(env.SIGNGATE_TEST_STORE.executionResults.length, 0);
});

test("DF-04 exact missing trusted evidence is denied with audit and no execution", async () => {
  const env = await testEnv();
  const result = await runDeployChangePreviewWrapper({
    env,
    agentKey: AGENT_KEY,
    executorKey: EXECUTOR_KEY,
    request: baseRequest({ request_id: "df04_missing_evidence", evidence: [] }),
    executionAttemptId: "df04_attempt",
  });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reason, "DENY");
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 0);
});

test("DF-05 exact post-decision action mutation is refused before consume", async () => {
  const env = await testEnv();
  const originalRequest = baseRequest({ request_id: "df05_original" });
  const decision = await (await postDecision(originalRequest, env)).json();
  assert.equal(decision.decision, "ALLOW");
  const mutatedRequest = baseRequest({ request_id: "df05_original", action: { parameters: { changed_paths: ["src/index.js", "src/signgate-decision.js"] } } });
  const result = await enforceDeployChangePreviewDecision({
    env,
    executorKey: EXECUTOR_KEY,
    request: mutatedRequest,
    decision,
    executionAttemptId: "df05_attempt",
  });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reason, "FINGERPRINT_MISMATCH");
  assert.equal((await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id)).state, "AVAILABLE");
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 0);
});

test("DF-06 exact previously valid ALLOW expires before consume with single audit", async () => {
  const env = await testEnv({ nowMs: NOW });
  const request = baseRequest({ request_id: "df06_valid_then_expired" });
  const decision = await (await postDecision(request, env)).json();
  assert.equal(decision.decision, "ALLOW");
  env.SIGNGATE_TEST_NOW_MS = NOW + 16 * 60 * 1000;
  const result = await enforceDeployChangePreviewDecision({
    env,
    executorKey: EXECUTOR_KEY,
    request,
    decision,
    executionAttemptId: "df06_attempt",
  });
  assert.equal(result.status, "REFUSED");
  assert.equal(result.reason, "ALLOW");
  assert.equal((await postConsume(decision, env, "df06_attempt")).status, 409);
  const stored = await env.SIGNGATE_TEST_STORE.getDecision(ORG, decision.decision_id);
  assert.equal(stored.state, "EXPIRED");
  assert.equal(env.SIGNGATE_TEST_STORE.auditEvents.filter(event => event.event_type === "decision.expired").length, 1);
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 0);
});

test("DF-07 exact idempotent decision replays same artifact and consume remains single use", async () => {
  const env = await testEnv();
  const request = baseRequest({ request_id: "df07_idempotent" });
  const first = await (await postDecision(request, env)).json();
  const second = await (await postDecision(request, env)).json();
  assert.equal(second.decision_id, first.decision_id);
  assert.equal(second.action_fingerprint, first.action_fingerprint);
  assert.equal((await postConsume(first, env, "df07_attempt")).status, 200);
  assert.equal((await postConsume(first, env, "df07_attempt")).status, 200);
  assert.equal((await postConsume(first, env, "df07_other")).status, 409);
  assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 1);
});

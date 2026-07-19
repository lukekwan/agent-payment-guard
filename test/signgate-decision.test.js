import test from "node:test";
import assert from "node:assert/strict";
import canonicalize from "canonicalize";

import {
  SIGNGATE_CONTRACT_VERSION,
  SIGNGATE_POLICY_VERSION,
  MemorySignGateStore,
  createPreviewCredential,
  deployFieldPaths,
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
  await store.createTrustedEvidence({
    organization_id: ORG,
    evidence_id: "evidence_tests_001",
    provider: "github_actions",
    status: "passed",
    commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
    subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
    action_fingerprint: null,
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
  agentCredential.rotation_expires_at = "2026-07-19T00:05:00.000Z";
  assert.equal((await postDecision(baseRequest({ request_id: "req_rotating_key" }), env)).status, 200);
  agentCredential.rotation_expires_at = "2026-07-18T23:59:59.000Z";
  assert.equal((await postDecision(baseRequest({ request_id: "req_expired_rotating_key" }), env)).status, 401);
  agentCredential.status = "active";
  agentCredential.rotation_expires_at = null;
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

  const dns = await (await postDecision(baseRequest({ request_id: "req_dns", action: { parameters: { touches_dns: true } } }), env)).json();
  assert.equal(dns.decision, "REQUIRE_APPROVAL");

  const permissions = await (await postDecision(baseRequest({ request_id: "req_perm", action: { parameters: { touches_permissions: true } } }), env)).json();
  assert.equal(permissions.decision, "REQUIRE_APPROVAL");

  const credentials = await (await postDecision(baseRequest({ request_id: "req_creds", action: { parameters: { touches_credentials: true } } }), env)).json();
  assert.equal(credentials.decision, "REQUIRE_APPROVAL");

  const production = await (await postDecision(
    baseRequest({
      request_id: "req_prod",
      action: {
        target: { environment: "production" },
        parameters: { deployment_strategy: "worker_production", deployment_command_id: "wrangler_deploy_production" },
      },
      mandate: { scope: ["deploy:production"] },
    }),
    env,
  )).json();
  assert.equal(production.decision, "REQUIRE_APPROVAL");
  assert.deepEqual(production.reason_codes, ["PRODUCTION_GATE_4_REQUIRED"]);

  const callerExpiredMandateClaim = await (await postDecision(baseRequest({ request_id: "req_caller_expired", mandate: { expires_at: "2026-07-18T23:59:59.000Z" } }), env)).json();
  assert.equal(callerExpiredMandateClaim.decision, "ALLOW");

  env.SIGNGATE_TEST_STORE.mandates.get(`${ORG}:mandate_preview_001`).status = "revoked";
  const revokedMandate = await (await postDecision(baseRequest({ request_id: "req_revoked_mandate" }), env)).json();
  assert.equal(revokedMandate.decision, "DENY");
  env.SIGNGATE_TEST_STORE.mandates.get(`${ORG}:mandate_preview_001`).status = "active";

  const unknownTarget = await postDecision(baseRequest({ request_id: "req_unknown_target", action: { target: { environment: "staging" } } }), env);
  assert.equal(unknownTarget.status, 422);

  for (const changed_paths of [["/absolute"], ["src/../secret"], ["src//index.js"], ["src\\index.js"], ["src/%2e%2e/secret"]]) {
    const unsafePath = await postDecision(baseRequest({ request_id: `req_unsafe_${changed_paths[0]}`, action: { parameters: { changed_paths } } }), env);
    assert.equal(unsafePath.status, 422);
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

  const reviewRequest = baseRequest({
    request_id: "req_review",
    action: { parameters: { touches_permissions: true } },
  });
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

test("DEV-SG-001 consume is single-use, replay-safe, and expiry-persistent", async () => {
  const env = await testEnv();
  const decision = await (await postDecision(baseRequest({ request_id: "req_consume" }), env)).json();
  const receipt = await (await postConsume(decision, env, "attempt_same")).json();
  assert.equal(receipt.decision_id, decision.decision_id);
  const sameAttempt = await (await postConsume(decision, env, "attempt_same")).json();
  assert.deepEqual(sameAttempt, receipt);
  const differentAttempt = await postConsume(decision, env, "attempt_other");
  assert.equal(differentAttempt.status, 409);

  const review = await (await postDecision(baseRequest({ request_id: "req_no_consume_review", action: { parameters: { touches_dns: true } } }), env)).json();
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

  const reviewRequest = baseRequest({ request_id: "df_02_review", action: { parameters: { touches_permissions: true } } });
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

  const mutableRequest = baseRequest({ request_id: "df_05" });
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

  const duplicate = baseRequest({ request_id: "df_07" });
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";

import {
  SIGNGATE_CONTRACT_VERSION,
  SIGNGATE_POLICY_VERSION,
  D1SignGateStore,
  cleanupSignGatePreviewRetention,
  createPreviewCredential,
  fingerprintDeployChange,
  handleConsumeDecisionRequest,
  handleFounderApprovalGrantRequest,
  handleSignGateDecisionRequest,
} from "../src/signgate-decision.js";

const NOW = Date.parse("2026-07-19T00:00:00.000Z");
const ORG = "org_nomos_labs";
const AGENT_KEY = "sg_agent_abcdefghijklmnopqrstuvwxyz123456";
const EXECUTOR_KEY = "sg_exec_abcdefghijklmnopqrstuvwxyz123456";
const FOUNDER_KEY = "sg_founder_abcdefghijklmnopqrstuvwxyz123456";
const FUTURE = "2026-07-19T00:30:00.000Z";
const GRANT_FUTURE = "2026-07-19T00:10:00.000Z";

async function d1Env() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: { GUARD_DB: "signgate-smoke" },
  });
  const db = await mf.getD1Database("GUARD_DB");
  for (const statement of readFileSync(new URL("../migrations/0008_signgate_deploy_change_decisions.sql", import.meta.url), "utf8")
    .split(";")
    .map(sql => sql.trim())
    .filter(Boolean)) {
    await db.prepare(statement).run();
  }
  const store = new D1SignGateStore(db);
  const env = { GUARD_DB: db, SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" };
  for (const [rawKey, principalId, principalType, scopes] of [
    [AGENT_KEY, "codex_dev_01", "agent", ["decision:create:deploy_change"]],
    [EXECUTOR_KEY, "preview_executor_01", "executor", ["decision:consume:deploy_change"]],
    [FOUNDER_KEY, "founder_01", "founder_approver", ["approval:founder:deploy_change"]],
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
  for (const environment of ["preview"]) {
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
  const actionFingerprint = await fingerprintDeployChange(request("seed"), {
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
  return { env, db, store, mf };
}

function request(id, parameters = {}, evidence = []) {
  return {
    contract_version: SIGNGATE_CONTRACT_VERSION,
    request_id: id,
    organization_id: ORG,
    agent: { id: "codex_dev_01", type: "codex_developer", authenticated_by: "preview_api_key" },
    action: {
      type: "deploy_change",
      target: {
        environment: "preview",
        service: "signgate-worker",
        project: "base-agent-preflight",
        repository: { host: "github.com", owner: "lukekwan", repo: "agent-payment-guard", remote_url: "https://github.com/lukekwan/agent-payment-guard" },
      },
      parameters: {
        git_commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959",
        artifact_digest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        diff_digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        changed_paths: ["src/index.js"],
        changed_routes: ["/v1/decisions"],
        touches_secrets: false,
        touches_dns: false,
        touches_permissions: false,
        touches_credentials: false,
        deployment_strategy: "worker_preview",
        deployment_command_id: "wrangler_preview",
        configuration_fingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        ci_evidence: { provider: "github_actions", run_id: "run_123", commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959", status: "passed", checks: ["lint"] },
        ...parameters,
      },
    },
    intent: "Preview deploy SignGate",
    mandate: { id: "mandate_preview_001", scope: ["deploy:preview"], issued_by: "caller", expires_at: FUTURE },
    evidence: [
      { id: "evidence_tests_001", type: "test_result", source: "caller_claim", status: "passed", observed_at: "2026-07-18T23:59:00.000Z", subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" },
      ...evidence,
    ],
    context: { requested_at: new Date(NOW).toISOString() },
  };
}

async function postDecision(input, env) {
  const response = await handleSignGateDecisionRequest(new Request("https://signgate.test/v1/decisions", {
    method: "POST",
    headers: { authorization: `Bearer ${AGENT_KEY}` },
    body: JSON.stringify(input),
  }), env);
  return [response.status, await response.json()];
}

async function bindTrustedEvidence(db, input) {
  const actionFingerprint = await fingerprintDeployChange(input, {
    organization_id: ORG,
    principal_id: "codex_dev_01",
  });
  await db.prepare("UPDATE signgate_trusted_evidence SET action_fingerprint = ? WHERE organization_id = ? AND evidence_id = ?")
    .bind(actionFingerprint, ORG, "evidence_tests_001")
    .run();
  return input;
}

async function consume(decision, env, attempt) {
  const response = await handleConsumeDecisionRequest(new Request(`https://signgate.test/v1/decisions/${decision.decision_id}/consume`, {
    method: "POST",
    headers: { authorization: `Bearer ${EXECUTOR_KEY}` },
    body: JSON.stringify({
      contract_version: SIGNGATE_CONTRACT_VERSION,
      organization_id: ORG,
      action_fingerprint: decision.action_fingerprint,
      policy_version: decision.policy_version,
      execution_attempt_id: attempt,
    }),
  }), env, decision.decision_id);
  return [response.status, await response.json()];
}

test("DEV-SG-001 bounded product D1 smoke covers atomic consume, expiry, approval, and retention", async () => {
  const { env, db, store, mf } = await d1Env();
  try {
    const [, decision] = await postDecision(request("d1_allow"), env);
    assert.equal(decision.decision, "ALLOW");

    const [consumeStatus, receipt] = await consume(decision, env, "attempt_1");
    assert.equal(consumeStatus, 200);
    assert.equal(receipt.decision_id, decision.decision_id);
    assert.equal((await consume(decision, env, "attempt_1"))[0], 200);
    assert.equal((await consume(decision, env, "attempt_2"))[0], 409);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_consume_receipts WHERE decision_id = ?").bind(decision.decision_id).first()).count, 1);

    const [, concurrent] = await postDecision(request("d1_concurrent_consume"), env);
    const consumeStatuses = await Promise.all(
      Array.from({ length: 8 }, (_, index) => consume(concurrent, env, `concurrent_${index}`).then(([status]) => status)),
    );
    assert.equal(consumeStatuses.filter(status => status === 200).length, 1);
    assert.equal(consumeStatuses.filter(status => status === 409).length, 7);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_consume_receipts WHERE decision_id = ?").bind(concurrent.decision_id).first()).count, 1);

    const [, rollback] = await postDecision(request("d1_consume_rollback"), env);
    const rollbackResponse = await handleConsumeDecisionRequest(new Request(`https://signgate.test/v1/decisions/${rollback.decision_id}/consume`, {
      method: "POST",
      headers: { authorization: `Bearer ${EXECUTOR_KEY}` },
      body: JSON.stringify({
        contract_version: SIGNGATE_CONTRACT_VERSION,
        organization_id: ORG,
        action_fingerprint: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        policy_version: rollback.policy_version,
        execution_attempt_id: "rollback_wrong_fingerprint",
      }),
    }), env, rollback.decision_id);
    assert.equal(rollbackResponse.status, 409);
    assert.equal((await db.prepare("SELECT state FROM signgate_decisions WHERE decision_id = ?").bind(rollback.decision_id).first()).state, "AVAILABLE");
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_consume_receipts WHERE decision_id = ?").bind(rollback.decision_id).first()).count, 0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_audit_events WHERE decision_id = ? AND event_type = 'decision.consumed'").bind(rollback.decision_id).first()).count, 0);

    const [, expiring] = await postDecision(request("d1_expiry"), env);
    env.SIGNGATE_TEST_NOW_MS = NOW + 16 * 60 * 1000;
    const expiryStatuses = await Promise.all([consume(expiring, env, "expired_a"), consume(expiring, env, "expired_b")]);
    assert.deepEqual(expiryStatuses.map(([status]) => status), [409, 409]);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_audit_events WHERE decision_id = ? AND event_type = 'decision.expired'").bind(expiring.decision_id).first()).count, 1);
    env.SIGNGATE_TEST_NOW_MS = NOW;

    const reviewRequest = await bindTrustedEvidence(db, request("d1_review", { touches_permissions: true }));
    const [, review] = await postDecision(reviewRequest, env);
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
    assert.equal(grantResponse.status, 200);
    const grant = await grantResponse.json();
    const duplicateGrantResponses = await Promise.all(Array.from({ length: 8 }, () => handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    }), env).then(async response => [response.status, await response.json()])));
    assert.deepEqual(duplicateGrantResponses.map(([status]) => status), Array(8).fill(200));
    assert.equal(new Set(duplicateGrantResponses.map(([, body]) => body.approval_grant_id)).size, 1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_approval_grants WHERE original_decision_id = ?").bind(review.decision_id).first()).count, 1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_audit_events WHERE decision_id = ? AND event_type = 'approval_grant.created'").bind(review.decision_id).first()).count, 1);
    const deterministicRetry = await handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
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
    assert.equal(deterministicRetry.status, 200);
    assert.equal((await deterministicRetry.json()).approval_grant_id, grant.approval_grant_id);
    const changedGrantInput = await handleFounderApprovalGrantRequest(new Request("https://signgate.test/internal/dogfood/founder-approval-grants", {
      method: "POST",
      headers: { authorization: `Bearer ${FOUNDER_KEY}` },
      body: JSON.stringify({
        contract_version: SIGNGATE_CONTRACT_VERSION,
        organization_id: ORG,
        original_decision_id: review.decision_id,
        action_fingerprint: review.action_fingerprint,
        policy_version: SIGNGATE_POLICY_VERSION,
        approval_reason: "FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE",
        expires_at: "2026-07-19T00:09:00.000Z",
      }),
    }), env);
    assert.equal(changedGrantInput.status, 409);
    const [, approved] = await postDecision(request("d1_approved", { touches_permissions: true }, [
      { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
    ]), env);
    assert.equal(approved.decision, "ALLOW");
    assert.equal((await db.prepare("SELECT status FROM signgate_approval_grants WHERE approval_grant_id = ?").bind(grant.approval_grant_id).first()).status, "USED");
    const approvalReplayStatuses = [];
    for (const requestId of ["d1_approved_replay_a", "d1_approved_replay_b"]) {
      approvalReplayStatuses.push(await postDecision(request(requestId, { touches_permissions: true }, [
        { id: grant.approval_grant_id, type: "approval_grant", source: "founder", status: "approved", original_decision_id: review.decision_id },
      ]), env));
    }
    assert.deepEqual(approvalReplayStatuses.map(([status]) => status), [409, 409]);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM signgate_decisions WHERE approval_grant_id = ?").bind(grant.approval_grant_id).first()).count, 1);

    const cleanupBefore = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: NOW, batchSize: 10 });
    assert.equal(cleanupBefore.decisions, 0);
    assert.equal(cleanupBefore.credentials, 0);
    assert.equal(cleanupBefore.mandates, 0);
    assert.equal(cleanupBefore.authorized_targets, 0);
    const cleanupAfter = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 100 });
    assert.ok(cleanupAfter.audit_events >= 1);
    assert.ok(cleanupAfter.trusted_evidence >= 1);
    assert.equal(cleanupAfter.mandates, 1);
    assert.equal(cleanupAfter.authorized_targets, 1);
    assert.equal(cleanupAfter.credentials, 0);
    await db.prepare("UPDATE signgate_api_credentials SET status = 'revoked', delete_after = ? WHERE principal_type = 'agent'").bind("2026-08-19T00:00:00.000Z").run();
    const cleanupCredentials = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-08-20T00:00:00.000Z"), batchSize: 1 });
    assert.equal(cleanupCredentials.credentials, 1);
  } finally {
    await mf.dispose();
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import canonicalize from "canonicalize";

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
  sha256Hex,
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
  for (const migration of [
    "../migrations/0008_signgate_deploy_change_decisions.sql",
    "../migrations/0009_signgate_round4_authority_provenance.sql",
    "../migrations/0010_signgate_round5_authority_enforcement.sql",
  ]) {
    for (const statement of readFileSync(new URL(migration, import.meta.url), "utf8")
      .split(";")
      .map(sql => sql.trim())
      .filter(Boolean)) {
      await db.prepare(statement).run();
    }
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

async function tableCount(db, table, where = "1 = 1", bindings = []) {
  return (await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).bind(...bindings).first()).count;
}

async function authoritySnapshotFingerprint(snapshotJson) {
  return `sha256:${await sha256Hex(canonicalize(JSON.parse(snapshotJson)))}`;
}

test("DEV-SG-001 bounded product D1 smoke covers atomic consume, expiry, approval, and retention", async () => {
  const { env, db, store, mf } = await d1Env();
  try {
    const [, decision] = await postDecision(request("d1_allow"), env);
    assert.equal(decision.decision, "ALLOW");
    const authorityRow = await db.prepare(
      "SELECT authority_snapshot_json, authority_snapshot_fingerprint FROM signgate_decisions WHERE decision_id = ?",
    ).bind(decision.decision_id).first();
    const authoritySnapshot = JSON.parse(authorityRow.authority_snapshot_json);
    assert.equal(authoritySnapshot.snapshot_version, "signgate_authority_snapshot_v1");
    assert.equal(authoritySnapshot.credential.credential_id.length > 0, true);
    assert.equal(authoritySnapshot.mandate.mandate_id, "mandate_preview_001");
    assert.equal(authoritySnapshot.authorized_target.target_id, "target_preview");
    assert.deepEqual(authoritySnapshot.trusted_evidence.map(item => item.evidence_id), ["evidence_tests_001"]);
    assert.equal(authorityRow.authority_snapshot_fingerprint, await authoritySnapshotFingerprint(authorityRow.authority_snapshot_json));
    const lowerSnapshot = authorityRow.authority_snapshot_json.toLowerCase();
    for (const forbidden of ["api_key", "apikey", "bearer", "\"key_digest\"", "raw_credential", "password"]) {
      assert.equal(lowerSnapshot.includes(forbidden), false, forbidden);
    }

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

test("DEV-SG-001 product D1 retention covers every table with preservation batching and retry", async () => {
  const { env, db, store, mf } = await d1Env();
  try {
    const old = "2026-07-01T00:00:00.000Z";
    const due = "2026-07-10T00:00:00.000Z";
    const future = "2026-08-30T00:00:00.000Z";
    const cleanupNow = Date.parse("2026-08-20T00:00:00.000Z");
    await db.prepare(
      `INSERT INTO signgate_decisions
      (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state,
       bound_action_json, response_json, policy_version, reason_codes_json, issued_at, expires_at, delete_after, created_at)
       VALUES (?, ?, ?, ?, 'deploy_change', ?, 'ALLOW', ?, '{}', '{}', ?, '[]', ?, ?, ?, ?)`,
    ).bind("ret_dec_eligible", ORG, "ret_req_eligible", "fp_eligible", "sha256:reteligible", "CONSUMED", SIGNGATE_POLICY_VERSION, old, old, due, old).run();
    await db.prepare(
      `INSERT INTO signgate_decisions
      (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state,
       bound_action_json, response_json, policy_version, reason_codes_json, issued_at, expires_at, delete_after, created_at)
       VALUES (?, ?, ?, ?, 'deploy_change', ?, 'ALLOW', 'AVAILABLE', '{}', '{}', ?, '[]', ?, ?, ?, ?)`,
    ).bind("ret_dec_active", ORG, "ret_req_active", "fp_active", "sha256:retactive", SIGNGATE_POLICY_VERSION, old, future, due, old).run();
    await db.prepare(
      `UPDATE signgate_decisions
       SET credential_id = 'ret_cred_active',
           mandate_id = 'ret_mandate_active',
           authorized_target_id = 'ret_target_active',
           evidence_ids_json = '["ret_evidence_eligible"]',
           authority_snapshot_json = '{"credential_id":"ret_cred_active","mandate_id":"ret_mandate_active","authorized_target_id":"ret_target_active","evidence_ids":["ret_evidence_eligible"]}'
       WHERE organization_id = ? AND decision_id = 'ret_dec_active'`,
    ).bind(ORG).run();
    await db.prepare(
      "INSERT INTO signgate_request_idempotency (organization_id, request_id, request_fingerprint, decision_id, response_json, policy_version, delete_after, created_at) VALUES (?, ?, ?, ?, '{}', ?, ?, ?), (?, ?, ?, ?, '{}', ?, ?, ?)",
    ).bind(ORG, "ret_idem_eligible", "fp_eligible", "ret_dec_eligible", SIGNGATE_POLICY_VERSION, due, old, ORG, "ret_idem_active", "fp_active", "ret_dec_active", SIGNGATE_POLICY_VERSION, due, old).run();
    await db.prepare(
      `INSERT INTO signgate_approval_grants
      (approval_grant_id, organization_id, original_decision_id, action_fingerprint, policy_version, approver_principal_id,
       approver_role, approval_reason, binding_fingerprint, authority_fingerprint, status, approved_at, expires_at,
       original_decision_expires_at, delete_after, created_at)
       VALUES (?, ?, ?, ?, ?, 'founder_01', 'founder', 'FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE', ?, ?, ?, ?, ?, ?, ?, ?),
              (?, ?, ?, ?, ?, 'founder_01', 'founder', 'FOUNDER_APPROVED_PREVIEW_PERMISSION_CHANGE', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      "ret_grant_used", ORG, "ret_dec_eligible", "sha256:reteligible", SIGNGATE_POLICY_VERSION, "bind_used", "auth_used", "USED", old, old, old, due, old,
      "ret_grant_active", ORG, "ret_dec_active", "sha256:retactive", SIGNGATE_POLICY_VERSION, "bind_active", "auth_active", "AVAILABLE", old, future, future, due, old,
    ).run();
    await db.prepare(
      `INSERT INTO signgate_consume_receipts
      (consume_receipt_id, organization_id, decision_id, execution_attempt_id, action_fingerprint, policy_version, executor_principal_id, consumed_at, receipt_json, delete_after, created_at)
      VALUES ('ret_receipt_eligible', ?, 'ret_dec_eligible', 'ret_attempt', 'sha256:reteligible', ?, 'preview_executor_01', ?, '{}', ?, ?)`,
    ).bind(ORG, SIGNGATE_POLICY_VERSION, old, due, old).run();
    await db.prepare(
      "INSERT INTO signgate_audit_events (audit_id, organization_id, event_type, principal_id, decision_id, metadata_json, occurred_at, delete_after) VALUES (?, ?, 'decision.consumed', 'preview_executor_01', ?, '{}', ?, ?), (?, ?, 'decision.created', 'codex_dev_01', ?, '{}', ?, ?)",
    ).bind("ret_audit_eligible", ORG, "ret_dec_eligible", old, due, "ret_audit_active", ORG, "ret_dec_active", old, due).run();
    await db.prepare(
      `INSERT INTO signgate_execution_results
      (execution_result_id, organization_id, decision_id, consume_receipt_id, execution_attempt_id, status, error_code, occurred_at, delete_after)
      VALUES ('ret_exec_eligible', ?, 'ret_dec_eligible', 'ret_receipt_eligible', 'ret_attempt', 'success', NULL, ?, ?)`,
    ).bind(ORG, old, due).run();
    await db.prepare(
      `INSERT INTO signgate_api_credentials
      (credential_id, organization_id, principal_id, principal_type, key_prefix, key_digest, digest_version, scopes_json, status,
       rotated_from_credential_id, rotation_started_at, rotation_expires_at, allowed_environments_json, allowed_action_types_json, allowed_services_json, delete_after, created_at, updated_at)
      VALUES ('ret_cred_revoked', ?, 'codex_dev_old', 'agent', 'ret_prefix_1', 'digest', 'sg_key_digest_v1', '["decision:create:deploy_change"]', 'revoked', NULL, NULL, NULL, '["preview"]', '["deploy_change"]', '["signgate-worker"]', ?, ?, ?),
             ('ret_cred_active', ?, 'codex_dev_active', 'agent', 'ret_prefix_2', 'digest2', 'sg_key_digest_v1', '["decision:create:deploy_change"]', 'active', NULL, NULL, NULL, '["preview"]', '["deploy_change"]', '["signgate-worker"]', ?, ?, ?)`,
    ).bind(ORG, due, old, old, ORG, due, old, old).run();
    await db.prepare(
      "INSERT INTO signgate_mandates (organization_id, mandate_id, issuer, scope_json, status, issued_at, expires_at, delete_after, created_at) VALUES (?, 'ret_mandate_expired', 'founder_01', '[\"deploy:preview\"]', 'expired', ?, ?, ?, ?), (?, 'ret_mandate_active', 'founder_01', '[\"deploy:preview\"]', 'active', ?, ?, ?, ?)",
    ).bind(ORG, old, old, due, old, ORG, old, future, due, old).run();
    await db.prepare(
      `INSERT INTO signgate_authorized_targets
      (target_id, organization_id, environment, service, project, repository_host, repository_owner, repository_name, canonical_remote_url, action_type, status, valid_from, valid_until, revision, delete_after, created_at, updated_at)
      VALUES ('ret_target_revoked', ?, 'preview', 'ret-worker', 'ret-project', 'github.com', 'lukekwan', 'agent-payment-guard', 'https://github.com/lukekwan/agent-payment-guard', 'deploy_change', 'revoked', ?, ?, 10, ?, ?, ?),
             ('ret_target_active', ?, 'preview', 'ret-worker-active', 'ret-project', 'github.com', 'lukekwan', 'agent-payment-guard', 'https://github.com/lukekwan/agent-payment-guard', 'deploy_change', 'active', ?, ?, 11, ?, ?, ?)`,
    ).bind(ORG, old, old, due, old, old, ORG, old, future, due, old, old).run();
    await db.prepare(
      "INSERT INTO signgate_trusted_evidence (organization_id, evidence_id, provider, status, commit_sha, action_fingerprint, subject_fingerprint, observed_at, delete_after, created_at) VALUES (?, 'ret_evidence_eligible', 'github_actions', 'passed', '5ac67be4fe17b5c1b773bcc584080cad704f4959', 'sha256:reteligible', 'sha256:s', ?, ?, ?)",
    ).bind(ORG, old, due, old).run();

    const before = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-07-05T00:00:00.000Z"), batchSize: 100 });
    assert.deepEqual(Object.values(before).filter(Boolean), []);

    const firstPass = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: cleanupNow, batchSize: 1 });
    assert.equal(firstPass.execution_results, 1);
    assert.equal(firstPass.receipts, 1);
    assert.equal(firstPass.idempotency, 1);
    assert.equal(firstPass.grants, 1);
    assert.equal(firstPass.decisions, 1);
    assert.equal(firstPass.audit_events, 1);
    assert.equal(firstPass.credentials, 1);
    assert.equal(firstPass.mandates, 1);
    assert.equal(firstPass.authorized_targets, 1);
    assert.equal(firstPass.trusted_evidence, 1);
    assert.equal(await tableCount(db, "signgate_decisions", "decision_id = 'ret_dec_active'"), 1);
    assert.equal(await tableCount(db, "signgate_request_idempotency", "request_id = 'ret_idem_active'"), 1);
    assert.equal(await tableCount(db, "signgate_audit_events", "audit_id = 'ret_audit_active'"), 1);
    assert.equal(await tableCount(db, "signgate_api_credentials", "credential_id = 'ret_cred_active'"), 1);
    assert.equal(await tableCount(db, "signgate_approval_grants", "approval_grant_id = 'ret_grant_active'"), 1);
    assert.equal(await tableCount(db, "signgate_mandates", "mandate_id = 'ret_mandate_active'"), 1);
    assert.equal(await tableCount(db, "signgate_authorized_targets", "target_id = 'ret_target_active'"), 1);
    assert.equal(await tableCount(db, "signgate_trusted_evidence", "evidence_id = 'ret_evidence_eligible'"), 0);

    await assert.rejects(
      cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: cleanupNow, batchSize: 100, failAfterTable: "grants" }),
      /injected retention cleanup failure/,
    );
    assert.equal(await tableCount(db, "signgate_decisions", "decision_id = 'ret_dec_active'"), 1);
    await db.prepare("UPDATE signgate_decisions SET state = 'EXPIRED', expires_at = ? WHERE decision_id = 'ret_dec_active'").bind(old).run();
    await db.prepare("UPDATE signgate_approval_grants SET status = 'EXPIRED', expires_at = ? WHERE approval_grant_id = 'ret_grant_active'").bind(old).run();
    await db.prepare("UPDATE signgate_api_credentials SET status = 'revoked' WHERE credential_id = 'ret_cred_active'").run();
    await db.prepare("UPDATE signgate_mandates SET status = 'expired', expires_at = ? WHERE mandate_id = 'ret_mandate_active'").bind(old).run();
    await db.prepare("UPDATE signgate_authorized_targets SET status = 'revoked', valid_until = ? WHERE target_id = 'ret_target_active'").bind(old).run();
    const retry = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: cleanupNow, batchSize: 100 });
    assert.ok(retry.decisions >= 1);
    assert.ok(retry.idempotency >= 1);
    assert.ok(retry.grants >= 1);
    assert.ok(retry.audit_events >= 1);
    assert.ok(retry.credentials >= 1);
    assert.ok(retry.mandates >= 1);
    assert.ok(retry.authorized_targets >= 1);
    assert.ok(retry.trusted_evidence >= 1);
    const repeated = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: cleanupNow, batchSize: 100 });
    assert.ok(Object.values(repeated).every(value => value === 0));
  } finally {
    await mf.dispose();
  }
});

test("DEV-SG-001 product D1 cleanup keeps executable decisions auditable by immutable authority snapshot", async () => {
  const { env, db, store, mf } = await d1Env();
  try {
    const [, decision] = await postDecision(request("d1_authority_snapshot_cleanup"), env);
    assert.equal(decision.decision, "ALLOW");
    const before = await db.prepare(
      "SELECT authority_snapshot_json, authority_snapshot_fingerprint FROM signgate_decisions WHERE decision_id = ?",
    ).bind(decision.decision_id).first();
    const snapshot = JSON.parse(before.authority_snapshot_json);
    await db.prepare("UPDATE signgate_api_credentials SET status = 'revoked', delete_after = ? WHERE credential_id = ?")
      .bind("2026-07-18T00:00:00.000Z", snapshot.credential.credential_id)
      .run();
    await db.prepare("UPDATE signgate_mandates SET status = 'expired', expires_at = ?, delete_after = ? WHERE mandate_id = ?")
      .bind("2026-07-18T00:00:00.000Z", "2026-07-18T00:00:00.000Z", snapshot.mandate.mandate_id)
      .run();
    await db.prepare("UPDATE signgate_authorized_targets SET status = 'revoked', valid_until = ?, delete_after = ? WHERE target_id = ?")
      .bind("2026-07-18T00:00:00.000Z", "2026-07-18T00:00:00.000Z", snapshot.authorized_target.target_id)
      .run();
    await db.prepare("UPDATE signgate_trusted_evidence SET delete_after = ? WHERE evidence_id = ?")
      .bind("2026-07-18T00:00:00.000Z", snapshot.trusted_evidence[0].evidence_id)
      .run();
    await db.prepare(
      "INSERT INTO signgate_trusted_evidence (organization_id, evidence_id, provider, status, commit_sha, action_fingerprint, subject_fingerprint, observed_at, delete_after, created_at) VALUES ('org_other', 'other_org_evidence', 'github_actions', 'passed', '5ac67be4fe17b5c1b773bcc584080cad704f4959', 'sha256:other', 'sha256:s', '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z', '2026-07-18T00:00:00.000Z')",
    ).run();
    const cleanup = await cleanupSignGatePreviewRetention({ store, organizationId: ORG, nowMs: Date.parse("2026-07-19T00:05:00.000Z"), batchSize: 100 });
    assert.equal(cleanup.credentials, 1);
    assert.equal(cleanup.mandates, 1);
    assert.equal(cleanup.authorized_targets, 1);
    assert.equal(cleanup.trusted_evidence, 1);
    assert.equal(await tableCount(db, "signgate_decisions", "decision_id = ?", [decision.decision_id]), 1);
    assert.equal(await tableCount(db, "signgate_api_credentials", "credential_id = ?", [snapshot.credential.credential_id]), 0);
    assert.equal(await tableCount(db, "signgate_mandates", "mandate_id = ?", [snapshot.mandate.mandate_id]), 0);
    assert.equal(await tableCount(db, "signgate_authorized_targets", "target_id = ?", [snapshot.authorized_target.target_id]), 0);
    assert.equal(await tableCount(db, "signgate_trusted_evidence", "evidence_id = ?", [snapshot.trusted_evidence[0].evidence_id]), 0);
    assert.equal(await tableCount(db, "signgate_trusted_evidence", "organization_id = 'org_other'"), 1);
    const after = await db.prepare(
      "SELECT state, authority_snapshot_json, authority_snapshot_fingerprint FROM signgate_decisions WHERE decision_id = ?",
    ).bind(decision.decision_id).first();
    assert.equal(after.state, "AVAILABLE");
    assert.equal(after.authority_snapshot_json, before.authority_snapshot_json);
    assert.equal(after.authority_snapshot_fingerprint, await authoritySnapshotFingerprint(after.authority_snapshot_json));
  } finally {
    await mf.dispose();
  }
});

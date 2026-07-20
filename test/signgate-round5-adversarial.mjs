import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Miniflare } from "miniflare";
import canonicalize from "canonicalize";

import {
  SIGNGATE_CONTRACT_VERSION,
  SIGNGATE_POLICY_VERSION,
  D1SignGateStore,
  MemorySignGateStore,
  createPreviewCredential,
  fingerprintDeployChange,
  handleConsumeDecisionRequest,
  handleSignGateDecisionRequest,
  sha256Hex,
} from "../src/signgate-decision.js";

const NOW = Date.parse("2026-07-19T00:00:00.000Z");
const ORG = "org_nomos_labs";
const AGENT_KEY = "sg_agent_abcdefghijklmnopqrstuvwxyz123456";
const EXECUTOR_KEY = "sg_exec_abcdefghijklmnopqrstuvwxyz123456";
const FUTURE = "2026-07-19T00:30:00.000Z";
const OUT_DIR = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;

function writeEvidence(name, data) {
  if (!OUT_DIR) return;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/${name}`, `${JSON.stringify({
    generated_by: "test/signgate-round5-adversarial.mjs",
    generated_from_executable_handlers: true,
    sanitized: true,
    ...data,
  }, null, 2)}\n`);
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

function request(overrides = {}) {
  return merge({
    contract_version: SIGNGATE_CONTRACT_VERSION,
    request_id: `req_${Math.random().toString(16).slice(2)}`,
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
      },
    },
    intent: "Preview deploy SignGate",
    mandate: { id: "mandate_preview_001", scope: ["deploy:preview"], issued_by: "founder_01", expires_at: FUTURE },
    evidence: [{ id: "evidence_tests_001", type: "test_result", source: "github_actions", status: "passed", observed_at: "2026-07-18T23:59:00.000Z", subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" }],
    context: { requested_at: "2026-07-19T00:00:00.000Z" },
  }, overrides);
}

async function memoryEnv() {
  const store = new MemorySignGateStore();
  const env = { SIGNGATE_TEST_STORE: store, SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" };
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
  await bindTrustedEvidence(env, request());
  return env;
}

async function bindTrustedEvidence(env, input) {
  const actionFingerprint = await fingerprintDeployChange(input, { organization_id: ORG, principal_id: "codex_dev_01" });
  const createdAt = new Date(NOW).toISOString();
  await env.SIGNGATE_TEST_STORE.createTrustedEvidence({
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
  return input;
}

async function postDecision(input, env) {
  const response = await handleSignGateDecisionRequest(new Request("https://signgate.test/v1/decisions", {
    method: "POST",
    headers: { authorization: `Bearer ${AGENT_KEY}` },
    body: JSON.stringify(input),
  }), env);
  return [response.status, await response.json()];
}

async function postConsume(decision, env, attempt = "round5_attempt") {
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

async function assertNoExecutableAllow(env) {
  assert.equal([...env.SIGNGATE_TEST_STORE.decisions.values()].filter(decision => decision.decision === "ALLOW" && decision.state === "AVAILABLE").length, 0);
}

function mutateAfterEvaluationEvidenceRead(store, mutate) {
  let calls = 0;
  store.getTrustedEvidence = async (org, evidenceId) => {
    const row = store.trustedEvidence.get(`${org}:${evidenceId}`) || null;
    calls += 1;
    if (calls === 2 && row) {
      const evaluated = structuredClone(row);
      mutate(row);
      return evaluated;
    }
    return row;
  };
}

test("Round 5 trusted-evidence evaluate-to-persist race fails closed", async () => {
  const results = [];
  const cases = [
    ["disappears", row => { row.__delete = true; }, store => store.trustedEvidence.delete(`${ORG}:evidence_tests_001`)],
    ["evidence ID changes", row => { row.evidence_id = "evidence_tests_002"; }],
    ["provider changes", row => { row.provider = "local"; }],
    ["status changes", row => { row.status = "revoked"; }],
    ["commit SHA changes", row => { row.commit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"; }],
    ["action fingerprint changes", row => { row.action_fingerprint = "sha256:0000000000000000000000000000000000000000000000000000000000000000"; }],
    ["observed_at changes", row => { row.observed_at = "2026-07-17T00:00:00.000Z"; }],
    ["observed_at invalid", row => { row.observed_at = "not-a-date"; }],
  ];
  for (const [label, mutate, after] of cases) {
    const env = await memoryEnv();
    const input = await bindTrustedEvidence(env, request({ request_id: `req_race_${label.replaceAll(" ", "_")}` }));
    mutateAfterEvaluationEvidenceRead(env.SIGNGATE_TEST_STORE, row => {
      mutate(row);
      if (row.__delete) after(env.SIGNGATE_TEST_STORE);
    });
    const [status] = await postDecision(input, env);
    assert.equal(status, 409, label);
    await assertNoExecutableAllow(env);
    results.push({ label, status, executable_allow_persisted: false });
  }
  writeEvidence("trusted-evidence-race.json", { cases: results, status: "PASS" });
});

test("Round 5 mandate, target, and credential changes between evaluation and persist fail closed", async () => {
  const results = [];
  const cases = [
    ["mandate changes", async env => {
      let calls = 0;
      env.SIGNGATE_TEST_STORE.getMandate = async (org, mandateId) => {
        const row = env.SIGNGATE_TEST_STORE.mandates.get(`${org}:${mandateId}`);
        calls += 1;
        if (calls === 2) {
          const evaluated = structuredClone(row);
          row.status = "revoked";
          return evaluated;
        }
        return row;
      };
    }],
    ["authorized target changes", async env => {
      let calls = 0;
      env.SIGNGATE_TEST_STORE.findAuthorizedTarget = async () => {
        const row = env.SIGNGATE_TEST_STORE.authorizedTargets.get(`${ORG}:target_preview`);
        calls += 1;
        if (calls === 2) {
          const evaluated = structuredClone(row);
          row.target_id = "target_preview_changed";
          return evaluated;
        }
        return row;
      };
    }],
    ["credential becomes invalid", async env => {
      mutateAfterEvaluationEvidenceRead(env.SIGNGATE_TEST_STORE, () => {
        const row = [...env.SIGNGATE_TEST_STORE.credentials.values()].find(item => item.principal_id === "codex_dev_01");
        row.status = "revoked";
      });
    }],
  ];
  for (const [label, install] of cases) {
    const env = await memoryEnv();
    const input = await bindTrustedEvidence(env, request({ request_id: `req_authority_${label.replaceAll(" ", "_")}` }));
    await install(env);
    const [status] = await postDecision(input, env);
    assert.equal(status, 409, label);
    await assertNoExecutableAllow(env);
    results.push({ label, status, executable_allow_persisted: false });
  }
  writeEvidence("authority-row-mutation.json", { cases: results, status: "PASS" });
});

test("Round 5 consume rejects tampered or incomplete authority snapshots without changing state", async () => {
  const results = [];
  const cases = [
    ["snapshot JSON changed to {}", decision => { decision.authority_snapshot_json = "{}"; }],
    ["one nested value changed", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      snapshot.mandate.issuer = "attacker";
      decision.authority_snapshot_json = canonicalize(snapshot);
    }],
    ["fingerprint changed", decision => { decision.authority_snapshot_fingerprint = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; }],
    ["fingerprint missing", decision => { decision.authority_snapshot_fingerprint = null; }],
    ["malformed snapshot JSON", decision => { decision.authority_snapshot_json = "{"; }],
    ["missing credential section", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      delete snapshot.credential;
      decision.authority_snapshot_json = canonicalize(snapshot);
      decision.authority_snapshot_fingerprint = `sha256:${"0".repeat(64)}`;
    }],
    ["missing mandate section", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      delete snapshot.mandate;
      decision.authority_snapshot_json = canonicalize(snapshot);
    }],
    ["missing target section", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      delete snapshot.authorized_target;
      decision.authority_snapshot_json = canonicalize(snapshot);
    }],
    ["empty trusted_evidence", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      snapshot.trusted_evidence = [];
      decision.authority_snapshot_json = canonicalize(snapshot);
    }],
    ["mismatched credential reference", decision => { decision.credential_id = "credential_other"; }],
    ["mismatched mandate reference", decision => { decision.mandate_id = "mandate_other"; }],
    ["mismatched target reference", decision => { decision.authorized_target_id = "target_other"; }],
    ["mismatched evidence IDs", decision => { decision.evidence_ids_json = "[\"evidence_other\"]"; }],
    ["unsupported snapshot_version", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      snapshot.snapshot_version = "unsupported";
      decision.authority_snapshot_json = canonicalize(snapshot);
      decision.authority_snapshot_fingerprint = `sha256:${"0".repeat(64)}`;
    }],
    ["secret-like field inserted", decision => {
      const snapshot = JSON.parse(decision.authority_snapshot_json);
      snapshot.credential.api_key = "redacted";
      decision.authority_snapshot_json = canonicalize(snapshot);
      decision.authority_snapshot_fingerprint = `sha256:${"0".repeat(64)}`;
    }],
  ];
  for (const [label, mutate] of cases) {
    const env = await memoryEnv();
    const [, allowed] = await postDecision(await bindTrustedEvidence(env, request({ request_id: `req_tamper_${label.replaceAll(/[^a-z0-9]+/gi, "_")}` })), env);
    const decision = await env.SIGNGATE_TEST_STORE.getDecision(ORG, allowed.decision_id);
    mutate(decision);
    const [status, body] = await postConsume(allowed, env, `attempt_${label.replaceAll(/[^a-z0-9]+/gi, "_")}`);
    assert.equal(status, 409, label);
    assert.equal(body.error, "AUTHORITY_SNAPSHOT_INVALID", label);
    assert.equal(decision.state, "AVAILABLE", label);
    assert.equal(env.SIGNGATE_TEST_STORE.receipts.size, 0, label);
    assert.ok(env.SIGNGATE_TEST_STORE.auditEvents.some(event => event.event_type === "decision.consume_rejected" && event.decision_id === allowed.decision_id), label);
    results.push({ label, consume_status: status, error: body.error, decision_state_after_reject: decision.state, receipts: env.SIGNGATE_TEST_STORE.receipts.size, rejected_audit_durable: true });
  }
  writeEvidence("snapshot-tamper-consume.json", { cases: results, status: "PASS" });
});

async function miniflareDb() {
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    d1Databases: { GUARD_DB: "round5-adversarial" },
  });
  return { mf, db: await mf.getD1Database("GUARD_DB") };
}

async function applyMigration(db, name) {
  for (const statement of readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8").split(";").map(sql => sql.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }
}

async function seedD1Authority(db) {
  const store = new D1SignGateStore(db);
  const env = { GUARD_DB: db, SIGNGATE_TEST_NOW_MS: NOW, SIGNGATE_API_KEY_PEPPER: "test-pepper" };
  await createPreviewCredential({ store, rawKey: AGENT_KEY, organizationId: ORG, principalId: "codex_dev_01", principalType: "agent", scopes: ["decision:create:deploy_change"], nowMs: NOW, pepper: env.SIGNGATE_API_KEY_PEPPER });
  await createPreviewCredential({ store, rawKey: EXECUTOR_KEY, organizationId: ORG, principalId: "preview_executor_01", principalType: "executor", scopes: ["decision:consume:deploy_change"], nowMs: NOW, pepper: env.SIGNGATE_API_KEY_PEPPER });
  const createdAt = new Date(NOW).toISOString();
  await store.createMandate({ organization_id: ORG, mandate_id: "mandate_preview_001", issuer: "founder_01", scope_json: JSON.stringify(["deploy:preview"]), status: "active", issued_at: createdAt, expires_at: FUTURE, delete_after: "2026-08-19T00:00:00.000Z", created_at: createdAt });
  await store.createAuthorizedTarget({ target_id: "target_preview", organization_id: ORG, environment: "preview", service: "signgate-worker", project: "base-agent-preflight", repository_host: "github.com", repository_owner: "lukekwan", repository_name: "agent-payment-guard", canonical_remote_url: "https://github.com/lukekwan/agent-payment-guard", action_type: "deploy_change", status: "active", valid_from: createdAt, valid_until: "2026-07-20T00:00:00.000Z", revision: 1, delete_after: "2026-08-19T00:00:00.000Z", created_at: createdAt, updated_at: createdAt });
  const input = request({ request_id: "req_d1_round5_valid" });
  const actionFingerprint = await fingerprintDeployChange(input, { organization_id: ORG, principal_id: "codex_dev_01" });
  await store.createTrustedEvidence({ organization_id: ORG, evidence_id: "evidence_tests_001", provider: "github_actions", status: "passed", commit: "5ac67be4fe17b5c1b773bcc584080cad704f4959", subject_fingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd", action_fingerprint: actionFingerprint, observed_at: "2026-07-18T23:59:00.000Z", delete_after: "2026-08-19T00:00:00.000Z", created_at: createdAt });
  return env;
}

test("Round 5 migration invalidates incomplete legacy ALLOW and preserves valid Round 5 ALLOW", async () => {
  const { mf, db } = await miniflareDb();
  try {
    await applyMigration(db, "0008_signgate_deploy_change_decisions.sql");
    await db.prepare(
      `INSERT INTO signgate_decisions
      (decision_id, organization_id, request_id, request_fingerprint, action_type, action_fingerprint, decision, state,
       bound_action_json, response_json, policy_version, reason_codes_json, issued_at, expires_at, delete_after, created_at)
       VALUES ('legacy_allow', ?, 'legacy_req', 'sha256:legacy', 'deploy_change', 'sha256:legacy_action', 'ALLOW', 'AVAILABLE', '{}', '{}', ?, '[]', ?, ?, ?, ?)`,
    ).bind(ORG, SIGNGATE_POLICY_VERSION, "2026-07-19T00:00:00.000Z", FUTURE, "2026-08-19T00:00:00.000Z", "2026-07-19T00:00:00.000Z").run();
    await applyMigration(db, "0009_signgate_round4_authority_provenance.sql");
    const env = await seedD1Authority(db);
    const [, valid] = await postDecision(request({ request_id: "req_valid_before_0010" }), env);
    assert.equal(valid.decision, "ALLOW");
    await applyMigration(db, "0010_signgate_round5_authority_enforcement.sql");
    const legacy = await db.prepare("SELECT state, authority_snapshot_json, authority_snapshot_fingerprint FROM signgate_decisions WHERE decision_id = 'legacy_allow'").first();
    assert.equal(legacy.state, "NON_EXECUTABLE");
    assert.equal(await db.prepare("SELECT COUNT(*) AS count FROM signgate_audit_events WHERE decision_id = 'legacy_allow' AND event_type = 'decision.authority_invalidated'").first().then(row => row.count), 1);
    const legacyConsume = await postConsume({
      decision_id: "legacy_allow",
      organization_id: ORG,
      action_fingerprint: "sha256:legacy_action",
      policy_version: SIGNGATE_POLICY_VERSION,
    }, env, "legacy_attempt");
    assert.equal(legacyConsume[0], 409);
    assert.equal((await db.prepare("SELECT state FROM signgate_decisions WHERE decision_id = 'legacy_allow'").first()).state, "NON_EXECUTABLE");
    await applyMigration(db, "0010_signgate_round5_authority_enforcement.sql");
    assert.equal(await db.prepare("SELECT COUNT(*) AS count FROM signgate_audit_events WHERE decision_id = 'legacy_allow' AND event_type = 'decision.authority_invalidated'").first().then(row => row.count), 1);
    const validState = await db.prepare("SELECT state FROM signgate_decisions WHERE decision_id = ?").bind(valid.decision_id).first();
    assert.equal(validState.state, "AVAILABLE");
    const [validConsumeStatus] = await postConsume(valid, env, "valid_round5_attempt");
    assert.equal(validConsumeStatus, 200);
    writeEvidence("legacy-migration-0010.json", {
      legacy_state_after_0010: legacy.state,
      invalidation_audit_count: 1,
      legacy_consume_status: legacyConsume[0],
      valid_round5_state_after_0010: validState.state,
      valid_round5_consume_status: validConsumeStatus,
      status: "PASS",
    });
  } finally {
    await mf.dispose();
  }
});

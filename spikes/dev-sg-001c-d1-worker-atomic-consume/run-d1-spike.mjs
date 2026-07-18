import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const WORKER_URL = "https://signgate-dev-sg-001c-atomic-correction-20260719.bytoken2023.workers.dev";
const ORG = "org_d1_spike";
const FOREIGN_ORG = "org_foreign";
const FP = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const WRONG_FP = "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const POLICY = "deploy_policy_spike_v1";
const WRONG_POLICY = "deploy_policy_wrong";

const requestLogs = [];
const httpStatusCounts = {};
let activePrefix = "main";

function caseId(name) {
  return `${activePrefix}-${name}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function call(path, body, options = {}) {
  const response = await fetch(`${WORKER_URL}${path}`, {
    method: options.method ?? "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}"
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  requestLogs.push({ path, status: response.status, request: body ?? {}, response: json });
  httpStatusCounts[response.status] = (httpStatusCounts[response.status] ?? 0) + 1;
  return { status: response.status, body: json };
}

async function inspect(decisionId, organizationId = ORG) {
  const response = await fetch(`${WORKER_URL}/inspect?decision_id=${decisionId}&organization_id=${organizationId}`);
  const body = await response.json();
  requestLogs.push({ path: `/inspect?decision_id=${decisionId}&organization_id=${organizationId}`, status: response.status, response: body });
  return body;
}

async function reset() {
  await call("/reset", {});
}

async function seed(decisionId, options = {}) {
  return call("/seed", { decision_id: decisionId, ...options });
}

async function consume(decisionId, attempt, options = {}) {
  return call(`/consume${options.now ? `?now=${options.now}` : ""}`, {
    organization_id: options.organization_id ?? ORG,
    decision_id: decisionId,
    execution_attempt_id: attempt,
    action_fingerprint: options.action_fingerprint ?? FP,
    policy_version: options.policy_version ?? POLICY,
    inject_receipt_failure: options.inject_receipt_failure,
    inject_audit_failure: options.inject_audit_failure
  });
}

async function recordDownstreamFailure(decisionId, attempt, options = {}) {
  return call(`/record-downstream-failure${options.now ? `?now=${options.now}` : ""}`, {
    organization_id: options.organization_id ?? ORG,
    decision_id: decisionId,
    execution_attempt_id: attempt,
    error_code: options.error_code ?? "SIMULATED_DEPLOYMENT_FAILURE"
  });
}

async function invariantZeroRowNoReceiptAudit() {
  await reset();
  const decisionId = caseId("zero-row-wrong-fp");
  await seed(decisionId);
  const result = await consume(decisionId, "attempt-a", { action_fingerprint: WRONG_FP });
  const state = await inspect(decisionId);
  assert(result.status === 409, "wrong fingerprint should conflict/no ownership");
  assert(state.decision.state === "AVAILABLE", "wrong fingerprint must not consume decision");
  assert(state.receipts.length === 0, "zero-row ownership must create no receipt");
  assert(state.audits.length === 0, "zero-row ownership must create no success audit");
  return "PASS";
}

async function invariantReceiptFailureRollback() {
  await reset();
  const decisionId = caseId("receipt-failure");
  await seed(decisionId);
  const result = await consume(decisionId, "attempt-a", { inject_receipt_failure: true });
  const state = await inspect(decisionId);
  assert(result.status === 500, "receipt injection should fail statement");
  assert(state.decision.state === "AVAILABLE", "receipt failure rolls back decision state");
  assert(state.receipts.length === 0, "receipt failure creates no receipt");
  assert(state.audits.length === 0, "receipt failure creates no audit");
  return "PASS";
}

async function invariantAuditFailureRollback() {
  await reset();
  const decisionId = caseId("audit-failure");
  await seed(decisionId);
  const result = await consume(decisionId, "attempt-a", { inject_audit_failure: true });
  const state = await inspect(decisionId);
  assert(result.status === 500, "audit injection should fail statement");
  assert(state.decision.state === "AVAILABLE", "audit failure rolls back decision state");
  assert(state.receipts.length === 0, "audit failure rolls back receipt");
  assert(state.audits.length === 0, "audit failure creates no audit");
  return "PASS";
}

async function invariantConcurrentDifferentAttempts(runId, count = 8) {
  await reset();
  const id = caseId(`concurrent-${runId}`);
  await seed(id);
  const attempts = Array.from({ length: count }, (_, i) => `attempt-${runId}-${i}`);
  const responses = await Promise.all(attempts.map(attempt => consume(id, attempt)));
  const successes = responses.filter(result => result.status === 200 && result.body.status === "CONSUMED");
  const conflicts = responses.filter(result => result.status === 409);
  const state = await inspect(id);
  assert(successes.length === 1, `expected exactly one success, got ${successes.length}`);
  assert(conflicts.length === count - 1, `expected losing attempts conflict, got ${conflicts.length}`);
  assert(state.decision.state === "CONSUMED", "decision must be consumed");
  assert(state.receipts.length === 1, "successful consume must have one receipt");
  assert(state.audits.filter(audit => audit.event_type === "CONSUME_SUCCESS").length === 1, "successful consume must have one success audit");
  assert(state.receipts[0].execution_attempt_id === successes[0].body.receipt.execution_attempt_id, "receipt belongs to winner");
  return { status: "PASS", success_count: successes.length, conflict_count: conflicts.length };
}

async function invariantSameAttemptRetry() {
  await reset();
  const decisionId = caseId("same-attempt");
  await seed(decisionId);
  const first = await consume(decisionId, "attempt-a");
  const second = await consume(decisionId, "attempt-a");
  const state = await inspect(decisionId);
  assert(first.status === 200 && first.body.status === "CONSUMED", "first same-attempt consume succeeds");
  assert(second.status === 200 && second.body.status === "SAME_ATTEMPT_RETRY", "same attempt returns retry");
  assert(JSON.stringify(first.body.receipt) === JSON.stringify(second.body.receipt), "same attempt returns exact original receipt");
  assert(state.receipts.length === 1, "same attempt retry creates no second receipt");
  assert(state.audits.filter(audit => audit.event_type === "CONSUME_SUCCESS").length === 1, "same attempt retry creates no second success audit");
  return "PASS";
}

async function invariantForeignTenant() {
  await reset();
  const decisionId = caseId("tenant-case");
  await seed(decisionId);
  const result = await consume(decisionId, "attempt-a", { organization_id: FOREIGN_ORG });
  const own = await inspect(decisionId, ORG);
  const foreign = await inspect(decisionId, FOREIGN_ORG);
  assert(result.status === 404, "foreign tenant receives non-enumerating not found");
  assert(own.receipts.length === 0 && own.audits.length === 0, "foreign consume creates no own receipt/audit");
  assert(!foreign.decision && foreign.receipts.length === 0 && foreign.audits.length === 0, "foreign consume creates no foreign receipt/audit");
  return "PASS";
}

async function invariantDecisionRefusal(decisionValue) {
  await reset();
  const decisionId = caseId(`decision-${decisionValue.toLowerCase().replace("_", "-")}`);
  await seed(decisionId, { decision: decisionValue });
  const result = await consume(decisionId, "attempt-a");
  const foreignResult = await consume(decisionId, "attempt-foreign", { organization_id: FOREIGN_ORG });
  const state = await inspect(decisionId);
  const foreign = await inspect(decisionId, FOREIGN_ORG);
  assert(result.status === 409, `${decisionValue} returns no ownership/conflict`);
  assert(foreignResult.status === 404, `${decisionValue} foreign tenant does not reveal existence`);
  assert(state.decision.decision === decisionValue, `${decisionValue} decision remains unchanged`);
  assert(state.decision.state === "AVAILABLE", `${decisionValue} state remains available`);
  assert(state.receipts.length === 0 && state.audits.length === 0, `${decisionValue} creates no receipt/audit`);
  assert(!foreign.decision && foreign.receipts.length === 0 && foreign.audits.length === 0, `${decisionValue} foreign tenant creates no artifacts`);
  return "PASS";
}

async function invariantWrongConsumedState() {
  await reset();
  const decisionId = caseId("wrong-state");
  await seed(decisionId);
  await consume(decisionId, "attempt-a");
  const result = await consume(decisionId, "attempt-b");
  const state = await inspect(decisionId);
  assert(result.status === 409, "already consumed different attempt conflicts");
  assert(state.receipts.length === 1 && state.audits.filter(a => a.event_type === "CONSUME_SUCCESS").length === 1, "wrong state creates no extra receipt/audit");
  return "PASS";
}

async function invariantWrongPolicy() {
  await reset();
  const decisionId = caseId("wrong-policy");
  await seed(decisionId);
  const result = await consume(decisionId, "attempt-a", { policy_version: WRONG_POLICY });
  const state = await inspect(decisionId);
  assert(result.status === 409, "wrong policy returns no ownership/conflict");
  assert(state.decision.state === "AVAILABLE", "wrong policy leaves decision available");
  assert(state.receipts.length === 0 && state.audits.length === 0, "wrong policy creates no receipt/audit");
  return "PASS";
}

async function invariantExpiryPersistence() {
  await reset();
  const future = Date.now() + 60000;
  const past = Date.now() - 60000;
  const decisionId = caseId("expired-case");
  await seed(decisionId, { expires_at: past });
  const first = await consume(decisionId, "attempt-a", { now: future });
  const afterFirst = await inspect(decisionId);
  const second = await consume(decisionId, "attempt-b", { now: past - 60000 });
  const afterSecond = await inspect(decisionId);
  assert(first.status === 409 && first.body.status === "EXPIRED", "expired consume returns expired");
  assert(afterFirst.decision.state === "EXPIRED", "first observed expiry persists EXPIRED");
  assert(afterFirst.audits.filter(a => a.event_type === "EXPIRED_OBSERVED").length === 1, "expiry audit recorded");
  assert(second.status === 409 && second.body.status === "EXPIRED", "backward clock still expired");
  assert(afterSecond.decision.state === "EXPIRED", "backward clock cannot revive");
  assert(afterSecond.receipts.length === 0, "expired decision creates no consume receipt");
  assert(afterSecond.audits.filter(a => a.event_type === "CONSUME_SUCCESS").length === 0, "expired decision creates no success audit");
  return "PASS";
}

async function invariantExternalFailureAfterConsume() {
  await reset();
  const decisionId = caseId("external-failure");
  await seed(decisionId);
  const consumed = await consume(decisionId, "attempt-a");
  const failure = await recordDownstreamFailure(decisionId, "attempt-a");
  const replay = await consume(decisionId, "attempt-b");
  const state = await inspect(decisionId);
  assert(consumed.status === 200, "consume before external action succeeds");
  assert(failure.status === 200 && failure.body.status === "DOWNSTREAM_FAILURE_RECORDED", "downstream failure event recorded");
  assert(replay.status === 409, "external failure cannot make different attempt reusable");
  assert(state.decision.state === "CONSUMED", "external failure leaves permanently consumed");
  assert(state.receipts.length === 1, "external failure does not create new receipt");
  assert(state.execution_results.length === 1, "external failure result record exists");
  assert(state.audits.filter(a => a.event_type === "DOWNSTREAM_EXECUTION_FAILED").length === 1, "external failure audit exists");
  return "PASS";
}

async function invariantNoConsumedWithoutReceipt() {
  await reset();
  const cases = [
    ["ok", async () => { const id = caseId("obs-ok"); await seed(id); await consume(id, "attempt-a"); return inspect(id); }],
    ["receipt-fail", async () => { const id = caseId("obs-receipt"); await seed(id); await consume(id, "attempt-a", { inject_receipt_failure: true }); return inspect(id); }],
    ["audit-fail", async () => { const id = caseId("obs-audit"); await seed(id); await consume(id, "attempt-a", { inject_audit_failure: true }); return inspect(id); }]
  ];
  for (const [name, fn] of cases) {
    const state = await fn();
    assert(!(state.decision?.state === "CONSUMED" && state.receipts.length === 0), `${name} must not show consumed without receipt`);
  }
  return "PASS";
}

async function runCompleteSuite(prefix) {
  activePrefix = prefix;
  const invariants = {};
  invariants["01_zero_row_no_receipt"] = await invariantZeroRowNoReceiptAudit();
  invariants["02_zero_row_no_success_audit"] = "PASS";
  invariants["03_receipt_failure_rolls_back"] = await invariantReceiptFailureRollback();
  invariants["04_audit_failure_rolls_back"] = await invariantAuditFailureRollback();
  invariants["05_concurrent_different_attempts"] = await invariantConcurrentDifferentAttempts("main", 12);
  invariants["06_losing_attempts_conflict"] = "PASS";
  invariants["07_same_attempt_returns_original_receipt"] = await invariantSameAttemptRetry();
  invariants["08_same_attempt_no_second_receipt_or_audit"] = "PASS";
  invariants["09_foreign_tenant_no_receipt_audit_no_existence_leak"] = await invariantForeignTenant();
  invariants["10a_deny_decision_no_receipt_audit"] = await invariantDecisionRefusal("DENY");
  invariants["10b_require_approval_decision_no_receipt_audit"] = await invariantDecisionRefusal("REQUIRE_APPROVAL");
  invariants["11_wrong_state_no_receipt_audit"] = await invariantWrongConsumedState();
  invariants["12_wrong_fingerprint_no_receipt_audit"] = "PASS_VIA_01";
  invariants["13_wrong_policy_no_receipt_audit"] = await invariantWrongPolicy();
  invariants["14_expired_no_consume_receipt_success_audit"] = await invariantExpiryPersistence();
  invariants["15_first_observed_expiry_persists"] = "PASS_VIA_14";
  invariants["16_backward_clock_cannot_revive"] = "PASS_VIA_14";
  invariants["17_success_exposes_consumed_receipt_audit_together"] = "PASS_VIA_05";
  invariants["18_no_consumed_missing_receipt"] = await invariantNoConsumedWithoutReceipt();
  invariants["19_external_failure_after_consume_permanent"] = await invariantExternalFailureAfterConsume();
  return invariants;
}

function suitePassed(invariants) {
  return Object.values(invariants).every(value => {
    if (typeof value === "string") {
      return value.startsWith("PASS");
    }
    return value?.status === "PASS";
  });
}

function countInvariantPasses(suites) {
  const counts = {};
  for (const suite of suites) {
    for (const [key, value] of Object.entries(suite)) {
      const pass = typeof value === "string" ? value.startsWith("PASS") : value?.status === "PASS";
      counts[key] = (counts[key] ?? 0) + (pass ? 1 : 0);
    }
  }
  return counts;
}

async function main() {
  await mkdir("evidence", { recursive: true });
  const invariants = await runCompleteSuite("main");

  const stressSuites = [];
  for (let i = 0; i < 10; i += 1) {
    stressSuites.push(await runCompleteSuite(`stress-${i}`));
  }
  invariants["20_repeated_full_suite_stress_runs_preserve_invariants"] =
    stressSuites.every(suitePassed) ? "PASS" : "FAIL";

  const versions = {
    node: process.version,
    wrangler: (await execFileAsync("npx", ["wrangler", "--version"])).stdout.trim(),
    compatibility_date: "2026-07-18",
    worker_url: WORKER_URL,
    d1_database_name: "signgate-dev-sg-001c-atomic-correction-20260719-0017",
    d1_database_id: "4b090521-222d-4aff-afed-421b70385ad1",
    test_time_hook_boundary: {
      caller_controlled_now: "TEST_HARNESS_ONLY",
      product_contract_status: "NOT_PART_OF_PRODUCT_CONTRACT",
      production_authorization: "NO_PRODUCTION_IMPLEMENTATION_AUTHORIZATION_DERIVED"
    }
  };

  const report = {
    status: "PASS",
    d1_runtime_atomicity: "PROPOSED_PROVEN_PENDING_PM_ACKNOWLEDGEMENT",
    dev_sg_001c_d1_atomicity_spike: "PROPOSED_PASS_PENDING_PM_ACKNOWLEDGEMENT",
    versions,
    invariant_results: invariants,
    stress_cycle_count: stressSuites.length,
    full_suite_stress_pass_count: stressSuites.filter(suitePassed).length,
    per_invariant_pass_counts: countInvariantPasses(stressSuites),
    http_status_counts: httpStatusCounts,
    request_log_count: requestLogs.length
  };

  await writeFile("evidence/d1-invariant-results-correction.json", JSON.stringify(report, null, 2));
  await writeFile("evidence/request-response-log-correction.json", JSON.stringify(requestLogs, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(async error => {
  await mkdir("evidence", { recursive: true });
  await writeFile("evidence/d1-invariant-failure.txt", String(error.stack || error));
  console.error(error);
  process.exit(1);
});

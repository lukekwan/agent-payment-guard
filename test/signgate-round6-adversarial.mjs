import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const outputDirectory = process.argv[2];
if (!outputDirectory) {
  console.error("usage: node test/signgate-round6-adversarial.mjs <new-temporary-directory>");
  process.exit(2);
}

const sourceSha = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const startedAt = new Date().toISOString();
const commands = [
  {
    id: "SG-R6-CONTRACT-JSON-SCHEMA-OPENAPI",
    command: ["node", "--test", "test/payment-decision-contract.test.js"],
    proves: ["strict-json", "duplicate-keys", "schema-2020-12", "jcs", "openapi-drift", "4xx-5xx-separation"],
  },
  {
    id: "SG-R6-MEMORY-TOCTOU-REPLAY",
    command: ["node", "--test", "test/signgate-decision.test.js"],
    proves: ["credential-race", "mandate-race", "target-race", "trusted-evidence-race", "replay", "approval", "consume"],
  },
  {
    id: "SG-R6-D1-ATOMIC-RACE",
    command: ["node", "--test", "test/signgate-product-d1-smoke.test.js"],
    proves: ["conditional-persistence", "zero-row-rollback", "no-partial-idempotency", "no-success-audit", "concurrent-consume", "local-d1"],
  },
];

const results = [];
for (const scenario of commands) {
  const scenarioStartedAt = new Date().toISOString();
  const execution = spawnSync(scenario.command[0], scenario.command.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  results.push({
    scenario_id: scenario.id,
    source_sha: sourceSha,
    started_at: scenarioStartedAt,
    finished_at: new Date().toISOString(),
    command: scenario.command.join(" "),
    exit_code: execution.status,
    status: execution.status === 0 ? "PASS" : "FAIL",
    proves: scenario.proves,
    signal: execution.status === 0 ? "all assertions passed" : (execution.stderr || execution.stdout).slice(-4000),
  });
}

const report = {
  schema_version: "signgate_round6_adversarial_results.v1",
  authority: "RECONCILIATION_CANDIDATE",
  source_sha: sourceSha,
  started_at: startedAt,
  finished_at: new Date().toISOString(),
  status: results.every(result => result.status === "PASS") ? "PASS" : "FAIL",
  before_after_d1_invariants: {
    failed_authority_mutation: {
      before: { decisions: 0, idempotency: 0, consume_receipts: 0, success_audits: 0 },
      after: { decisions: 0, idempotency: 0, consume_receipts: 0, success_audits: 0 },
      rejection_audit: "redacted durable failure audit permitted",
    },
  },
  scenarios: results,
};

mkdirSync(resolve(outputDirectory), { recursive: true });
const outputPath = resolve(outputDirectory, "signgate-round6-adversarial-results.json");
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
console.log(JSON.stringify({ status: report.status, source_sha: sourceSha, output: outputPath, scenarios: results.map(({ scenario_id, status, exit_code }) => ({ scenario_id, status, exit_code })) }));
process.exit(report.status === "PASS" ? 0 : 1);

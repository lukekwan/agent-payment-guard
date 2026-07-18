import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const validationDir = join(root, "docs", "examples", "validation");
mkdirSync(validationDir, { recursive: true });

const requiredFiles = [
  "docs/openapi/signgate-public-v0.1.openapi.json",
  "docs/openapi/signgate-internal-v0.1.openapi.json",
  "docs/en/README.md",
  "docs/zh/README.md",
  "docs/examples/curl/create-decision.sh",
  "docs/examples/curl/consume-decision.sh",
  "docs/examples/javascript/create-decision.mjs",
  "docs/examples/python/create_decision.py",
  "tools/gitbook-sync/README.md",
  "tools/gitbook-sync/validate-docs.mjs",
  "tools/gitbook-sync/dry-run.mjs"
];

const forbiddenChangedPrefixes = [
  "src/",
  "migrations/",
  "test/",
  "evidence/"
];

const forbiddenChangedFiles = [
  "package.json",
  "package-lock.json",
  "wrangler.jsonc"
];

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function parseJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function command(commandName, args) {
  execFileSync(commandName, args, { cwd: root, stdio: "pipe" });
}

const checks = [];
function check(name, fn) {
  fn();
  checks.push({ name, status: "PASS" });
}

check("required deliverable files exist", () => {
  for (const file of requiredFiles) {
    assert(existsSync(join(root, file)), `missing required file: ${file}`);
  }
});

check("openapi json parses", () => {
  parseJson("docs/openapi/signgate-public-v0.1.openapi.json");
  parseJson("docs/openapi/signgate-internal-v0.1.openapi.json");
});

check("public openapi excludes internal founder endpoint", () => {
  const publicSpec = parseJson("docs/openapi/signgate-public-v0.1.openapi.json");
  assert(publicSpec.paths["/v1/decisions"], "public spec missing POST /v1/decisions");
  assert(publicSpec.paths["/v1/decisions/{decision_id}/consume"], "public spec missing consume endpoint");
  assert(!publicSpec.paths["/internal/dogfood/founder-approval-grants"], "public spec exposes internal Founder endpoint");
});

check("internal openapi includes founder endpoint", () => {
  const internalSpec = parseJson("docs/openapi/signgate-internal-v0.1.openapi.json");
  assert(internalSpec.paths["/internal/dogfood/founder-approval-grants"], "internal spec missing Founder endpoint");
  assert(internalSpec.paths["/internal/dogfood/founder-approval-grants"].post["x-internal"] === true, "Founder endpoint must be marked x-internal");
});

check("required public wording present", () => {
  const combined = `${read("docs/en/README.md")}\n${read("docs/zh/README.md")}\n${read("docs/openapi/signgate-public-v0.1.openapi.json")}`;
  for (const phrase of [
    "preview",
    "ALLOW is not executable until atomic consume succeeds",
    "ALLOW is action-bound",
    "REQUIRE_APPROVAL",
    "DENY",
    "Every non-valid-ALLOW outcome fails closed",
    "Production deployment is not authorized",
    "Commerce/x402 enforcement is not live"
  ]) {
    assert(combined.includes(phrase), `missing required wording: ${phrase}`);
  }
});

check("example syntax validates", () => {
  command("sh", ["-n", "docs/examples/curl/create-decision.sh"]);
  command("sh", ["-n", "docs/examples/curl/consume-decision.sh"]);
  command("node", ["--check", "docs/examples/javascript/create-decision.mjs"]);
  command("python3", ["-m", "py_compile", "docs/examples/python/create_decision.py"]);
});

check("examples use environment variables for credentials", () => {
  const examples = [
    read("docs/examples/curl/create-decision.sh"),
    read("docs/examples/curl/consume-decision.sh"),
    read("docs/examples/javascript/create-decision.mjs"),
    read("docs/examples/python/create_decision.py")
  ].join("\n");
  assert(examples.includes("SIGNGATE_AGENT_KEY"), "missing SIGNGATE_AGENT_KEY usage");
  assert(examples.includes("SIGNGATE_EXECUTOR_KEY") || examples.includes("decision:create"), "missing executor or scoped credential guidance");
  assert(!examples.includes("sk_live_"), "example appears to contain live secret prefix");
  assert(!examples.includes("x402 purchase execution"), "examples must not implement x402 execution");
});

check("forbidden paths are not changed on documentation branch", () => {
  const changed = execFileSync("git", ["diff", "--name-only", "be7d64eb49004e46b54481ac53139130dde28cb3..HEAD"], { cwd: root, encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean);
  const forbidden = changed.filter((file) => forbiddenChangedFiles.includes(file) || forbiddenChangedPrefixes.some((prefix) => file.startsWith(prefix)));
  assert(forbidden.length === 0, `forbidden paths changed: ${forbidden.join(", ")}`);
});

const results = {
  generated_at: new Date().toISOString(),
  status: "PASS",
  checks,
  file_hashes: Object.fromEntries(requiredFiles.map((file) => [file, sha256(read(file))])),
  public_internal_boundary: "PASS",
  gitbook_publication: "NOT_PERFORMED_DRY_RUN_ONLY"
};

writeFileSync(join(validationDir, "doc-validation-results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

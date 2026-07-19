import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const publicRoot = join(root, "docs/gitbook/public");
const reviewDir = join(root, "docs/reviews/gitbook-redesign");
const output = join(reviewDir, "VALIDATION_RESULTS.json");
mkdirSync(reviewDir, { recursive: true });

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const target = join(directory, entry);
    return statSync(target).isDirectory() ? walk(target) : [target];
  });
}

function command(name, args, env = {}) {
  execFileSync(name, args, { cwd: root, stdio: "pipe", env: { ...process.env, ...env } });
}

const checks = [];
function check(name, fn) {
  fn();
  checks.push({ name, status: "PASS" });
}

const navigation = JSON.parse(read("docs/gitbook/public/navigation.json"));
const markdownFiles = walk(publicRoot).filter((file) => file.endsWith(".md"));
const publicText = [
  ...walk(publicRoot).filter((file) => !file.endsWith(".png")).map((file) => readFileSync(file, "utf8")),
  read("docs/openapi/signgate-public-v0.1.openapi.json")
].join("\n");

check("required roots and manifests exist", () => {
  for (const file of [
    ".gitbook.yaml",
    "docs/gitbook/public/SUMMARY.md",
    "docs/gitbook/public/navigation.json",
    "docs/gitbook/public/en/README.md",
    "docs/gitbook/public/zh-TW/README.md",
    "docs/gitbook/internal/README.md",
    "docs/openapi/signgate-public-v0.1.openapi.json",
    "tools/gitbook-sync/sync.mjs"
  ]) assert(existsSync(join(root, file)), `missing ${file}`);
});

check("navigation resolves and locale hierarchy is symmetric", () => {
  assert(navigation.defaultLocale === "en", "English must be the default locale");
  assert(navigation.locales.map(({ code }) => code).join(",") === "en,zh-TW", "locale order mismatch");
  assert(navigation.sections.length === 7, "expected seven navigation sections");
  for (const section of navigation.sections) {
    for (const page of section.pages) {
      for (const locale of navigation.locales) {
        assert(existsSync(join(publicRoot, page.paths[locale.code])), `missing navigation page ${page.paths[locale.code]}`);
      }
    }
  }
});

check("all local Markdown links resolve", () => {
  const broken = [];
  for (const file of markdownFiles) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)) {
      const href = match[1];
      if (/^(https?:|mailto:)/.test(href)) continue;
      if (!existsSync(resolve(dirname(file), href))) broken.push(`${file}: ${href}`);
    }
  }
  assert(broken.length === 0, `broken links:\n${broken.join("\n")}`);
});

check("public wording and product boundary are explicit", () => {
  for (const phrase of [
    "SignGate is the policy and execution control layer for autonomous agents.",
    "Preview execution environment",
    "ALLOW",
    "REQUIRE_APPROVAL",
    "DENY",
    "action-bound",
    "time-limited",
    "single-use",
    "atomic consume",
    "Production execution is not currently available in this preview."
  ]) assert(publicText.includes(phrase), `missing required wording: ${phrase}`);
});

check("public surface contains no internal identifiers", () => {
  for (const phrase of [
    "/internal/dogfood/founder-approval-grants",
    "approval:founder:deploy_change",
    "Founder Gate 4",
    "DEV-SG-001",
    "DOC-SG-001"
  ]) assert(!publicText.toLowerCase().includes(phrase.toLowerCase()), `public content contains ${phrase}`);
});

check("public OpenAPI is parseable and public-only", () => {
  const spec = JSON.parse(read("docs/openapi/signgate-public-v0.1.openapi.json"));
  assert(spec.openapi === "3.1.0", "OpenAPI version mismatch");
  assert(spec.paths["/v1/decisions"]?.post, "create decision missing");
  assert(spec.paths["/v1/decisions/{decision_id}/consume"]?.post, "consume missing");
  assert(Object.keys(spec.paths).length === 2, "unexpected public paths");
  assert(spec.paths["/v1/decisions"].post["x-codeSamples"]?.length === 3, "create code samples missing");
  assert(spec.paths["/v1/decisions/{decision_id}/consume"].post["x-codeSamples"]?.length === 3, "consume code samples missing");
});

check("executable examples parse and fail closed", () => {
  command("bash", ["-n", "docs/gitbook/public/examples/signgate-allow-flow.sh"]);
  command("node", ["--check", "docs/gitbook/public/examples/signgate-allow-flow.mjs"]);
  command("python3", ["-m", "py_compile", "docs/gitbook/public/examples/signgate_allow_flow.py"], { PYTHONPYCACHEPREFIX: "/tmp/signgate-doc-pycache" });
  const examples = [
    read("docs/gitbook/public/examples/signgate-allow-flow.sh"),
    read("docs/gitbook/public/examples/signgate-allow-flow.mjs"),
    read("docs/gitbook/public/examples/signgate_allow_flow.py")
  ].join("\n");
  assert(examples.includes("SIGNGATE_BASE_URL"), "base URL environment variable missing");
  assert(examples.includes("SIGNGATE_API_KEY"), "API key environment variable missing");
  assert(examples.includes('!= "ALLOW"') || examples.includes("!= 'ALLOW'"), "non-ALLOW stop missing");
  assert(!/gb_api_[A-Za-z0-9]+/.test(examples), "GitBook token-like value detected");
});

check("sync is dry-run by default and public-only", () => {
  const output = execFileSync("node", ["tools/gitbook-sync/sync.mjs"], { cwd: root, encoding: "utf8" });
  const plan = JSON.parse(output);
  assert(plan.mode === "DRY_RUN", "sync default is not dry-run");
  assert(plan.publication_performed === false && plan.merge_performed === false, "unsafe default action");
  assert(plan.allowlisted_files.every((file) => !file.includes("/internal/") && !file.includes("signgate-internal")), "internal file allowlisted");
});

check("documentation branch does not change implementation", () => {
  const changed = execFileSync("git", ["diff", "--name-only", "d60a4cd2f2d033f64f62b0d84486747276b131ca..HEAD"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  const forbidden = changed.filter((file) => ["src/", "migrations/", "test/", "evidence/", "package.json", "package-lock.json", "wrangler.jsonc"].some((prefix) => file === prefix || file.startsWith(prefix)));
  assert(forbidden.length === 0, `implementation paths changed: ${forbidden.join(", ")}`);
});

const results = {
  generated_at: new Date().toISOString(),
  status: "PASS",
  checks,
  counts: {
    markdown_pages: markdownFiles.length,
    english_pages: markdownFiles.filter((file) => file.includes("/en/")).length,
    traditional_chinese_pages: markdownFiles.filter((file) => file.includes("/zh-TW/")).length,
    navigation_sections: navigation.sections.length
  },
  hashes: {
    navigation: createHash("sha256").update(read("docs/gitbook/public/navigation.json")).digest("hex"),
    public_openapi: createHash("sha256").update(read("docs/openapi/signgate-public-v0.1.openapi.json")).digest("hex")
  },
  public_internal_boundary: "PASS",
  gitbook_publication: "NOT_PERFORMED"
};

writeFileSync(output, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results, null, 2));

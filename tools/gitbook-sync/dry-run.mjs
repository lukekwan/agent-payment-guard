import { readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const validationDir = join(root, "docs", "examples", "validation");
mkdirSync(validationDir, { recursive: true });

const roots = [
  "docs/openapi",
  "docs/en",
  "docs/zh",
  "docs/examples",
  "tools/gitbook-sync",
  "DOC-SG-001_API_DOCUMENTATION_REPORT.md"
];

function walk(path) {
  const absolute = join(root, path);
  try {
    const stats = statSync(absolute);
    if (stats.isFile()) {
      return [path];
    }
    return readdirSync(absolute)
      .flatMap((entry) => walk(relative(root, join(absolute, entry))))
      .sort();
  } catch {
    return [];
  }
}

const files = roots.flatMap(walk).filter((file) => !file.endsWith(".pyc"));
const manifest = {
  generated_at: new Date().toISOString(),
  status: "DRY_RUN_ONLY",
  publication_performed: false,
  network_calls_performed: false,
  gitbook_token_required: false,
  target: "GitBook draft/change-request automation only when separately authorized",
  files
};

writeFileSync(join(validationDir, "gitbook-dry-run-results.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

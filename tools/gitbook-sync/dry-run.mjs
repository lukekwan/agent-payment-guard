import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const navigation = JSON.parse(readFileSync(join(root, "docs/gitbook/public/navigation.json"), "utf8"));
const output = join(root, "docs/reviews/gitbook-redesign/evidence/gitbook-dry-run-results.json");
const files = [
  ".gitbook.yaml",
  "docs/gitbook/public/SUMMARY.md",
  "docs/gitbook/public/navigation.json",
  ...navigation.locales.flatMap((locale) => [
    `docs/gitbook/public/${locale.code}/README.md`,
    ...navigation.sections.flatMap((section) => section.pages.map((page) => `docs/gitbook/public/${page.paths[locale.code]}`))
  ]),
  "docs/openapi/signgate-public-v0.1.openapi.json"
];

const manifest = {
  generated_at: new Date().toISOString(),
  status: "DRY_RUN_ONLY",
  publication_performed: false,
  merge_performed: false,
  deletion_performed: false,
  network_calls_performed: false,
  credentials_read: false,
  target: "GitBook draft/change request",
  hierarchy: {
    default_locale: navigation.defaultLocale,
    locales: navigation.locales.map(({ code, label }) => ({ code, label })),
    sections: navigation.sections.map(({ id, title, pages }) => ({ id, title, pages: pages.length }))
  },
  files: [...new Set(files)].sort(),
  openapi: {
    source: "docs/openapi/signgate-public-v0.1.openapi.json",
    sha256: createHash("sha256").update(readFileSync(join(root, "docs/openapi/signgate-public-v0.1.openapi.json"))).digest("hex")
  },
  excluded: ["docs/gitbook/internal", "docs/openapi/signgate-internal-v0.1.openapi.json"]
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify(manifest, null, 2));

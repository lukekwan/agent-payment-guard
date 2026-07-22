import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const importStandalone = args.has("--import-standalone");
const apiBase = process.env.GITBOOK_API_BASE_URL || "https://api.gitbook.com/v1";
const token = process.env.GITBOOK_API_TOKEN;
const organizationId = process.env.GITBOOK_ORGANIZATION_ID;
const spaceId = process.env.GITBOOK_SPACE_ID;
const repositoryUrl = process.env.GITBOOK_REPOSITORY_URL || "https://github.com/lukekwan/agent-payment-guard.git";
const branch = process.env.GITBOOK_BRANCH || "docs/doc-sg-001-gitbook-redesign";
const subject = process.env.GITBOOK_CHANGE_REQUEST_SUBJECT || "SignGate enterprise developer portal redesign";
const specSlug = process.env.GITBOOK_OPENAPI_SLUG || "signgate-decision-api-v0-1";
const specSourceUrl = process.env.GITBOOK_OPENAPI_SOURCE_URL
  || `https://raw.githubusercontent.com/lukekwan/agent-payment-guard/${branch}/docs/openapi/signgate-public-v0.1.openapi.json`;

const navigation = JSON.parse(readFileSync(join(root, "docs/gitbook/public/navigation.json"), "utf8"));
const openapiText = readFileSync(join(root, "docs/openapi/signgate-public-v0.1.openapi.json"), "utf8");
const publicFiles = [
  "docs/gitbook/public/SUMMARY.md",
  "docs/gitbook/public/navigation.json",
  ...navigation.locales.flatMap((locale) => [
    `docs/gitbook/public/${locale.code}/README.md`,
    ...navigation.sections.flatMap((section) => section.pages.map((page) => `docs/gitbook/public/${page.paths[locale.code]}`))
  ]),
  "docs/openapi/signgate-public-v0.1.openapi.json"
];

const forbidden = [
  "/internal/dogfood/founder-approval-grants",
  "approval:founder:deploy_change",
  "Founder Gate 4",
  "DEV-SG-001",
  "DOC-SG-001"
];

function fail(message) {
  throw new Error(message);
}

function redact(value) {
  if (!value) return "<unset>";
  if (value.length < 9) return "***";
  return `${value.slice(0, 3)}…${value.slice(-3)}`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

for (const file of publicFiles) {
  const text = readFileSync(join(root, file), "utf8");
  for (const phrase of forbidden) {
    if (text.toLowerCase().includes(phrase.toLowerCase())) fail(`public allowlist violation in ${file}: ${phrase}`);
  }
}

const plan = {
  mode: apply ? "APPLY_DRAFT_ONLY" : "DRY_RUN",
  publication_performed: false,
  merge_performed: false,
  deletion_performed: false,
  organization_id: organizationId || "<required-for-apply>",
  space_id: spaceId || "<required-for-apply>",
  token: redact(token),
  branch,
  repository_url: repositoryUrl,
  change_request_subject: subject,
  local_hierarchy: {
    default_locale: navigation.defaultLocale,
    locales: navigation.locales.map(({ code, label }) => ({ code, label })),
    sections: navigation.sections.map(({ id, title, pages }) => ({ id, title, pages: pages.length })),
    page_count: navigation.locales.length * (1 + navigation.sections.reduce((count, section) => count + section.pages.length, 0))
  },
  public_openapi: {
    slug: specSlug,
    source_url: specSourceUrl,
    sha256: sha256(openapiText)
  },
  allowlisted_files: [...new Set(publicFiles)].sort(),
  requested_actions: [
    "GET target space and current page hierarchy",
    "GET draft change requests and reuse the matching subject when present",
    "POST one draft change request only when no matching draft exists",
    importStandalone ? "POST a standalone Git import revision (never primary content)" : "Skip Git import unless --import-standalone is supplied",
    "GET resulting draft page hierarchy",
    "PUT the public OpenAPI source URL under an idempotent slug"
  ],
  prohibited_actions: ["publish", "merge", "delete", "archive primary space", "upload internal files"]
};

if (!apply) {
  console.log(JSON.stringify(plan, null, 2));
  process.exit(0);
}

if (!token || !organizationId || !spaceId) {
  fail("--apply requires GITBOOK_API_TOKEN, GITBOOK_ORGANIZATION_ID, and GITBOOK_SPACE_ID");
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) fail(`GitBook ${method} ${path} failed with HTTP ${response.status}: ${payload?.message || "redacted error"}`);
  return payload;
}

const space = await api(`/spaces/${encodeURIComponent(spaceId)}`);
const currentPages = await api(`/spaces/${encodeURIComponent(spaceId)}/content/pages?metadata=false&computed=false`);
const drafts = await api(`/spaces/${encodeURIComponent(spaceId)}/change-requests?status=draft&limit=100`);
let changeRequest = (drafts.items || []).find((candidate) => candidate.subject === subject);
let reused = true;
if (!changeRequest) {
  reused = false;
  changeRequest = await api(`/spaces/${encodeURIComponent(spaceId)}/change-requests`, {
    method: "POST",
    body: { subject }
  });
}

let standaloneImport = null;
if (importStandalone) {
  await api(`/spaces/${encodeURIComponent(spaceId)}/git/import`, {
    method: "POST",
    body: {
      url: repositoryUrl,
      ref: `refs/heads/${branch}`,
      repoTreeURL: `https://github.com/lukekwan/agent-payment-guard/tree/${branch}/`,
      repoCommitURL: "https://github.com/lukekwan/agent-payment-guard/commit/",
      repoProjectDirectory: "docs/gitbook/public",
      timestamp: new Date().toISOString(),
      force: false,
      standalone: true,
      gitInfo: { provider: "github", url: repositoryUrl }
    }
  });
  standaloneImport = "STARTED";
}

const draftPages = await api(`/spaces/${encodeURIComponent(spaceId)}/change-requests/${encodeURIComponent(changeRequest.id)}/content/pages?metadata=false&computed=false`);
const openapi = await api(`/orgs/${encodeURIComponent(organizationId)}/openapi/${encodeURIComponent(specSlug)}`, {
  method: "PUT",
  body: { source: { url: specSourceUrl } }
});

console.log(JSON.stringify({
  ...plan,
  status: "DRAFT_READY",
  target_space: { id: space.id, title: space.title },
  current_remote_pages: currentPages.pages?.length ?? null,
  change_request: {
    id: changeRequest.id,
    number: changeRequest.number,
    status: changeRequest.status,
    reused,
    app_url: changeRequest.urls?.app || null,
    preview_url: changeRequest.urls?.location || null
  },
  draft_remote_pages: draftPages.pages?.length ?? null,
  standalone_import: standaloneImport,
  openapi: { slug: openapi.slug, processing_state: openapi.processingState, app_url: openapi.urls?.app || null }
}, null, 2));

# SignGate GitBook draft sync

This tooling prepares the redesigned public portal as a GitBook draft/change request. It never publishes, merges, deletes, or uploads internal documentation.

## Safety model

- Dry-run is the default. `sync.mjs` performs no network request unless `--apply` is present.
- Credentials are read only from environment variables and are redacted from output.
- The allowlist contains `docs/gitbook/public/` plus `docs/openapi/signgate-public-v0.1.openapi.json`.
- `docs/gitbook/internal/` and the internal OpenAPI document are always excluded.
- A matching draft subject is reused, making repeated runs idempotent.
- OpenAPI is updated under a stable slug with `PUT`.
- No code path calls GitBook publish, merge, delete, or archive endpoints.

## Validate and preview the plan

```bash
node tools/gitbook-sync/validate-docs.mjs
node tools/gitbook-sync/dry-run.mjs
node tools/gitbook-sync/sync.mjs
```

## Create or update a GitBook draft

```bash
export GITBOOK_API_TOKEN="<personal-access-token>"
export GITBOOK_ORGANIZATION_ID="<organization-id>"
export GITBOOK_SPACE_ID="<space-id>"
export GITBOOK_BRANCH="docs/doc-sg-001-gitbook-redesign"

node tools/gitbook-sync/sync.mjs --apply
```

The apply mode reads the current space hierarchy, reuses or creates one draft change request, reads its page hierarchy, and updates the public OpenAPI source. To additionally ask GitBook to import the Git branch as a standalone revision without modifying primary content, add `--import-standalone` after the branch has been pushed.

Optional variables:

- `GITBOOK_API_BASE_URL`
- `GITBOOK_REPOSITORY_URL`
- `GITBOOK_CHANGE_REQUEST_SUBJECT`
- `GITBOOK_OPENAPI_SLUG`
- `GITBOOK_OPENAPI_SOURCE_URL`

After apply completes, review the returned `app_url` or `preview_url` in GitBook. Publishing and merging remain manual, separate actions.

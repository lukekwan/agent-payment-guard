# DOC-SG-001 GitBook Validation Tooling

This directory contains isolated validation and dry-run tooling for DOC-SG-001.

Rules:

- Git repository and OpenAPI files are the source of truth.
- GitBook is only a presentation/publication layer.
- These scripts do not publish.
- These scripts do not require or read production credentials.
- Any future GitBook API integration must read tokens from environment variables only.

Commands:

```sh
node tools/gitbook-sync/validate-docs.mjs
node tools/gitbook-sync/dry-run.mjs
```

`validate-docs.mjs` checks the public/internal OpenAPI boundary, required preview/fail-closed wording, examples, syntax, and forbidden-path isolation.

`dry-run.mjs` prints the files that would be staged for a GitBook draft/change request. It performs no network calls and creates no publication.

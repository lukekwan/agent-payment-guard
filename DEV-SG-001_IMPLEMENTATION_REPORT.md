# DEV-SG-001 Implementation Report

Status: ready for PM implementation review.

## Scope

- Implemented action scope: `deploy_change`
- Canonical decision endpoint: `POST /v1/decisions`
- Consume interface: `POST /v1/decisions/{decision_id}/consume`
- Founder approval interface: `POST /internal/dogfood/founder-approval-grants`
- Wrapper: preview/local exported wrapper service only; no production deploy execution
- Commerce adapter: existing `/v1/agentic-commerce/preflight` preserved as a documented non-live commerce stub

## Frozen Commit

- Implementation base commit: `5ac67be4fe17b5c1b773bcc584080cad704f4959`
- Frozen implementation commit: `c09da133d79769525bd6a66dda05cb95eb3cee17`
- Frozen implementation tree: `a414c5f3d1d3a3e73abfa1632c922b13e2c18249`
- Package SHA-256: `fa418e6f999d9a459e779d38576aaca09c42de7121c53f59a28665df19250e92`
- Lockfile SHA-256: `152dda37652076b148f9498f2137e47ddf3c5ca8d879823842909686e0ce4acd`
- Wrangler config SHA-256: `d6d96528855f901e4f3f8e4e0405b7d2c984dcbcbf79f0a855249cc20244a770`
- Migration SHA-256: `a4ef2e131e29f20019b2300ae82748fca9d44d6c13dc0e5e3cb36aa3f0edd862`

## Implementation

- Strict JSON intake uses `@humanwhocodes/momoa@3.3.10` with `mode: "json"` and `allowTrailingCommas: false`.
- Canonicalization uses `canonicalize@3.0.0` and Web Crypto SHA-256.
- `organization_id` is mandatory and must match the authenticated preview API credential.
- `action.type`, `action.target`, and `action.parameters` are preserved on the wire.
- `changed_paths` and `changed_routes` use validated sorted-unique set normalization without input mutation.
- Decision enum is stored separately from lifecycle state.
- Production intent can be represented and fingerprinted but cannot receive executable ALLOW before Founder Gate 4.
- Approval grants are Founder-only, organization/action/policy bound, and consumed by a fresh evaluation.
- A valid ALLOW is single-use and must be atomically consumed before preview/local execution.
- Expiry is irreversible and creates expiry audit evidence when first observed.
- Retained records include `delete_after` fields and cleanup indexes.

## D1 Tables

- `signgate_api_credentials`
- `signgate_decisions`
- `signgate_request_idempotency`
- `signgate_approval_grants`
- `signgate_consume_receipts`
- `signgate_audit_events`
- `signgate_execution_results`

## Tests

- `npm ci`: PASS
- `npm run check`: PASS
- Product test count: 46
- Pass count: 46
- Fail count: 0

The product test command is scoped to `test/*.test.js`; preimplementation spike harnesses are retained as evidence but are not part of the production application test suite.

## DF Scenarios

- DF-01: PASS
- DF-02: PASS
- DF-03: PASS
- DF-04: PASS
- DF-05: PASS
- DF-06: PASS
- DF-07: PASS

## Status Matrix

- Strict JSON: PASS
- Auth/tenancy: PASS
- Fingerprint: PASS
- Idempotency: PASS
- Policy evaluation: PASS
- Approval lifecycle: PASS
- D1 atomic consume implementation: PASS in product-level isolated store tests; remote D1 runtime proof remains the accepted preimplementation evidence
- Wrapper fail-closed: PASS
- Audit/retention: PASS

## Forbidden Scope

No main merge, production deploy, production D1, production credentials, payment/x402 enforcement, `send_external_message`, dashboard, SSO, general IAM, QA dispatch, Independent Reviewer dispatch, release, or Founder Gate 4 claim was performed.

## Evidence

Evidence directory: `evidence/dev-sg-001-implementation/`

- `npm-ci.txt`
- `npm-run-check.txt`
- `test-results.json`
- `test-results.tap`
- `df-scenario-results.json`
- `contract-results.json`
- `policy-results.json`
- `fingerprint-results.json`
- `consume-results.json`
- `wrapper-results.json`
- `versions-and-hashes.txt`
- `changed-files.txt`
- `route-list.txt`
- `d1-tables-and-migrations.txt`
- `forbidden-scope-check.txt`
- `secret-review.txt`
- `git-status-before-evidence-commit.txt`

## Known Limitations

- v0.1 implements only `deploy_change`.
- Commerce/x402 enforcement remains a documented non-live stub for this sprint.
- Production execution remains blocked until separate Founder Gate 4 authorization.
- No dashboard, approval inbox, SSO, general IAM, payment signer integration, or external-message action was implemented.

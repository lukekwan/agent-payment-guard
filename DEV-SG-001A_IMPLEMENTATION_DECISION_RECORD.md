# DEV-SG-001A Implementation Decision Record

TASK_ID=DEV-SG-001

Checkpoint: DEV-SG-001A - Implementation Decision Record

Status: READY_FOR_PM_REVIEW

Created at: 2026-07-18T22:25:49+08:00

Developer worktree:

`/Users/0xkwan/.openclaw/worktrees/dev-sg-001`

Developer branch:

`dev/sg-001-deploy-change-decision`

Developer base commit:

`b0d31ae5117ce6da042bab9dde8fd0fcce87238c`

Approved PM contract commit:

`900ec4ff27420524f27a5cc8d9a403867aaf4c4e`

Approved PM contract packet:

`docs/signgate/pm-contract-v0.1/approved/`

DEV_SPEC_INTAKE_GATE=PASS

IMPLEMENTATION_DESIGN_STATUS=READY_FOR_PM_REVIEW

IMPLEMENTATION_STATUS=NOT_STARTED

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTED_ACTION_SCOPE=deploy_change

COMMERCE_ADAPTER_STATUS=DOCUMENTED_NON_LIVE_STUB

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

## 1. Decision Summary

This record authorizes no implementation yet. It records the technical choices
for the first `deploy_change` vertical slice so PM can review them against the
frozen contract before code, routes, migrations, or deployments begin.

| Area | Decision status | Selected decision |
|---|---|---|
| Transactional state technology | SELECTED | Cloudflare D1 using conditional SQL compare-and-set and uniqueness constraints. |
| Atomic consume model | SELECTED | `AVAILABLE` to `CONSUMED` through a single conditional update scoped by organization, decision, fingerprint, state, and expiry. |
| Trusted time | SELECTED | Worker server time from `Date.now()`/`new Date().toISOString()` with 60 second maximum accepted caller clock skew. |
| API-key authentication | SELECTED | Scoped bearer API keys with one-way SHA-256 hashes, key prefixes for lookup, org binding, principal type, scopes, rotation, and revocation. |
| Founder approval auth | SELECTED | Internal dogfood founder API key with separate `approver` principal and `founder_deploy_approver` scope. |
| RFC 8785 library | SELECTED | `canonicalize@3.0.0` after duplicate-key and schema rejection; use Worker Web Crypto SHA-256. |
| `deploy_change` fields | SELECTED | Closed field set below, with explicit required, optional, normalized, and prohibited fields. |
| Consume surface | SELECTED | Preview-protected route `POST /v1/decisions/{decision_id}/consume`; not a generally available production API. |
| Audit retention | SELECTED | Minimum D1 audit rows with scheduled 30-day deletion/anonymization. |
| Commerce adapter | DEFERRED | Documentation/schema/tests only; no live payment/x402 enforcement adapter in this sprint. |

## A. Existing System Assessment

Decision status: SELECTED

### Current Repository Structure

The current Developer base is a JavaScript Cloudflare Worker project named
`base-agent-preflight`.

- `src/index.js`: single large Worker module containing Hono routes, x402
  discovery, public pages, decision helpers, current payment-guard helpers, D1
  access helpers, and the Worker export.
- `migrations/*.sql`: existing D1 schema for payment-guard evaluations,
  profiles, approval status, merchant stats, webhook outbox, and x402 purchase
  analytics.
- `test/index.test.js`: Node test coverage for route discovery, existing
  preflight builders, payment guard helpers, x402 helpers, landing page and
  Formspree wiring.
- `packages/agent-buyer-policy-kit`: local policy kit with JS/Python
  deterministic evaluators and tests.
- `packages/agent-memory-kit`: local memory package tests.
- `sdk/javascript`, `sdk/python`: current client SDK packages for hosted
  payment guard APIs.
- `mcp`: MCP wrapper that calls the existing SignGate preflight surface and
  fails closed for non-ALLOW or malformed responses.
- `wrangler.jsonc`: Cloudflare Worker config with Workers dev enabled,
  `nodejs_compat`, KV binding `ADDRESS_RISK_KV`, D1 binding `GUARD_DB`, and a
  cron trigger.

### Current Worker/Runtime Architecture

- Runtime: Cloudflare Workers using Hono.
- Discovery/commercial surfaces: OpenAPI, `.well-known/x402`,
  `.well-known/service.json`, `.well-known/agent-card.json`, catalogs, registry,
  workflows, endpoint text listings, x402 middleware, and public landing pages.
- Persistence: Cloudflare D1 (`GUARD_DB`) for payment-guard state and x402
  purchase analytics; Cloudflare KV (`ADDRESS_RISK_KV`) for address-risk
  manifests/snapshots.
- Network dependencies: Base RPC providers, Blockscout, x402 facilitator,
  BlockchainSecurity, and public registries for existing x402 products.
- Current API design pattern: routes parse JSON/query input inside
  `src/index.js`, validate with local functions/regexes, return JSON with Hono,
  and use D1 prepared statements for existing stateful paths.

### Current Persistence Mechanisms

Reusable:

- `GUARD_DB` D1 binding is already configured and is the natural place for
  v0.1 preview control state.
- Existing D1 tables already demonstrate unique `request_id`, profile token
  hashes, approval status fields, signed decision tokens, webhook outbox, and
  payment event audit records.
- Existing code already uses `crypto.subtle.digest`/hash helper patterns and
  D1 prepared statements.

Not reusable as-is:

- Existing `payment_guard_evaluations` is payment/x402-specific and uses the
  older `ALLOW`/`REVIEW`/`BLOCK` vocabulary. The frozen PM contract requires
  `ALLOW`/`REQUIRE_APPROVAL`/`DENY` and a general `POST /v1/decisions`.
- Existing approval paths are owner-token based payment-guard helpers, not the
  Founder-only dogfood approval authority required for `deploy_change`.
- Existing decision tokens are not the immutable action-bound v0.1 artifacts
  with RFC 8785 fingerprints and atomic consume.

### Current Routes and Compatibility Surfaces

Reusable/preserved:

- Existing x402 routes and discovery documents must remain visible.
- `/v1/agentic-commerce/preflight` must not be deleted or silently replaced.
- OpenAPI and discovery generation should be extended additively.

New required surface:

- `POST /v1/decisions`
- Preview-protected/internal consume operation:
  `POST /v1/decisions/{decision_id}/consume`

Compatibility rule:

- Commerce preflight remains a documented non-live stub in this sprint.
- Legacy aliases may be derived from the canonical decision, but must not
  authorize independently or use divergent semantics.

### Infrastructure Constraints

- Cloudflare Worker request handlers must be fast and fail closed on D1, policy,
  audit, or canonicalization errors.
- D1 conditional updates and unique constraints must be the enforcement
  authority for idempotency, approval-grant use, and consume state.
- Worker logs can easily leak request bodies if debug dumps are introduced;
  logging must be structured allowlist-only.
- Worker secret storage supports API secrets, but stored application keys must
  be one-way hashed in D1.
- Cron is already configured and can run retention cleanup, but cron execution
  is not guaranteed at exact wall-clock boundaries; retention must be safe if
  delayed.
- Current production Worker exists, but this checkpoint does not authorize
  deployment.

### Components to Reuse

- Hono app structure and JSON response conventions.
- Existing D1 binding and prepared-statement style.
- Existing `sha256Hex` pattern after adapting it to exact RFC 8785 byte inputs.
- Existing test framework (`node:test`) and `npm run check`.
- Existing OpenAPI/discovery generation as additive surfaces.
- Existing Formspree contact and public page language only as claims surfaces;
  no form data enters SignGate control state.

### New Components Required

- Closed schema parser for `POST /v1/decisions`.
- Duplicate-key rejecting JSON parser for request bodies and action payloads.
- RFC 8785 canonicalizer/fingerprinter for `deploy_change`.
- D1 schema for organizations, API keys, mandates, policy templates, decisions,
  idempotency records, approval grants, consume receipts, and audit events.
- Founder-only dogfood approval grant issuer.
- Preview-protected consume operation.
- Non-production dogfood enforcement wrapper.
- Contract tests, concurrency tests, tenancy tests, clock-boundary tests, and
  RFC 8785 golden vectors.

## B. Transactional State

Decision status: SELECTED

### Selected State Technology

Use Cloudflare D1 (`GUARD_DB`) for v0.1 preview state.

Rationale:

- The Worker already has a D1 binding and migration flow.
- D1 supports SQL uniqueness constraints and conditional updates, which are
  enough for request idempotency and single-use consume when every transition is
  encoded as a write with an expected prior state.
- Keeping the state in D1 avoids introducing a second Cloudflare primitive in
  the first sprint and keeps QA evidence inspectable through SQL.

Alternatives:

- REJECTED: Cloudflare KV. KV is not suitable for atomic consume because it
  cannot provide the required compare-and-set semantics.
- REJECTED: R2/object storage. Object writes are not a transaction store.
- DEFERRED: Durable Objects. Durable Objects are attractive for per-decision or
  per-tenant serialization, but add routing/configuration complexity and are not
  needed if D1 conditional writes pass concurrency tests.
- DEFERRED: External Postgres. Operationally heavier and not present in current
  infrastructure.

Operational risk:

- D1 availability or write latency can block decisions or consumes.
- D1 read replicas, if used incorrectly, may create stale reads. Implementation
  must use write-authoritative operations for consume/idempotency decisions and
  fail closed if consistency is uncertain.

Security risk:

- Bugs in tenant scoping or indexes could reveal or mutate another
  organization's records. Every unique key and lookup must include
  `organization_id`.

Migration cost:

- Moderate. Requires new migrations but can reuse the existing D1 binding.

Contract compatibility:

- Compatible if conditional writes enforce idempotency, approval grant use, and
  single-use consume exactly.

Failure condition:

- If D1 conditional write results cannot prove exactly one winning consume under
  concurrent tests, implementation must stop and revisit Durable Objects before
  PM/QA acceptance.

### Data Model

Proposed D1 tables:

- `signgate_organizations`
  - `organization_id` primary key
  - `name`
  - `status`
  - `created_at`
  - `updated_at`
- `signgate_api_keys`
  - `key_id` primary key
  - `organization_id`
  - `key_prefix` unique for lookup
  - `key_hash`
  - `principal_id`
  - `principal_type` enum: `agent`, `executor`, `approver`, `internal_service`
  - `scopes_json`
  - `active`
  - `created_at`
  - `rotated_from_key_id`
  - `revoked_at`
- `signgate_mandates`
  - `mandate_id`
  - `organization_id`
  - `scope_json`
  - `issuer_principal_id`
  - `status`
  - `expires_at`
  - composite primary key: `organization_id`, `mandate_id`
- `signgate_decision_idempotency`
  - `organization_id`
  - `request_id`
  - `request_fingerprint`
  - `decision_id`
  - `created_at`
  - composite unique: `organization_id`, `request_id`
- `signgate_decisions`
  - `decision_id` primary key
  - `organization_id`
  - `request_id`
  - `request_fingerprint`
  - `action_type`
  - `action_fingerprint`
  - `decision`
  - `state` enum: `AVAILABLE`, `CONSUMED`, `NON_EXECUTABLE`, `EXPIRED`
  - `policy_version`
  - `bound_action_json`
  - `execution_directive_json`
  - `reason_codes_json`
  - `evidence_refs_json`
  - `approval_grant_id`
  - `issued_at`
  - `expires_at`
  - `created_at`
  - unique: `organization_id`, `decision_id`
- `signgate_approval_grants`
  - `approval_grant_id` primary key
  - `organization_id`
  - `original_decision_id`
  - `action_fingerprint`
  - `policy_version`
  - `approver_principal_id`
  - `approver_role`
  - `status` enum: `AVAILABLE`, `USED`, `REVOKED`, `EXPIRED`
  - `used_by_decision_id`
  - `approved_at`
  - `expires_at`
  - `created_at`
- `signgate_consume_receipts`
  - `consume_receipt_id` primary key
  - `organization_id`
  - `decision_id`
  - `action_fingerprint`
  - `execution_attempt_id`
  - `executor_principal_id`
  - `consumed_at`
  - unique: `organization_id`, `decision_id`
  - unique: `organization_id`, `decision_id`, `execution_attempt_id`
- `signgate_audit_events`
  - `audit_id` primary key
  - `organization_id`
  - `event_type`
  - `actor_principal_id`
  - `decision_id`
  - `request_id`
  - `action_fingerprint`
  - `result_code`
  - `metadata_json`
  - `created_at`
  - `delete_after`

### Transaction Boundaries

- Decision request:
  - Authenticate and derive organization/principal.
  - Parse and validate closed schema.
  - Canonicalize and fingerprint action.
  - Check idempotency.
  - Evaluate policy.
  - Persist audit before returning `200`.
  - Persist decision and idempotency in one D1 batch/transaction-equivalent
    sequence; if persistence fails, return system error and no policy enum.
- Approval grant use:
  - Conditional update grant from `AVAILABLE` to `USED`.
  - Insert new `ALLOW` decision bound to the same fingerprint.
  - Exact retry returns the same logical result.
- Consume:
  - Conditional update decision from `AVAILABLE` to `CONSUMED`.
  - Insert consume receipt.
  - Exact retry by same `execution_attempt_id` returns same receipt.

### Concurrency and Recovery

- The consume winner is the first write that changes one row where all expected
  conditions match.
- Losers receive `409 DECISION_ALREADY_CONSUMED` unless they are exact retries
  with the same attempt ID.
- If D1 is unavailable, response is `503` with `enforcement_effect: DENY` and no
  policy enum.
- If audit persistence fails, no `ALLOW` is returned.
- If external execution fails after consume, the decision remains consumed and a
  new decision is required.

## C. Atomic Consume

Decision status: SELECTED

### State Transition

Exact transition:

```sql
UPDATE signgate_decisions
SET state = 'CONSUMED', consumed_at = :now
WHERE organization_id = :organization_id
  AND decision_id = :decision_id
  AND decision = 'ALLOW'
  AND state = 'AVAILABLE'
  AND action_fingerprint = :action_fingerprint
  AND expires_at >= :now;
```

Implementation then inserts the consume receipt for the winning transition. If
receipt insertion fails after the state transition, retry logic must recover by
reading the decision and receipt under the same org/decision and returning a
system failure until consistency is repaired. It must not mint a second
consume.

### Same Attempt Retry

SELECTED:

- `execution_attempt_id` is generated by the executor.
- A retry with the same `execution_attempt_id`, organization, decision, and
  action fingerprint returns the original consume receipt.
- If the original receipt has not appeared yet but the decision is already
  consumed, fail closed with `503 CONSUMPTION_STORE_UNAVAILABLE` rather than
  allowing execution without receipt.

### Different Attempt Replay

SELECTED:

- A different `execution_attempt_id` for the same consumed decision returns
  `409 DECISION_ALREADY_CONSUMED` with `enforcement_effect: DENY`.

### External Execution Failure After Consume

SELECTED:

- Consumption is irreversible once the executor crosses the consume boundary.
- If preview deployment/simulation fails afterward, the wrapper records failure
  evidence and requires a new decision request for retry.

### Consume Route Boundary

SELECTED:

- Implement as preview-protected route:
  `POST /v1/decisions/{decision_id}/consume`.
- Do not publish it as generally available production API.
- Require executor-scoped API key and `consume:deploy_change` scope.
- Return a consume receipt only for valid `ALLOW`.

Rationale:

- A preview-protected route is directly testable by the dogfood wrapper and QA.
- It keeps enforcement outside the agent while avoiding a public production
  availability claim.

Alternatives:

- REJECTED: Agent-side local consume. It cannot be authoritative.
- DEFERRED: Pure internal service call with no route. Harder to test from the
  wrapper in the current Worker-only project.

Operational risk:

- Exposing a preview consume route creates a surface that must be protected and
  omitted from public availability claims.

Security risk:

- Weak executor authentication could let a caller consume another executor's
  decision. Mitigation is org-bound executor keys and fingerprint matching.

Migration cost:

- Low to moderate; one Hono route plus D1 state.

Contract compatibility:

- Compatible because the contract allows internal or preview-protected consume
  and forbids general production positioning.

Failure condition:

- If consume cannot prove single-use behavior under concurrency tests, it must
  not be accepted.

## D. Trusted Time

Decision status: SELECTED

### Time Source

Use Worker server time from `Date.now()` and serialize with
`new Date(...).toISOString()`.

Rationale:

- The Worker controls evaluation and consume timing.
- Caller timestamps are claims and cannot be authoritative.

Alternatives:

- REJECTED: Caller-provided time. Not trusted.
- DEFERRED: External trusted time service. Adds dependency; not necessary for
  preview.
- DEFERRED: D1 database time. Useful for consistency, but Worker code still
  needs a clock for response construction.

Operational risk:

- Worker isolate clock movement can affect boundaries. Mitigation is a small
  skew window and fail-closed boundary tests.

Security risk:

- Too-large skew extends executable windows. Skew is capped at 60 seconds.

Migration cost:

- Low.

Contract compatibility:

- Compatible with max 15 minute `ALLOW` validity and expiry enforcement.

Failure condition:

- If Worker time is unavailable or invalid, return `503` without policy enum.

### Maximum Clock Skew

SELECTED:

- Accept maximum 60 seconds skew for evaluating `issued_at` not in future.
- Never extend `expires_at`; executor refuses at or after expiry.

### Boundary Behavior

- `issued_at` greater than trusted now plus 60 seconds: error/fail closed.
- `expires_at` less than or equal to trusted now: not executable.
- Backward clock movement: no decision may become unexpired if it was already
  consumed or logged expired; consume uses current trusted time and state.
- Forward clock movement: may make a decision expire earlier; fail closed.

## E. Authentication and Tenancy

Decision status: SELECTED

### API-Key Creation

SELECTED:

- Generate keys as `sg_{principal_type}_{key_id}_{random_secret}`.
- Store `key_prefix` for lookup and `key_hash = sha256(secret_with_prefix)`.
- Return raw key only once at creation in local/admin tooling.
- No customer self-service key dashboard in v0.1.

### One-Way Hashing and Lookup

SELECTED:

- Lookup by `key_prefix`, then compare SHA-256 hash in constant-time style where
  runtime support permits.
- Store only hash, prefix, org binding, principal binding, scopes, and status.

### Organization Binding

SELECTED:

- Authentication derives `organization_id`; request `organization_id` must
  exactly match or be omitted and server-derived.
- Cross-tenant mismatch returns `403 TENANT_CONTEXT_MISMATCH`.

### Principal Separation

SELECTED:

- `agent`: may request decisions for allowed scopes.
- `executor`: may consume valid `ALLOW` decisions and run wrapper.
- `approver`: may issue Founder approval grants in dogfood scope.
- `internal_service`: may run seed/maintenance operations locally.

### Scope Enforcement

SELECTED:

- Decision route requires `decision:create:deploy_change`.
- Consume route requires `decision:consume:deploy_change`.
- Approval route/mechanism requires `approval:founder:deploy_change`.
- Read/status route, if added for local evidence, requires explicit read scope.

### Rotation and Revocation

SELECTED:

- Rotation creates a new key row linked by `rotated_from_key_id`.
- Revocation sets `active=0`, `revoked_at`, and immediately fails new
  auth attempts.
- Existing decisions remain bound to the original principal and org, but
  consumes require active executor credentials.

### Existing Auth Reuse

REJECTED:

- Existing payment guard owner/agent token logic is payment-specific and
  profile-specific. It can inspire hashing style but must not be reused as the
  canonical SignGate v0.1 principal model.

Rationale:

- Scoped bearer keys are the smallest concrete authentication mechanism that
  supports tenant binding and separate agent/executor/approver principals.

Alternatives:

- REJECTED: Unauthenticated preview endpoint. It cannot establish trusted
  tenant context.
- REJECTED: Caller-provided organization claims without key binding. The PM
  contract requires server-derived tenant context.
- DEFERRED: SSO/RBAC/IAM. Explicitly outside v0.1.

Operational risk:

- Key issuance and rotation are manual in dogfood scope.

Security risk:

- Key leakage enables scoped misuse. Mitigation is least-privilege scopes,
  revocation, one-way hashes, short decision windows, and separate principals.

Migration cost:

- Moderate; requires D1 key table and local/admin issuance tooling later.

Contract compatibility:

- Compatible with scoped API-key preview authentication and no IAM expansion.

Failure condition:

- If a request cannot be bound to exactly one active organization/principal,
  return `401`/`403` and no policy decision.

## F. Founder Approval Authentication

Decision status: SELECTED

### Internal Dogfood Mechanism

Use a Founder-only `approver` API key stored as a Worker secret or generated
locally and persisted hashed in D1. The key maps to a D1 `approver` principal
with `founder_deploy_approver=true` and
`approval:founder:deploy_change` scope.

Rationale:

- The PM contract authorizes one trusted Founder approver for internal dogfood.
- It avoids building a general approval dashboard.

Alternatives:

- REJECTED: Agent-supplied approval JSON. The contract forbids trusting
  arbitrary agent approval.
- REJECTED: Executor approval. Executor credentials must not mint approvals.
- DEFERRED: OAuth/SSO/FIDO2 dashboard. Too broad for v0.1 and explicitly out of
  scope.

Operational risk:

- Secret handling is manual. Mitigate with separate key, minimal scope, and
  revocation.

Security risk:

- Founder key compromise could mint dogfood approvals. Mitigate with short-lived
  grants, action fingerprint binding, and no production deployment authority.

Migration cost:

- Low for dogfood; moderate if later replaced with SSO/FIDO2.

Contract compatibility:

- Compatible because it is internal dogfood only and separates approver from
  agent/executor credentials.

Failure condition:

- If Founder identity cannot be authenticated or mapped to the approver
  principal, return `401`/`403` with `enforcement_effect: DENY`.

### Approval Grant Storage

Approval grants bind:

- `organization_id`
- verified Founder approver principal
- approver role
- approval time
- expiry
- original decision ID
- policy version
- exact action fingerprint

Agent/executor credentials cannot insert or use approval grants except through
the approved re-evaluation flow.

## G. RFC 8785 and Fingerprinting

Decision status: SELECTED

### Library

Use npm package `canonicalize@3.0.0` for RFC 8785 JSON canonicalization.

Rationale:

- It is a small JavaScript package intended for JSON canonicalization.
- It is compatible with an ESM Worker build path.
- It can be pinned in `package-lock.json` and covered by golden vectors.

Alternatives:

- REJECTED: `JSON.stringify` sorted manually. Too easy to miss RFC 8785 details.
- DEFERRED: `json-canonicalize@2.0.0`. Also plausible, but choose one package
  to avoid ambiguity.
- REJECTED: Hand-written canonicalizer in first sprint. High risk and not
  necessary.

Operational risk:

- Package behavior must be verified across Node tests and Worker runtime.

Security risk:

- Canonicalizer does not by itself reject duplicate JSON object keys after
  normal parsing. Duplicate-key detection must run before parsing/canonicalizing.

Migration cost:

- Low, one dependency.

Contract compatibility:

- Compatible if duplicate keys, unknown fields, invalid UTF-8, NaN/infinity,
  and schema-invalid nulls are rejected before fingerprinting.

Failure condition:

- If golden vectors differ from expected RFC 8785 output, implementation must
  fail the contract tests and stop.

### Duplicate Key Rejection

SELECTED:

- Add a strict JSON body parser that scans object member names and rejects
  duplicate keys before standard JSON parsing.
- Use it for `/v1/decisions` and consume request bodies.

### Unknown Field Rejection

SELECTED:

- Use closed schemas for top-level request, `agent`, `mandate`,
  `approval_grant`, `evidence`, and `action`.
- Unknown top-level or `deploy_change` fields return `422 REQUEST_SCHEMA_INVALID`
  or `ACTION_PARAMETERS_UNFINGERPRINTABLE` with `enforcement_effect: DENY`.

### SHA-256 Implementation

SELECTED:

- Use Worker Web Crypto `crypto.subtle.digest("SHA-256", utf8Bytes)` and return
  `sha256:<lowercase_hex>`.
- Node tests may use `node:crypto` for test helpers, but implementation should
  use runtime-compatible Web Crypto.

### Golden Vector Strategy

Golden vectors cover:

- Object key ordering.
- Arrays remain order-sensitive.
- Omission versus null.
- Unicode escaping and normalization boundaries.
- Case-sensitive strings.
- Duplicate-key rejection.
- Every `deploy_change` field below.

### Cross-Language Risk

DEFERRED:

- Publish cross-language vectors after JS implementation is accepted. Python SDK
  compatibility is not implemented in this sprint.

## H. `deploy_change` Canonical Field Set

Decision status: SELECTED

Closed action envelope:

```json
{
  "type": "deploy_change",
  "environment": "preview",
  "service": "base-agent-preflight",
  "repository": {
    "provider": "github",
    "owner": "lukekwan",
    "name": "agent-payment-guard",
    "commit": "..."
  },
  "artifact": {
    "build_digest": "sha256:..."
  },
  "change": {
    "diff_digest": "sha256:...",
    "changed_paths": [],
    "changed_routes": []
  },
  "risk_flags": {
    "touches_secrets": false,
    "touches_dns": false,
    "touches_credentials": false,
    "touches_permissions": false
  },
  "deployment": {
    "strategy": "worker_preview",
    "command_id": "npm-run-dev-preview"
  },
  "configuration_fingerprint": "sha256:...",
  "ci_evidence": {
    "provider": "local",
    "command": "npm run check",
    "commit": "...",
    "result": "pass",
    "evidence_digest": "sha256:..."
  }
}
```

Field decisions:

| Field | Status | Normalization rule |
|---|---|---|
| `environment` | required | Lowercase enum. v0.1 allows `preview` and returns `REQUIRE_APPROVAL` for `production`. Unknown environments `DENY`. |
| `service`/`project` | required | Use one canonical `service` string, 1-128 chars, lowercase/kebab where possible. `project` alias rejected in canonical action. |
| `repository.provider` | required | Lowercase enum, initially `github`. |
| `repository.owner` | required | Exact GitHub owner string from authenticated/repo evidence. |
| `repository.name` | required | Exact repo name. Do not rename repos. |
| `repository.commit` | required | Full 40-char git commit SHA. |
| `artifact.build_digest` | optional | Required when a build artifact exists; `sha256:<hex>`. Omitted when no artifact is produced. Null prohibited. |
| `change.diff_digest` | required | `sha256:<hex>` over the reviewed diff or generated diff evidence. |
| `change.changed_paths` | required | Sorted unique array of relative paths, no `..`, no absolute paths. |
| `change.changed_routes` | required | Sorted unique array of route strings affected by the change; empty array allowed. |
| `risk_flags.touches_secrets` | required | Boolean. If true, policy returns `DENY`. |
| `risk_flags.touches_dns` | required | Boolean. If true, policy returns `REQUIRE_APPROVAL` or `DENY` depending on environment; production remains not authorized. |
| `risk_flags.touches_credentials` | required | Boolean. If true, policy returns `DENY` for v0.1 preview. |
| `risk_flags.touches_permissions` | required | Boolean. If true, policy returns `REQUIRE_APPROVAL` minimum; may be `DENY` without Founder grant. |
| `deployment.strategy` | required | Closed enum: `worker_preview`, `local_simulation`. Production strategies not executable in v0.1. |
| `deployment.command_id` | required | Closed command identifier, not arbitrary shell. |
| `configuration_fingerprint` | optional | `sha256:<hex>` over env/config evidence. Required if config changes. |
| `ci_evidence.provider` | required | `local`, `github_actions`, or `cloudflare_preview`; first sprint can use `local`. |
| `ci_evidence.command` | required | Exact test/check command identity, not raw unbounded shell text. |
| `ci_evidence.commit` | required | Must match `repository.commit`. |
| `ci_evidence.result` | required | `pass` or `fail`; failed tests return `DENY`. |
| `ci_evidence.evidence_digest` | required | `sha256:<hex>` over retained evidence. |

Prohibited:

- Raw secrets, secret values, `.env` contents, private keys, tokens.
- Arbitrary shell commands outside closed `command_id`.
- Unknown action fields.
- `payment`, `x402_purchase`, or `send_external_message` canonicalizers in this
  sprint.
- Production deployment execution.

## I. Audit and Retention

Decision status: SELECTED

### Persisted Fields

Persist:

- Organization ID, principal ID, principal type.
- Request ID and request fingerprint.
- Decision ID, decision enum, policy version, reason codes.
- Bound action JSON and action fingerprint.
- Mandate ID and resolved mandate metadata needed for audit.
- Evidence references/digests, not raw sensitive evidence.
- Approval grant ID and approver principal ID when applicable.
- Consume receipt ID, execution attempt ID, executor principal ID, consumed time.
- Error code, enforcement effect, and system failure category.
- Timestamps and retention deadline.

### Prohibited Fields

Do not persist:

- Raw API keys or tokens.
- Secret values, `.env` contents, private keys, seed phrases.
- Full raw request bodies when they contain prohibited fields.
- Unredacted authorization headers.
- Formspree contact submission content.
- Customer-provided sensitive documents beyond references/digests.

### Structured Logging

SELECTED:

- Log event type, org ID, decision ID, request ID, reason/error code,
  fingerprint prefix, and status.
- Redact headers.
- Disable request-body dumps.

### Retention

SELECTED:

- Preview records have 30-day retention.
- Add scheduled cleanup through existing Worker cron.
- Delete operational rows after 30 days where contract allows.
- For aggregate learning/audit metrics, keep anonymized counters only after
  deleting organization/principal/request/action details.

### Audit Failure Behavior

SELECTED:

- If required audit persistence fails before a valid policy result is returned,
  return `503 AUDIT_STORE_UNAVAILABLE` without policy enum.
- Executor must fail closed on this response.

Rationale:

- The preview needs enough evidence for QA/reviewer replay without retaining
  unnecessary sensitive data.

Alternatives:

- REJECTED: Store full raw request/response bodies. Too much sensitive-data
  risk.
- REJECTED: No persistence. Cannot prove idempotency, approval, audit, or
  single-use enforcement.
- DEFERRED: Formal production retention/legal-hold/residency policy. Outside
  preview scope.

Operational risk:

- Cron cleanup may run late. Rows use `delete_after` so delayed cleanup does not
  alter enforcement semantics.

Security risk:

- Audit metadata can still be sensitive. Mitigation is field allowlists,
  redaction, and 30-day deletion.

Migration cost:

- Moderate; requires new audit table and cleanup routine.

Contract compatibility:

- Compatible with 30-day preview retention and minimum-data storage.

Failure condition:

- If required audit storage is unavailable or redaction cannot be guaranteed,
  the API must fail closed with no `ALLOW`.

## J. API and Error Implementation

Decision status: SELECTED

### `POST /v1/decisions`

SELECTED:

- Authenticated preview endpoint.
- Accepts only frozen request shape.
- Valid policy evaluations return HTTP `200` with one decision enum:
  `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`.
- Response includes `api_status: "preview"`, immutable `decision_id`, bound
  action, action fingerprint, policy version, issue/expiry, execution directive,
  reason codes, and audit ID.

### Consume Operation

SELECTED:

- `POST /v1/decisions/{decision_id}/consume`.
- Requires executor scope.
- Requires recomputed `action_fingerprint` and `execution_attempt_id`.
- Returns consume receipt only after atomic transition.

### Request Idempotency

SELECTED:

- Same `organization_id` and same `request_id` with identical canonical request
  returns original decision.
- Same `request_id` with different canonical request returns `409
  REQUEST_ID_REUSE_MISMATCH`.

### Immutable Decision Artifacts

SELECTED:

- Persist decision and bound action as immutable rows.
- Never mutate a `REQUIRE_APPROVAL` into `ALLOW`.
- Approval re-evaluation creates a new `ALLOW` with a new `decision_id`.

### Error Semantics

SELECTED:

- `200`: successful policy evaluation with decision enum.
- `400`: malformed JSON, `enforcement_effect: DENY`, no executable artifact.
- `401`: missing/invalid auth, `enforcement_effect: DENY`.
- `403`: scope or tenant mismatch, `enforcement_effect: DENY`.
- `409`: request/grant/consume conflict, `enforcement_effect: DENY`.
- `422`: schema or unfingerprintable action, `enforcement_effect: DENY`.
- `5xx/503`: dependency/system failures, no policy enum, no `ALLOW`.

Fail-closed executor behavior:

- Execute only after `200 + ALLOW`, `execution_directive.action=EXECUTE`, valid
  expiry, matching fingerprint, and successful consume receipt.
- Refuse every other response.

## K. Dogfood Enforcement Wrapper

Decision status: SELECTED

### Proposed Interface

Command identifier:

`signgate-preview-deploy`

Proposed local command shape:

```sh
npm run signgate:preview-deploy -- --commit <sha> --evidence <path>
```

This command is a proposed interface only. It is not implemented in this
checkpoint.

### Wrapper Behavior

SELECTED:

- Reconstruct pending deploy action from:
  - git commit SHA
  - git diff digest
  - changed paths
  - changed routes
  - test evidence digest
  - deployment command identifier
  - risk flags for secrets/DNS/credentials/permissions
- Request `POST /v1/decisions` with agent-scoped credential.
- Recompute action fingerprint locally using same canonicalizer.
- Refuse if returned fingerprint differs.
- Refuse unless decision is `ALLOW`.
- Immediately call consume with executor-scoped credential.
- Refuse unless consume returns receipt.
- Execute only preview/local simulation command.
- Record execution evidence: command ID, commit, action fingerprint, decision
  ID, consume receipt ID, result, and output digest.

### Refusal Cases

The wrapper refuses:

- `REQUIRE_APPROVAL`
- `DENY`
- any `4xx`
- any `5xx/503`
- expired decision
- fingerprint mismatch
- missing consume receipt
- already consumed decision
- production deployment target
- unrecognized command ID
- changed action between decision and execution

### Non-Production Only

SELECTED:

- Wrapper may perform only local simulation or preview deployment when later
  approved for implementation.
- Production deployment remains `NOT_AUTHORIZED`.

## L. Testing Strategy

Decision status: SELECTED

### Seven Mandatory Dogfood Scenarios

1. Preview deploy with commit-bound passing tests returns `ALLOW`; wrapper
   consumes once and executes preview/simulation.
2. Production deploy returns `REQUIRE_APPROVAL`; wrapper refuses without Founder
   grant.
3. Failed tests return `DENY`; wrapper refuses.
4. Missing mandatory test evidence returns `DENY`; wrapper refuses.
5. `touches_secrets=true` returns `DENY`; wrapper refuses.
6. Action changes after decision; wrapper recomputes different fingerprint and
   refuses.
7. Expired `ALLOW`; consume or wrapper refuses.

### Additional Tests

- Concurrent consume tests prove exactly one successful logical consume.
- Cross-tenant tests prove foreign decision/mandate/grant IDs do not disclose
  existence and return `403 TENANT_CONTEXT_MISMATCH`.
- Request-ID reuse tests prove exact retry returns same decision and changed
  retry returns `409 REQUEST_ID_REUSE_MISMATCH`.
- Approval replay tests prove exact approval retry returns same result, while
  mismatched reuse returns `409 APPROVAL_GRANT_REUSE_MISMATCH`.
- Clock-boundary tests cover issued-in-future, expires-now, expired, and maximum
  skew.
- System failure tests for policy unavailable, D1 unavailable, audit failure,
  consume store failure, and evaluator exception.
- Secret input tests prove secret values are rejected or redacted and never
  persisted/logged.
- RFC 8785 golden vectors for ordering, arrays, omission/null, Unicode, case,
  duplicate keys, and every `deploy_change` field.
- Transport tests prove `4xx`/`5xx/503` never masquerade as policy `DENY`.
- Schema tests prove unknown fields and unknown enums fail closed.

### Current Diagnostic Evidence

Commands run during design assessment:

```sh
git status --short --branch
git rev-parse HEAD
rg --files
sed -n '1,220p' package.json
sed -n '1,220p' wrangler.jsonc
rg -n "app\\.(get|post|put|delete|all)|new Hono|GUARD_DB|ADDRESS_RISK_KV|\\.well-known|x402|decision|approval|consume|Formspree|FORMSPREE" src/index.js
for f in migrations/*.sql; do printf '%s\\n' "$f"; sed -n '1,220p' "$f"; done
rg -n "function (createPaymentGuardProfile|managePaymentGuardProfile|evaluatePaymentGuard|recordX402PurchaseEvent|paymentGuardLifecycle|paymentGuardApproval|createJsonResponse|json\\(|sha256|hash|crypto|request_id|decision_token|reservation|profile|approval)" src/index.js
npm view canonicalize version description license
npm view json-canonicalize version description license
npm run check
```

`npm run check` result at this checkpoint:

- `node --check src/index.js`: passed.
- Local package tests in `packages/agent-buyer-policy-kit`,
  `packages/agent-memory-kit`, and `mcp` passed.
- `test/index.test.js` failed because `node_modules` is not installed in the
  Developer worktree and Node could not resolve `@x402/core`.
- No application code was changed and dependencies were not installed during
  this design checkpoint.

## M. Scope Confirmation

Decision status: SELECTED

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTED_ACTION_SCOPE=deploy_change

COMMERCE_ADAPTER_STATUS=DOCUMENTED_NON_LIVE_STUB

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

The Developer may not implement application code, endpoints, migrations,
Worker route changes, deployment wrappers, or docs changes beyond this decision
record until PM reviews this record against the frozen contract and explicitly
authorizes DEV-SG-001 implementation.

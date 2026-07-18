# DEV-SG-001A Implementation Decision Record V2

TASK_ID=DEV-SG-001

Checkpoint: DEV-SG-001A - Implementation Decision Record Revision

Status: READY_FOR_PM_REVIEW

Revision reason:

`PM_IMPLEMENTATION_DESIGN_REVIEW=REVISE`

Created at: 2026-07-18T22:47:29+08:00

Supersedes:

`DEV-SG-001A_IMPLEMENTATION_DECISION_RECORD.md`

Reviewed commit:

`bccdf9a86455cbc350e8065b7673d9e3155acf70`

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

## Revision Summary

This V2 record accepts the PM revise gate and corrects the V1 conflicts before
any application code is authorized.

| PM issue | V2 resolution |
|---|---|
| Frozen action schema was replaced with a flat envelope. | Preserves `action.type`, `action.target`, and `action.parameters`; `deploy_change` fields are mapped inside target/parameters. |
| Consume allowed `CONSUMED` without receipt. | Requires one D1 transactional batch containing conditional consume transition, consume receipt insert, and consume audit insert. Any failure rolls back all three. |
| Production intent was represented as preview. | Adds closed production action representation while keeping production execution refused until separate Founder Gate 4. |
| Founder approver credential model was ambiguous. | Selects one model: 32-byte CSPRNG bearer secret, raw key outside D1, digest/prefix/principal/org/scope/status in D1, optional Worker-secret pepper. |
| Trusted-time semantics were loose. | Caller timestamps are audit-only; consume uses one authoritative server timestamp; skew never extends expiry; expired decisions never become valid again. |
| Baseline dependency/test state was missing. | Adds DEV-SG-001B_BASELINE_GATE before code changes: `npm ci`, `npm run check`, Node/npm versions, lock hash, and known-failure ledger if needed. |
| Duplicate-key parsing was under-specified. | Selects `@humanwhocodes/momoa@3.3.10` AST parsing to preserve duplicate keys, plus tests; no unreviewed general parser. |

This record still authorizes no implementation code, migrations, route changes,
deployment config changes, approved PM artifact edits, or deployment.

## A. Existing System Assessment

Decision status: SELECTED

The current repository remains a Cloudflare Worker/Hono project:

- `src/index.js`: single Worker module with existing Hono routes, x402
  discovery, public pages, decision helpers, payment-guard helpers, D1 access,
  and Worker export.
- `migrations/*.sql`: existing D1 migrations for payment-guard evaluations,
  profiles, approvals, merchant stats, webhook outbox, and x402 purchase
  analytics.
- `wrangler.jsonc`: Worker config with `GUARD_DB` D1 binding,
  `ADDRESS_RISK_KV` KV binding, `nodejs_compat`, and cron.
- `test/index.test.js`: current Node test suite.
- `packages/agent-buyer-policy-kit`, `packages/agent-memory-kit`, `mcp`,
  `sdk/javascript`, `sdk/python`: local packages and clients.

Reusable components:

- Hono route style and JSON response helpers.
- Existing D1 binding and prepared statement conventions.
- Existing test runner (`node:test`) and `npm run check`.
- Existing OpenAPI/discovery builders, extended only additively later.
- Existing hash helper pattern, adapted later to exact RFC 8785 canonical bytes.

Not reusable as-is:

- Existing payment guard state and owner/agent tokens use payment-specific
  semantics and older `ALLOW`/`REVIEW`/`BLOCK` vocabulary.
- Existing payment approval paths do not meet Founder-only dogfood approval
  semantics.
- Existing decision tokens are not frozen-contract decision artifacts and do
  not satisfy atomic consume.

Infrastructure constraints:

- Use current Cloudflare Worker plus D1 first.
- Preserve existing x402/discovery routes.
- Do not claim production API availability.
- Do not deploy in DEV-SG-001A or DEV-SG-001B.
- If D1 cannot prove atomic consume under concurrency tests, stop and propose
  Durable Objects or another serialization authority before implementation.

## B. Transactional State

Decision status: SELECTED

Selected technology:

Cloudflare D1 using SQL transactions through D1 transactional batch semantics
for all multi-row state transitions.

Rationale:

- `GUARD_DB` already exists in the Worker configuration.
- D1 is sufficient only if it can execute the consume transition, receipt
  creation, and audit creation in one atomic transaction.
- D1 keeps QA evidence inspectable with SQL and avoids introducing another
  Cloudflare primitive before it is needed.

Alternatives:

- REJECTED: KV. No compare-and-set transaction model for consume.
- REJECTED: R2/object storage. Not a transactional state store.
- DEFERRED: Durable Objects. Required fallback if D1 cannot prove exactly one
  logical consume success in tests.
- DEFERRED: External Postgres. Operationally heavier than current Worker/D1
  stack.

Operational risk:

- D1 outage blocks decisions/consumes.
- Incorrect use of non-transactional sequences could violate single-use
  semantics.

Security risk:

- Tenant scoping bugs could leak or mutate foreign records.

Migration cost:

- Moderate. Requires new D1 tables and indexes, but no new service.

Contract compatibility:

- Compatible only if all idempotency, approval-grant use, consume transition,
  receipt creation, and audit creation are atomic and org-scoped.

Failure condition:

- If the baseline implementation cannot demonstrate D1 one-transaction consume
  behavior, Developer must stop, mark the D1 approach blocked, and propose
  Durable Objects or another serialization authority for PM review.

### State Tables

Proposed tables remain D1-backed but are revised for atomic consume:

- `signgate_organizations`
  - `organization_id` primary key
  - `status`
  - `created_at`
  - `updated_at`
- `signgate_api_keys`
  - `key_id` primary key
  - `organization_id`
  - `principal_id`
  - `principal_type`: `agent`, `executor`, `approver`, `internal_service`
  - `key_prefix` unique
  - `key_digest`
  - `scopes_json`
  - `active`
  - `last_used_at`
  - `rotated_from_key_id`
  - `revoked_at`
  - `created_at`
- `signgate_mandates`
  - composite primary key: `organization_id`, `mandate_id`
  - `scope_json`
  - `status`
  - `expires_at`
- `signgate_decision_idempotency`
  - composite unique: `organization_id`, `request_id`
  - `request_fingerprint`
  - `decision_id`
  - `created_at`
- `signgate_decisions`
  - unique: `organization_id`, `decision_id`
  - `request_id`
  - `request_fingerprint`
  - `action_type`
  - `action_fingerprint`
  - `decision`: `ALLOW`, `REQUIRE_APPROVAL`, `DENY`
  - `state`: `AVAILABLE`, `CONSUMED`, `NON_EXECUTABLE`, `EXPIRED`
  - `bound_action_json`
  - `policy_version`
  - `execution_directive_json`
  - `reason_codes_json`
  - `approval_grant_id`
  - `issued_at`
  - `expires_at`
  - `created_at`
  - `consumed_at`
- `signgate_approval_grants`
  - unique: `organization_id`, `approval_grant_id`
  - `original_decision_id`
  - `action_fingerprint`
  - `policy_version`
  - `approver_principal_id`
  - `approver_role`
  - `status`: `AVAILABLE`, `USED`, `REVOKED`, `EXPIRED`
  - `used_by_decision_id`
  - `approved_at`
  - `expires_at`
  - `created_at`
- `signgate_consume_receipts`
  - unique: `organization_id`, `decision_id`
  - unique: `organization_id`, `decision_id`, `execution_attempt_id`
  - `consume_receipt_id`
  - `action_fingerprint`
  - `executor_principal_id`
  - `consumed_at`
- `signgate_audit_events`
  - `audit_id`
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

## C. Atomic Consume

Decision status: SELECTED

Required consume invariant:

`decision=CONSUMED` and `consume_receipt=missing` is impossible.

Implementation requirement:

The following operations occur in one D1 transactional batch:

1. Conditional `AVAILABLE` to `CONSUMED` transition.
2. Consume receipt creation.
3. Consume audit creation.

If any statement fails, D1 must roll back all statements. The implementation
must not run a state update before a later out-of-transaction receipt insert.

### Transaction Shape

The transaction must use one authoritative server timestamp `server_now`.

Pseudo-SQL:

```sql
UPDATE signgate_decisions
SET state = 'CONSUMED',
    consumed_at = :server_now
WHERE organization_id = :organization_id
  AND decision_id = :decision_id
  AND decision = 'ALLOW'
  AND state = 'AVAILABLE'
  AND action_fingerprint = :action_fingerprint
  AND expires_at > :server_now;

INSERT INTO signgate_consume_receipts (
  consume_receipt_id,
  organization_id,
  decision_id,
  action_fingerprint,
  execution_attempt_id,
  executor_principal_id,
  consumed_at
) VALUES (
  :consume_receipt_id,
  :organization_id,
  :decision_id,
  :action_fingerprint,
  :execution_attempt_id,
  :executor_principal_id,
  :server_now
);

INSERT INTO signgate_audit_events (
  audit_id,
  organization_id,
  event_type,
  actor_principal_id,
  decision_id,
  action_fingerprint,
  result_code,
  metadata_json,
  created_at,
  delete_after
) VALUES (
  :audit_id,
  :organization_id,
  'decision_consumed',
  :executor_principal_id,
  :decision_id,
  :action_fingerprint,
  'CONSUME_PASS',
  :metadata_json,
  :server_now,
  :delete_after
);
```

Implementation must check the conditional update row count inside the
transactional path. If no row changed, the transaction must not create a new
receipt or success audit.

### Same Attempt Retry

SELECTED:

- Same `organization_id`, `decision_id`, `action_fingerprint`, and
  `execution_attempt_id` returns the original receipt.
- This is a read of an existing receipt after the first transaction succeeded.
- If the receipt is missing, the service returns `503
  CONSUMPTION_STORE_UNAVAILABLE`; it does not allow execution.

### Different Attempt Replay

SELECTED:

- A different attempt ID after consumption returns `409
  DECISION_ALREADY_CONSUMED`.

### D1 Proof Requirement

DEV-SG-001 implementation may proceed with D1 only if tests prove:

- exactly one concurrent consume call commits success;
- all failed concurrent calls return conflict or exact-retry receipt;
- no test can observe `CONSUMED` without a receipt;
- consume audit exists for the successful consume;
- transaction failure rolls back transition, receipt, and audit together.

If D1 cannot prove this property, D1 becomes BLOCKED and the design must switch
to Durable Objects or another serialization authority before code continues.

## D. Trusted Time

Decision status: SELECTED

Time source:

Cloudflare Worker server time via `Date.now()`, converted once per operation to
an ISO timestamp. Cloudflare Workers provide standard JavaScript `Date`/time
APIs inside the isolate; the application treats this as the authoritative
preview service clock.

Rationale:

- Caller timestamps are untrusted claims.
- The service needs a single source for decision issue/expiry and consume
  evaluation.

Alternatives:

- REJECTED: Caller-provided timestamps for enforcement.
- DEFERRED: External time authority. Adds dependency and is unnecessary for
  preview.
- DEFERRED: Database server time as sole source. D1 may be used in SQL, but the
  Worker still needs to construct consistent response timestamps.

Operational risk:

- Worker clock anomalies can cause conservative refusal.

Security risk:

- If skew extends expiry, an expired decision might execute. V2 forbids this.

Migration cost:

- Low.

Contract compatibility:

- Compatible with max 15 minute validity and fail-closed executor behavior.

Failure condition:

- If trusted server time cannot be produced, return `503` with no policy enum.

### Time Semantics

- Caller timestamps are audit-only and never authoritative.
- Caller skew never extends `expires_at`.
- Decision issue/expiry use server time.
- Consume uses one authoritative `server_now` for both expiry check and
  `consumed_at`.
- Expired decisions never become valid again, even if a later observed clock is
  earlier.
- `expires_at <= server_now` is not executable.
- `issued_at` boundary tests cover future issue times and maximum skew, but
  future caller timestamps never increase validity.
- Time failure returns `503` without `ALLOW`.

Boundary tests:

- issue at now, expiry now plus allowed duration;
- expiry exactly equal to consume time refuses;
- issued in future beyond skew refuses;
- backwards clock simulation does not revive expired/consumed rows;
- forward clock simulation causes conservative expiry.

## E. Authentication and Tenancy

Decision status: SELECTED

### API-Key Model

Use scoped bearer keys with one raw secret shown only at issuance time.

Required key material:

- Minimum 32-byte CSPRNG secret generated with runtime cryptographic randomness.
- Raw key controlled outside D1.
- D1 stores only key prefix, digest, principal, organization, scopes, status,
  timestamps, rotation linkage, and last use.
- Optional server-side pepper may be stored only as a Worker secret.

No raw bearer secret is stored in D1.

### Lookup and Digest

SELECTED:

- Key format includes a non-secret prefix for lookup.
- Digest input is the raw bearer secret plus optional server-side pepper.
- Digest uses SHA-256 for v0.1 preview.
- Compare digest after prefix lookup.
- Update `last_used_at` on successful authentication, without leaking raw key.

### Principal Separation

SELECTED:

- Agent key: `decision:create:deploy_change`; cannot consume or approve.
- Executor key: `decision:consume:deploy_change`; cannot create approvals.
- Approver key: `approval:founder:deploy_change`; cannot create agent
  decisions or consume.
- Internal service key: seed/admin setup only, not public product scope.

### Rotation and Revocation

SELECTED:

- Rotation issues a new raw key and stores a new digest row linked to the
  previous key.
- Revocation sets `active=0` and `revoked_at`.
- Revoked keys cannot create decisions, consume, or approve.
- `last_used_at` is retained for audit until the 30-day retention deadline.

### Tenant Boundary

SELECTED:

- Authentication derives `organization_id`.
- Request `organization_id` must match the authenticated organization or be
  omitted and filled server-side.
- Every decision, mandate, approval, idempotency, consume, and audit lookup is
  scoped by `organization_id`.
- Cross-tenant mismatch returns `403 TENANT_CONTEXT_MISMATCH` without revealing
  foreign resource existence.

Alternatives:

- REJECTED: Worker secret OR hashed D1 key ambiguity from V1.
- REJECTED: Agent-supplied organization identity without key binding.
- DEFERRED: SSO/IAM/RBAC. Explicitly out of scope.

Failure condition:

- Missing, inactive, wrong-scope, wrong-principal, revoked, or cross-tenant key
  returns `401`/`403` with `enforcement_effect: DENY` and no executable
  artifact.

## F. Founder Approval Authentication

Decision status: SELECTED

Selected dogfood model:

- Founder approver uses a separate minimum 32-byte CSPRNG bearer secret.
- Raw Founder key is controlled outside D1.
- D1 stores only prefix, digest, principal ID, organization ID, approver
  principal type, `approval:founder:deploy_change` scope, status, rotation
  metadata, revocation metadata, and `last_used_at`.
- Optional pepper is a Worker secret.
- Founder approver key has no agent scope and no executor scope.
- No general approval dashboard is built.

Rationale:

- Satisfies Founder-only internal dogfood approval without expanding into IAM.
- Prevents agent/executor credentials from minting approvals.

Alternatives:

- REJECTED: Raw approval token in D1.
- REJECTED: Agent/executor approval scopes.
- REJECTED: Arbitrary approval JSON from caller.
- DEFERRED: FIDO2/OAuth/SSO approval dashboard.

Approval grant rules:

- Grant binds organization, Founder principal, approver role, approval time,
  expiry, original decision ID, policy version, and exact action fingerprint.
- Grant use is transactional with minting a fresh logical `ALLOW`.
- Grant for a different fingerprint, expired grant, wrong role, wrong policy
  version, or reused mismatched request fails closed.

Failure condition:

- If Founder identity cannot be authenticated as the separate approver
  principal, the approval path returns `401`/`403`; agent/executor credentials
  never mint grants.

## G. RFC 8785, Duplicate Keys, and Fingerprinting

Decision status: SELECTED

Canonicalization library:

`canonicalize@3.0.0`

Duplicate-key parser:

`@humanwhocodes/momoa@3.3.10`

Rationale:

- `canonicalize@3.0.0` handles RFC 8785 canonical output after validated JSON.
- `@humanwhocodes/momoa@3.3.10` parses JSON as an AST and preserves object
  members, allowing duplicate-key detection before conversion to ordinary JS
  objects.
- This avoids an unreviewed hand-written general JSON parser.

Alternatives:

- REJECTED: `JSON.parse` alone. It loses duplicate keys.
- REJECTED: Casual custom parser/scanner without grammar and tests.
- DEFERRED: Bounded scanner fallback. Allowed only if the pinned AST parser is
  incompatible with Workers, and then only with explicit grammar limits plus
  malformed/Unicode/escape/nesting tests.

Operational risk:

- Parser/library compatibility with Worker runtime must be proven in
  DEV-SG-001B before code changes continue.

Security risk:

- Duplicate keys or unknown fields could hide unfingerprinted action changes.

Migration cost:

- Low to moderate; two dependencies added later after baseline gate approval.

Contract compatibility:

- Compatible if duplicate keys, unknown fields, invalid UTF-8, NaN/infinity,
  schema-invalid nulls, ambiguous encodings, and unsupported numeric forms are
  rejected before fingerprinting.

Failure condition:

- If AST parsing cannot run in Worker or cannot preserve duplicate keys, V2
  parser selection becomes BLOCKED and implementation must stop for PM review.

### Fingerprint Envelope

Fingerprint input preserves the frozen contract shape:

```json
{
  "contract_version": "SIGNGATE_GENERAL_DECISION_CONTRACT_V0.1",
  "organization_id": "org_...",
  "agent_id": "agent_...",
  "action": {
    "type": "deploy_change",
    "target": {},
    "parameters": {}
  }
}
```

The SHA-256 digest is over the RFC 8785 canonical UTF-8 bytes of this envelope,
encoded as `sha256:<lowercase_hex>`.

## H. Frozen `deploy_change` Action Schema

Decision status: SELECTED

The canonical request and bound action must keep:

- `action.type`
- `action.target`
- `action.parameters`

V2 does not replace the frozen schema with a flat action envelope.

### Canonical Shape

```json
{
  "action": {
    "type": "deploy_change",
    "target": {
      "environment": "preview",
      "service": "base-agent-preflight",
      "repository": {
        "provider": "github",
        "owner": "lukekwan",
        "name": "agent-payment-guard"
      }
    },
    "parameters": {
      "git_commit": "40-char-sha",
      "artifact_build_digest": "sha256:...",
      "diff_digest": "sha256:...",
      "changed_paths": [],
      "changed_routes": [],
      "risk_flags": {
        "touches_secrets": false,
        "touches_dns": false,
        "touches_credentials": false,
        "touches_permissions": false
      },
      "deployment": {
        "strategy": "worker_preview",
        "command_id": "wrangler_preview"
      },
      "configuration_fingerprint": "sha256:...",
      "ci_evidence": {
        "provider": "local",
        "command_id": "npm_run_check",
        "commit": "40-char-sha",
        "result": "pass",
        "evidence_digest": "sha256:..."
      }
    }
  }
}
```

### Field Decisions

| Field | Location | Status | Rule |
|---|---|---|---|
| environment | `action.target.environment` | required | Closed enum: `preview`, `production`. |
| service/project | `action.target.service` | required | Canonical field is `service`; `project` is not accepted in canonical action. |
| repository identity | `action.target.repository` | required | Provider, owner, name. |
| git commit | `action.parameters.git_commit` | required | Full 40-char commit SHA. |
| artifact/build digest | `action.parameters.artifact_build_digest` | optional | Required when build artifact exists; `sha256:<hex>`. |
| diff digest | `action.parameters.diff_digest` | required | `sha256:<hex>`. |
| changed paths | `action.parameters.changed_paths` | required | Sorted unique relative paths; no absolute or parent traversal. |
| changed routes | `action.parameters.changed_routes` | required | Sorted unique route strings; empty array allowed. |
| touches_secrets | `action.parameters.risk_flags.touches_secrets` | required | Boolean; true returns `DENY`. |
| touches_dns | `action.parameters.risk_flags.touches_dns` | required | Boolean; true requires approval or deny by policy. |
| touches_credentials | `action.parameters.risk_flags.touches_credentials` | required | Boolean; true returns `DENY` in v0.1. |
| touches_permissions | `action.parameters.risk_flags.touches_permissions` | required | Boolean; true requires approval at minimum. |
| deployment strategy | `action.parameters.deployment.strategy` | required | Closed enum below. |
| command ID | `action.parameters.deployment.command_id` | required | Closed command identity, not arbitrary shell. |
| configuration fingerprint | `action.parameters.configuration_fingerprint` | optional | Required if config changes; `sha256:<hex>`. |
| CI/test evidence identity and commit binding | `action.parameters.ci_evidence` | required | Provider, command ID, commit, result, evidence digest. Commit must match `git_commit`. |

### Deployment Strategy Enum

Allowed representation:

- `local_simulation`
- `worker_preview`
- `worker_production`

Allowed command IDs:

- `npm_run_check`
- `wrangler_dev_preview`
- `wrangler_preview`
- `wrangler_deploy_production`

Policy and wrapper constraints:

- `worker_production` and `wrangler_deploy_production` may be represented and
  fingerprinted as exact requested production intent.
- `PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED`; the v0.1 wrapper must refuse actual
  production execution unless a separate Founder Gate 4 later passes.
- Production intent must not be disguised as preview intent.

## I. Audit and Retention

Decision status: SELECTED

Persisted fields:

- Organization ID, principal ID/type, request ID, request fingerprint.
- Decision ID, decision enum, decision state, policy version.
- Bound action JSON in frozen `action.type/target/parameters` shape.
- Action fingerprint.
- Mandate ID, approval grant ID, consume receipt ID.
- Reason/error codes and enforcement effect.
- Evidence references/digests.
- Consume attempt ID and consumed timestamp.
- Structured audit metadata and retention deadline.

Prohibited fields:

- Raw API keys, bearer secrets, peppers, private keys, tokens.
- Raw secret values, `.env` contents, deployment secrets.
- Unredacted authorization headers.
- Full raw request body dumps.
- Formspree contact submissions.
- Sensitive customer documents beyond references/digests.

Logging:

- Structured allowlist logging only.
- Redact headers and sensitive fields.
- No request-body dumps.

Retention:

- 30-day preview retention for decision, approval, idempotency, consume, and
  audit records.
- Existing Worker cron may run deletion/anonymization.
- Cleanup deletes or anonymizes rows with `delete_after <= server_now`.
- Delayed cron never extends execution validity.

Audit failure behavior:

- If required decision or consume audit cannot be created in the same required
  transaction, return `503` with no `ALLOW`.
- Executor fails closed.

## J. API and Error Implementation

Decision status: SELECTED

### `POST /v1/decisions`

- Authenticated preview endpoint.
- Uses frozen request shape.
- Returns HTTP `200` only after auth, tenancy, parsing, schema validation,
  canonicalization, policy retrieval/evaluation, idempotency, decision
  persistence, and audit persistence succeed.
- Valid policy decisions: `ALLOW`, `REQUIRE_APPROVAL`, `DENY`.
- Response includes `api_status: "preview"`, `decision_id`, `bound_action`,
  `action_fingerprint`, `issued_at`, `expires_at`, `policy_version`,
  `execution_directive`, reason codes, and audit ID.

### Consume Operation

- Preview-protected `POST /v1/decisions/{decision_id}/consume`.
- Requires executor principal and scope.
- Request includes recomputed `action_fingerprint` and
  `execution_attempt_id`.
- Uses the one D1 transactional batch described above.

### Idempotency

- Same org/request ID and identical canonical request returns the same decision
  while valid.
- Same org/request ID with different canonical request returns `409
  REQUEST_ID_REUSE_MISMATCH`.

### Immutable Approval Flow

- `REQUIRE_APPROVAL` never mutates into `ALLOW`.
- Founder grant plus fresh evaluation may create a new logical `ALLOW` with new
  `decision_id`.
- Approval grant use must be action-bound and transactionally marked used.

### Error Semantics

- `200`: successful policy evaluation with one decision enum.
- `400`: malformed JSON.
- `401`: missing/invalid auth.
- `403`: wrong scope, revoked principal, or tenant mismatch.
- `409`: request ID, approval grant, or consume replay conflict.
- `422`: schema invalid, duplicate keys, unknown fields, unfingerprintable
  action.
- `5xx/503`: dependency/system/storage/time failure.

`5xx/503` never carries a policy decision enum and never masquerades as policy
`DENY`.

Executor fails closed unless it has valid `200 + ALLOW`, matching fingerprint,
valid expiry, `execution_directive.action=EXECUTE`, and successful consume
receipt.

## K. Dogfood Enforcement Wrapper

Decision status: SELECTED

Proposed command/interface:

`signgate-preview-deploy`

This command is not implemented in DEV-SG-001A.

Wrapper behavior:

- Reconstructs the pending action in frozen schema:
  - `action.type = deploy_change`
  - `action.target.environment/service/repository`
  - `action.parameters.git_commit/digests/changed paths/routes/risk flags/deployment/configuration/CI evidence`
- Represents production intent exactly when requested; never maps production to
  preview.
- Recomputes RFC 8785 fingerprint locally.
- Requests decision from SignGate.
- Refuses unless response is valid `ALLOW`.
- Refuses if current pending action fingerprint differs from `bound_action`.
- Calls consume immediately before irreversible action.
- Refuses unless consume receipt is returned.
- Records execution evidence: decision ID, action fingerprint, consume receipt
  ID, commit, command ID, result, output digest.

Refusal cases:

- `REQUIRE_APPROVAL`
- `DENY`
- malformed response
- any `4xx`
- any `5xx/503`
- expired decision
- fingerprint mismatch
- missing consume receipt
- already consumed decision
- production command without separate Founder Gate 4
- unrecognized command ID

Non-production-only enforcement:

- V0.1 wrapper can execute only `local_simulation`, `worker_preview`, or other
  non-production command IDs until Gate 4.
- It can represent production requests and prove refusal.
- It cannot execute production deployment in this sprint.

## L. Testing Strategy

Decision status: SELECTED

### DEV-SG-001B_BASELINE_GATE

Before any application code changes:

1. Install exactly from lockfile:

```sh
npm ci
```

2. Record versions:

```sh
node --version
npm --version
```

3. Record dependency lock hash:

```sh
shasum -a 256 package-lock.json
```

4. Run baseline:

```sh
npm run check
```

Gate rule:

- Baseline must pass before code changes, or PM must approve an explicit
  known-failure ledger with failure name, error, reason, owner, expiration, and
  why it does not mask DEV-SG-001 implementation risk.
- Without pass or PM-approved ledger, implementation remains blocked.

### Mandatory Dogfood Scenarios

1. Preview deploy with passing tests returns `ALLOW`, consumes once, and runs
   only preview/simulation.
2. Production deploy request is represented exactly and returns
   `REQUIRE_APPROVAL`; wrapper refuses execution.
3. Production deploy with Founder grant may receive fresh `ALLOW` only as a
   decision artifact, but wrapper still refuses actual production execution
   until Gate 4.
4. Failed tests return `DENY`.
5. Missing mandatory test evidence returns `DENY`.
6. `touches_secrets=true` returns `DENY`.
7. Action changes after decision; wrapper recomputes different fingerprint and
   refuses.
8. Expired `ALLOW` refuses.

### Required Test Families

- D1 transactional consume/concurrency tests proving exactly one success.
- Rollback tests proving no `CONSUMED` without receipt/audit.
- Cross-tenant tests.
- Request-ID reuse tests.
- Approval replay and mismatch tests.
- Clock-boundary tests.
- System failure tests for policy, audit, D1, consume, parser, and time.
- Secret input tests.
- RFC 8785 golden vectors.
- Duplicate-key parser tests with normal duplicate keys, escaped key spelling,
  nested duplicates, arrays of objects, Unicode escapes, malformed JSON,
  excessive nesting, and unknown fields.
- Transport tests proving `4xx`/`5xx/503` never masquerade as policy `DENY`.

## M. Scope Confirmation

Decision status: SELECTED

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTED_ACTION_SCOPE=deploy_change

COMMERCE_ADAPTER_STATUS=DOCUMENTED_NON_LIVE_STUB

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

IMPLEMENTATION_STATUS=NOT_STARTED

QA_STATUS=BLOCKED_PENDING_IMPLEMENTATION

INDEPENDENT_REVIEW_STATUS=BLOCKED_PENDING_IMPLEMENTATION

Developer may not modify `src/`, `migrations/`, Worker routes, deployment
configuration, approved PM artifacts, or implementation code until PM reviews
this V2 record and explicitly authorizes the next phase.

# DEV-SG-001A Implementation Decision Record V2.2 Addendum

TASK_ID=DEV-SG-001

Checkpoint: DEV-SG-001A-V2.2 - Documentation Addendum

Status: READY_FOR_PM_REVIEW

Created at: 2026-07-18T23:35:19+08:00

Reviewed PM delta commit:

`lukekwan/openclaw-workspace@e1690d7a7c2f674ef0f9a19e539a881263321d6d`

Frozen content commit:

`lukekwan/openclaw-workspace@900ec4ff27420524f27a5cc8d9a403867aaf4c4e`

Canonical approved repository path:

`projects/signgate/specs/pm-contract-v0.1/approved/`

Approval receipt / promotion commit:

`lukekwan/openclaw-workspace@16e371f38a967f5eb571807eda19dc45974bc5f3`

Developer worktree:

`/Users/0xkwan/.openclaw/worktrees/dev-sg-001`

This addendum is documentation-only. It supersedes every conflicting clause in
`DEV-SG-001A_IMPLEMENTATION_DECISION_RECORD_V2.md` and
`DEV-SG-001A_IMPLEMENTATION_DECISION_RECORD_V2_1_ADDENDUM.md`. It does not
authorize application implementation.

IMPLEMENTATION_STATUS=NOT_STARTED

FULL_APPLICATION_IMPLEMENTATION_STATUS=BLOCKED

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTED_ACTION_SCOPE=deploy_change

COMMERCE_ADAPTER_STATUS=DOCUMENTED_NON_LIVE_STUB

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

QA_STATUS=BLOCKED_PENDING_IMPLEMENTATION

INDEPENDENT_REVIEW_STATUS=BLOCKED_PENDING_IMPLEMENTATION

## A. Frozen Wire Contract

Decision status: SELECTED

The wire contract is frozen exactly as `contract_version: "0.1"`.

`organization_id` is mandatory on the request wire. It must exactly match the
organization derived from the authenticated credential. It may not be omitted
and silently server-filled. A mismatch is a `403` auth/tenancy failure with
`enforcement_effect: DENY`; it is not a policy `DENY`.

The action shape remains:

```json
{
  "action": {
    "type": "deploy_change",
    "target": {},
    "parameters": {}
  }
}
```

The implementation may normalize values for fingerprinting, but it must not
replace the frozen `action.type`, `action.target`, `action.parameters` envelope.

### `action.target`

`action.target` carries the execution target identity:

- `environment`: required; enum `local`, `preview`, `production`.
- `service`: required; product/service identifier such as `signgate-worker`.
- `project`: optional additive alias when a deployment provider distinguishes
  project from service.
- `repository`: required object containing host, owner, repo, and optional
  remote URL canonicalized to a stable repository identity.

### `action.parameters`

`action.parameters` carries execution-relevant details. The frozen direct
parameter locations remain direct:

- `action.parameters.touches_secrets`
- `action.parameters.touches_dns`
- `action.parameters.touches_permissions`

These fields must not be moved under a new `risk_flags` object.

Additive first-sprint parameters:

- `git_commit`: required 40-hex commit or provider-qualified immutable commit.
- `artifact_digest`: optional but required when a build artifact exists.
- `build_digest`: optional alias normalized into `artifact_digest` only if PM
  later accepts an alias table; otherwise unknown aliases are rejected.
- `diff_digest`: required when `changed_paths` is incomplete.
- `changed_paths`: required array unless a `diff_digest` covers the diff.
- `changed_routes`: required array, may be empty.
- `touches_credentials`: additive boolean.
- `deployment_strategy`: required closed enum, see production model below.
- `deployment_command_id`: required closed command identity.
- `configuration_fingerprint`: required for Worker/wrangler/config inputs.
- `ci_evidence`: required object binding test evidence to commit and run ID.

`touches_credentials` does not change the frozen policy:

- Secret-bearing credential content remains prohibited in every request.
- `touches_credentials=true` with no secret material returns
  `REQUIRE_APPROVAL` when all other conditions are valid.
- It must not automatically become `DENY` merely because credentials are
  affected.
- `touches_secrets=true` remains hard `DENY` with
  `SECRET_CHANGE_NOT_SUPPORTED_V0_1`.

Every execution-relevant additive field must participate in the RFC 8785
fingerprint envelope. Unknown fields are rejected before fingerprinting.

## B. Production `ALLOW` Semantics

Decision status: SELECTED

V2.1's correction remains authoritative:

- Production intent may be represented.
- Production intent may be fingerprinted.
- Production intent may be evaluated.
- Before separate Founder Gate 4, production intent may not receive executable
  `ALLOW`.
- Founder policy approval is not Founder Gate 4.
- The standard policy enforcement point must never receive a production
  `ALLOW` that it must nevertheless reject.

Before Founder Gate 4, production requests return either:

- `REQUIRE_APPROVAL` with `PRODUCTION_GATE_4_REQUIRED`; or
- `DENY` with `PRODUCTION_EXECUTION_NOT_AUTHORIZED`.

The executable approval lifecycle dogfood scenario remains non-production:

```text
preview deploy + touches_permissions=true
-> REQUIRE_APPROVAL
-> trusted Founder grant
-> fresh evaluation
-> new preview-bound ALLOW
-> atomic consume
-> preview/local execution
```

## C. D1 Atomicity Design

Decision status: SELECTED

The guarded `consume_lock_token` pattern remains a candidate only.

SQLite feasibility evidence is preliminary. D1 runtime atomicity is not yet
proven. No D1 `PASS` claim is allowed until DEV-SG-001C completes through an
actual disposable Cloudflare Worker using the D1 Worker Binding API.

Required D1 invariant:

- Conditional ownership acquisition must be transactionally tied to receipt and
  success-audit creation.
- Zero-row `UPDATE` must not create a receipt.
- Zero-row `UPDATE` must not create a success audit.
- Receipt failure must roll back the consume transition.
- Audit failure must roll back the consume transition and receipt.
- No observable state may contain `decision=CONSUMED` with missing receipt.
- Same `execution_attempt_id` retry returns the exact original receipt and does
  not create a second success audit.
- Different-attempt replay returns conflict semantics.

If the Worker+D1 runtime cannot prove these properties, D1 is rejected for this
state transition and the design must stop for Durable Objects or another
serialization-authority redesign.

## D. Persistent Expiry

Decision status: SELECTED

Decision state includes an irreversible transition:

`AVAILABLE -> EXPIRED`

Required persisted fields and semantics:

- `expired_at`: authoritative server timestamp when expiry is first observed.
- `state`: once `EXPIRED`, irreversible.
- expiry audit event: persisted with decision, organization, reason, and
  observed server timestamp.
- no `EXPIRED -> AVAILABLE`.
- no `EXPIRED -> CONSUMED`.
- backward clock observation cannot revive expiry.
- delayed cleanup cannot extend validity.

Consume and decision-read paths that observe `expires_at <= server_now` must
attempt to persist expiry under the same serialization authority before
returning expired semantics.

## E. Strict JSON Parser and Resource Bounds

Decision status: SELECTED

Pinned libraries:

- `@humanwhocodes/momoa@3.3.10`
- `canonicalize@3.0.0`

Parser options:

```js
{
  mode: "json",
  allowTrailingCommas: false
}
```

Selected request resource bounds:

| Bound | Limit | Rationale |
|---|---:|---|
| Maximum raw request bytes | 32768 bytes | Enough for decision evidence references and deploy metadata; rejects payload-as-log abuse. |
| Maximum JSON depth | 16 | Covers the frozen schema with margin; prevents pathological nesting. |
| Maximum object members | 128 per object | Covers evidence/context and deploy metadata without allowing object bombs. |
| Maximum array length | 128 per array | Covers changed paths/routes and evidence lists for v0.1. |
| Maximum string length | 4096 bytes per string | Allows digests, IDs, URLs, and intent while rejecting embedded files/secrets. |
| Maximum `changed_paths` item length | 512 bytes | Supports repository paths without accepting arbitrary blobs. |
| Maximum `intent` length | 1024 bytes | Descriptive only; not policy authority. |

Reject before ordinary-object conversion or fingerprinting:

- comments;
- trailing commas;
- duplicate decoded member names;
- escaped-equivalent duplicate member names;
- malformed escapes;
- unsupported number forms;
- invalid UTF-8;
- schema-invalid nulls;
- unknown fields;
- resource-bound violations.

Duplicate detection occurs on decoded member names at every object node,
including objects nested inside arrays.

## F. Founder Grant Interface

Decision status: SELECTED

V0.1 uses one narrow internal dogfood operation. It is not IAM, SSO, RBAC,
approval dashboard, approval inbox, or customer workflow.

Operation name:

`POST /internal/dogfood/founder-approval-grants`

Equivalent local CLI for non-public dogfood may be:

`signgate-founder-grant create`

The route, if implemented, must be preview-protected/internal only and not
published as a product API.

Required authenticated principal:

- principal type: `founder_approver`
- required scope: `approval:founder:deploy_change`
- organization binding: exact `organization_id`
- agent and executor credentials cannot authenticate this operation.

Request schema:

```json
{
  "contract_version": "0.1",
  "organization_id": "org_nomos",
  "original_decision_id": "dec_...",
  "action_fingerprint": "sha256:...",
  "policy_version": "deploy_policy_...",
  "approval_reason": "Founder approved preview permission change",
  "expires_at": "2026-07-18T12:10:00Z"
}
```

Response schema:

```json
{
  "approval_grant_id": "grant_...",
  "organization_id": "org_nomos",
  "original_decision_id": "dec_...",
  "action_fingerprint": "sha256:...",
  "policy_version": "deploy_policy_...",
  "approved_by": "founder_01",
  "approved_at": "2026-07-18T12:03:00Z",
  "expires_at": "2026-07-18T12:10:00Z",
  "audit_id": "audit_..."
}
```

Grant binding:

- `approval_grant_id`
- original decision ID
- organization ID
- action fingerprint
- policy version
- approving Founder principal
- approval timestamp
- expiry timestamp

Failure semantics:

- wrong scope/principal: `403`
- unknown decision: `404` or non-enumerating `403` when cross-tenant
- mismatched organization/fingerprint/policy: `409`
- expired original decision or requested grant expiry beyond limit: `422`
- audit/persistence failure: `503` or `500`; no grant minted

Key ownership model:

- Minimum 32-byte CSPRNG raw bearer secret.
- Raw secret is controlled outside D1 by Founder/operator custody.
- D1 stores only prefix, principal ID, organization ID, scope, status, digest
  version, digest, created/rotated/revoked timestamps, and last-use metadata.
- Digest algorithm: `SHA-256("sgv1:" + optional_pepper + ":" + raw_secret)`.
- Digest version: `sg_key_digest_v1`.
- Comparison uses constant-time byte comparison after candidate digesting.
- Optional pepper owner: infrastructure operator; storage: Worker secret.
- Rotation overlap: old and new active for at most 24 hours unless explicitly
  shortened; old key status becomes `rotating` then `revoked`.
- Revocation timing: effective immediately for new authentications.
- `last_used_at` update is best-effort audited metadata and must not be needed
  to authorize an action; failure to update does not mint grants.
- Recovery responsibility: Founder/operator rotates the secret; raw secret is
  never recoverable from D1.

## G. Frozen Dogfood Scenarios

Decision status: SELECTED

Mandatory scenario IDs are restored exactly. Additional denial tests do not
replace these IDs.

| ID | Scenario | Expected behavior |
|---|---|---|
| DF-01 | Preview deploy, passing tests | `ALLOW`; wrapper recomputes fingerprint, atomically consumes, executes preview/simulation, records decision, receipt, result. |
| DF-02 | Non-production approval lifecycle correction: preview deploy with `touches_permissions=true` | `REQUIRE_APPROVAL`; trusted Founder grant; fresh evaluation mints new preview-bound `ALLOW`; atomic consume; preview/local execution. |
| DF-03 | Deployment touches a secret | `DENY / SECRET_CHANGE_NOT_SUPPORTED_V0_1`; wrapper refuses; no secret content retained. |
| DF-04 | Failed tests | `DENY / TESTS_FAILED`; wrapper refuses and preserves test reference. |
| DF-05 | Payload changes after decision | Fingerprint mismatch; wrapper refuses before consume; preserve original and attempted fingerprints. |
| DF-06 | Expired decision | Wrapper and consume boundary refuse; no successful receipt; first observed expiry persists. |
| DF-07 | Exact duplicate request | Same decision artifact for exact duplicate; changed payload with same request ID returns `409`; only one consume succeeds under replay/concurrency. |

Additional required tests include missing-evidence denial, cross-tenant denial,
request ID reuse, approval replay, system failures, secret-like fixture
redaction, strict JSON rejection, and all D1 invariants.

## H. Retention

Decision status: SELECTED

Every retained record gets an enforceable deletion/anonymization field and a
cleanup index.

| Record type | Field | Index | Rule |
|---|---|---|---|
| decisions | `delete_after` | `(organization_id, delete_after)` | Delete after 30 days in preview unless legal hold is explicitly added later. |
| approval grants | `delete_after` | `(organization_id, delete_after)` | Delete after 30 days; preserve aggregate counts only if anonymized. |
| request idempotency | `delete_after` | `(organization_id, delete_after)` | Delete after decision retention window; expired cleanup never refreshes requests. |
| consume receipts | `delete_after` | `(organization_id, delete_after)` | Delete after 30 days; retain no secret-bearing payloads. |
| audit events | `delete_after` | `(organization_id, delete_after, event_type)` | Delete or anonymize after 30 days; operational failure logs use redacted references. |
| API-key usage/audit metadata | `delete_after` | `(organization_id, delete_after, principal_id)` | Keep security metadata up to 30 days; raw key never stored. |

Cleanup owner:

- scheduled internal maintenance job or operator-run maintenance command.

Deletion versus anonymization:

- Decision, grant, idempotency, and receipt rows are deleted.
- Audit events may be anonymized only if all tenant, principal, decision, and
  action identifiers are irreversibly removed and aggregate retention is useful.

Failure handling:

- Cleanup failure is audited and retried.
- Cleanup failure must not extend authorization validity.
- Authorization uses `state`, `expires_at`, `consumed_at`, `revoked_at`, and
  grant expiry, never cleanup timing.
- Delayed cleanup cannot revive expired, consumed, denied, or revoked records.

## I. Authoritative Contract Source

Decision status: SELECTED

Frozen content commit:

`lukekwan/openclaw-workspace@900ec4ff27420524f27a5cc8d9a403867aaf4c4e`

Canonical approved repository path:

`projects/signgate/specs/pm-contract-v0.1/approved/`

Approval receipt path:

`projects/signgate/specs/pm-contract-v0.1/APPROVAL_RECEIPT.md`

Approval receipt / OpenClaw promotion commit:

`lukekwan/openclaw-workspace@16e371f38a967f5eb571807eda19dc45974bc5f3`

## J. Supersession Table

| Original V2/V2.1 clause | Conflict | Authoritative V2.2 replacement | Finding closed | Implementation consequence |
|---|---|---|---|---|
| V2 used `contract_version: "SIGNGATE_GENERAL_DECISION_CONTRACT_V0.1"` in examples. | Frozen wire requires `"0.1"`. | Wire contract uses `contract_version: "0.1"` exactly. | P1-01 proposed closed by docs. | Schema tests must reject other preview contract versions unless PM adds compatibility. |
| V2 said request organization could be derived and omitted. | Frozen contract makes `organization_id` mandatory and checked against credential. | `organization_id` is mandatory on wire; mismatch is `403`. | P1-01 proposed closed by docs. | Request parser/schema must reject missing org and auth layer must verify binding. |
| V2 moved risk booleans under `risk_flags`. | Frozen contract requires direct `action.parameters.touches_*` locations. | `touches_secrets`, `touches_dns`, `touches_permissions` remain direct parameters. | P1-01 proposed closed by docs. | Canonicalizer must fingerprint the direct fields and reject unknown `risk_flags` unless later approved. |
| V2 omitted `touches_credentials`. | PM delta requires additive credential-affecting flag without changing secret policy. | `touches_credentials` is additive; true can require approval; secret material remains prohibited; `touches_secrets=true` hard DENY. | P1-01 proposed closed by docs. | Policy template must distinguish credential metadata change from secret content. |
| V2.1 production scenario corrected production ALLOW but needed preservation. | Future implementation could still mint production ALLOW then make wrapper reject. | Production intent before Gate 4 never receives executable `ALLOW`; standard PEP never receives reject-required production ALLOW. | P1-02 remains closed. | Evaluator must return `REQUIRE_APPROVAL` or `DENY` for production before Gate 4. |
| V2/V2.1 guarded SQL was based on local/pseudo SQL. | D1 runtime atomicity not proven. | D1 runtime proof is still required through disposable Worker Binding API; SQLite evidence is preliminary only. | P1-03 not runtime-closed. | DEV-SG-001C must pass before implementation authorization. |
| V2/V2.1 expiry model not proven in D1 runtime. | Persistent expiry must be proven under same authority. | `AVAILABLE -> EXPIRED` is irreversible with `expired_at` and expiry audit; D1 proof pending. | P1-04 proposed design closure only. | D1 spike must test expiry persistence and backward-clock non-revival. |
| V2.1 parser lacked concrete resource bounds. | PM delta requires exact limits. | Adds byte/depth/member/array/string/path/intent limits and pre-conversion rejection rules. | P1-05 proposed docs closure; runtime harness pending. | Worker compatibility harness must prove parser/canonicalizer behavior. |
| V2.1 Founder grant was conceptual. | PM delta requires one narrow operation and key lifecycle. | Adds internal `POST /internal/dogfood/founder-approval-grants` / CLI equivalent, schemas, bindings, key custody, digest, rotation, revocation, last-use. | P2-01 proposed closed by docs. | Implementation must stay narrow and not build dashboard/IAM. |
| Baseline evidence existed but immutable-evidence gaps remained. | PM delta accepts core tests but requires evidence completion and Worker harness. | DEV-SG-001B evidence completion plus isolated Worker compatibility harness required; no package-file changes. | P2-02 pending harness. | Baseline gate can only be proposed pass after harness passes. |
| V2.1 did not restore DF-01 through DF-07. | Mandatory scenario IDs cannot be replaced/renumbered. | Restores DF-01 through DF-07 exactly and maps DF-02 to preview permissions approval lifecycle. | P2-03 proposed closed by docs. | Tests must use these IDs. |
| V2/V2.1 retention was broad. | PM delta requires enforceable field/index per retained type. | Adds `delete_after`, cleanup indexes, owner, deletion/anonymization, delayed-cleanup semantics. | P2-04 proposed closed by docs. | Migrations later must include retention columns/indexes for retained tables. |
| V2.1 cited contract commit but not canonical approved path. | PM delta requires exact approved path and receipt commit. | Adds frozen commit, approved repo path, approval receipt path, and promotion commit. | P2-05 proposed closed by docs. | Developer must reference approved packet, not local summaries. |

Runtime findings are not claimed closed by documentation alone:

- P1-03 and P1-04 require DEV-SG-001C actual Worker+D1 proof.
- P1-05 and P2-02 require DEV-SG-001B Worker compatibility evidence.

## K. Closure Matrix

P1-01=PROPOSED_CLOSED_BY_V2_2_DOCS_PENDING_PM_REVIEW

P1-03=DESIGN_UPDATED_D1_RUNTIME_PROOF_STILL_REQUIRED

P1-04=DESIGN_UPDATED_D1_RUNTIME_PROOF_STILL_REQUIRED

P1-05=DOCS_BOUNDS_ADDED_WORKER_COMPATIBILITY_HARNESS_REQUIRED

P2-01=PROPOSED_CLOSED_BY_V2_2_DOCS_PENDING_PM_REVIEW

P2-02=EVIDENCE_COMPLETION_AND_WORKER_HARNESS_REQUIRED

P2-03=PROPOSED_CLOSED_BY_V2_2_DOCS_PENDING_PM_REVIEW

P2-04=PROPOSED_CLOSED_BY_V2_2_DOCS_PENDING_PM_REVIEW

P2-05=PROPOSED_CLOSED_BY_V2_2_DOCS_PENDING_PM_REVIEW

PM_CONTRACT_DEVIATIONS=NONE

IMPLEMENTATION_STATUS=NOT_STARTED

PRODUCTION_DEPLOYMENT=NOT_AUTHORIZED

# SignGate Founder Decisions v0.1

Decision date: 2026-07-18
Applicable version: `SIGNGATE_GENERAL_DECISION_CONTRACT_V0.1`
Source owner: Founder
Task ID: `SG-MVP-004`
Status: AUTHORITATIVE — APPROVED WITH CONDITIONS

## Decision 1 — Immutable approval lifecycle

- **Decision number:** 1
- **Decision:** [FACT] `REQUIRE_APPROVAL` decisions are immutable. A trusted approval grant binds the original decision, action fingerprint, organization, policy version, verified approver identity, and expiry. Approval triggers a fresh evaluation that may mint a new `ALLOW`; the original decision never becomes executable.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] The requesting agent cannot self-approve; an arbitrary payload grant is not trusted; any changed action or invalid/expired grant requires fresh evaluation and approval.
- **Rationale:** [FACT] Immutable decisions preserve audit integrity and prevent an originally non-executable artifact from changing meaning.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1
- **Superseded decision:** [FACT] Supersedes the earlier underspecified approval-evidence model that did not define an immutable lifecycle or fresh decision.
- **Implementation consequence:** [FACT] Implement trusted grant verification, grant/action binding, new-request re-evaluation, new `decision_id`, idempotent grant use, and replay rejection.

## Decision 2 — Internal dogfood approver

- **Decision number:** 2
- **Decision:** [FACT] Founder is the only production-deploy approver for internal v0.1 dogfood, using a credential distinct from agent and executor credentials.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] This is an internal dogfood rule, not a permanent customer-product restriction; no general approval dashboard is authorized.
- **Rationale:** [FACT] A single trusted internal approver minimizes ambiguity and privilege crossover during the first proof.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 internal dogfood
- **Superseded decision:** [FACT] Supersedes the earlier assumption that Founder was merely the default role without a distinct trust requirement.
- **Implementation consequence:** [FACT] Define a Founder-only trusted approval principal and reject agent/executor credentials at the approval boundary.

## Decision 3 — Policy versus error semantics

- **Decision number:** 3
- **Decision:** [FACT] Strictly separate HTTP `200` policy decisions, `4xx` caller/auth/schema/contract failures, and `5xx/503` system/dependency failures.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Executor fails closed for every non-valid `ALLOW`, but system failures must never be represented or audited as policy `DENY`.
- **Rationale:** [FACT] Policy outcomes and operational failures require different audit, reliability, and remediation treatment.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1
- **Superseded decision:** [FACT] Supersedes broad fail-closed wording that described malformed, unknown, or unavailable-system cases as returning `DENY`.
- **Implementation consequence:** [FACT] Implement distinct response envelopes/statuses, audit classifications, and executor tests for every error class.

## Decision 4 — Atomic consume state machine

- **Decision number:** 4
- **Decision:** [FACT] Approve atomic single-use consumption and the minimum transactional state store; the contract may use `POST /v1/decisions/{decision_id}/consume`.
- **Approval status:** APPROVED_WITH_SCOPE_LIMIT
- **Restrictions:** [FACT] The consume operation is internal or preview-protected in v0.1 and must not be positioned as a generally available production API.
- **Rationale:** [FACT] Single-use, concurrency, and race guarantees require an authoritative atomic state transition.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 preview/internal enforcement
- **Superseded decision:** [FACT] Supersedes executor-only or stateless consumption semantics.
- **Implementation consequence:** [FACT] Add transactional `AVAILABLE → CONSUMED`, attempt idempotency, one-winner concurrency, consume receipt, and permanent consumption.

## Decision 5 — Preview authentication and tenancy

- **Decision number:** 5
- **Decision:** [FACT] Approve scoped API-key preview authentication with organization binding and logically separate agent, executor, and approver principals.
- **Approval status:** APPROVED_WITH_SCOPE_LIMIT
- **Restrictions:** [FACT] Do not expand v0.1 into full IAM, SSO, RBAC, or an enterprise identity product.
- **Rationale:** [FACT] The preview needs a concrete tenant trust boundary without absorbing identity-platform scope.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 preview
- **Superseded decision:** [FACT] Supersedes trust in unconstrained payload organization, agent, mandate, or approver identity fields.
- **Implementation consequence:** [FACT] Store hashed scoped keys, derive tenant/principal context server-side, scope every lookup by tenant, and reject cross-tenant assertions.

## Decision 6 — Fingerprint and action scope

- **Decision number:** 6
- **Decision:** [FACT] Approve RFC 8785 canonicalization, SHA-256 fingerprints, strict unknown-field rejection, decimal-string money, and action-specific normalization.
- **Approval status:** APPROVED_WITH_ACTION_SCOPE_LIMIT
- **Restrictions:** [FACT] The first sprint fully implements and tests canonicalization only for `deploy_change`; other action schemas are planned contracts only.
- **Rationale:** [FACT] One complete vertical slice is safer and more testable than incomplete canonicalization across multiple actions.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 first sprint
- **Superseded decision:** [FACT] Supersedes generic fingerprint language without a serialization standard or action scope.
- **Implementation consequence:** [FACT] Implement deploy-only golden vectors and ensure every execution-relevant deploy field invalidates prior decisions when changed.

## Decision 7 — Canonical response and legacy aliases

- **Decision number:** 7
- **Decision:** [FACT] Approve canonical response bodies with derived legacy aliases during preview.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Aliases cannot diverge or authorize independently; no public deprecation clock or 90-day commitment may be published before production evidence exists.
- **Rationale:** [FACT] One authoritative response prevents semantic drift while preserving a narrow preview compatibility path.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 preview
- **Superseded decision:** [FACT] Supersedes the unapproved assumption of a future 90-day deprecation notice.
- **Implementation consequence:** [FACT] Define canonical-to-legacy alias derivation and contract tests; keep canonical fields authoritative.

## Decision 8 — Data handling and retention

- **Decision number:** 8
- **Decision:** [FACT] Approve minimum-data storage, no full diffs/messages/attachments/secrets, structured allowlist logging, redaction, and 30-day preview retention.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Applies only to preview; production retention, deletion, residency, backup, and legal-hold policy remain unresolved.
- **Rationale:** [FACT] The preview needs enough state for control/audit without becoming a sensitive-content store.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 preview
- **Superseded decision:** [FACT] Supersedes the earlier audit requirement without explicit minimization or retention rules.
- **Implementation consequence:** [FACT] Implement allowlisted persistence/logging, prohibited-input rejection, redaction tests, and 30-day expiry.

## Decision 9 — Secret-touching deployment

- **Decision number:** 9
- **Decision:** [FACT] Secret-touching deployment is hard `DENY` in v0.1.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Accept only non-sensitive flags/category codes; prohibit secret names/values, environment files, tokens, credentials, private keys, and signing material.
- **Rationale:** [FACT] v0.1 lacks the secret-handling controls required to evaluate or store secret-bearing changes safely.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1
- **Superseded decision:** [FACT] Resolves the original `REQUIRE_APPROVAL or DENY` option in favor of hard denial.
- **Implementation consequence:** [FACT] Policy returns `200 + DENY / SECRET_CHANGE_NOT_SUPPORTED_V0_1` for a valid flagged request and rejects actual secret material before policy evaluation.

## Decision 10 — Validity and permanent consumption

- **Decision number:** 10
- **Decision:** [FACT] Approve 15-minute maximum `ALLOW` validity, single-use enforcement, and permanent consumption once the execution attempt begins.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Consume immediately before the irreversible action; if external execution fails afterward, the decision remains consumed and a new decision is required.
- **Rationale:** [FACT] Short validity and one-time use reduce stale authorization and replay risk; permanent consumption favors safety over automatic retry.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1
- **Superseded decision:** [FACT] Supersedes example-only validity and underspecified retry behavior.
- **Implementation consequence:** [FACT] Enforce expiry at decision and consume boundaries, persist consume receipt, and require new evaluation after failure.

## Decision 11 — Non-production dogfood

- **Decision number:** 11
- **Decision:** [FACT] Approve non-production dogfood only.
- **Approval status:** APPROVED
- **Restrictions:** [FACT] Any real production deployment remains blocked behind separate Founder Gate 4 approval.
- **Rationale:** [FACT] Contract and enforcement behavior must be proven without exposing production systems to an unreviewed control path.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 dogfood
- **Superseded decision:** [FACT] Confirms and narrows the original “no production required” default.
- **Implementation consequence:** [FACT] Tests and evidence use preview or simulation; no production deployment command is authorized by Gate 1.

## Decision 12 — Commerce adapter sprint-one status

- **Decision number:** 12
- **Decision:** [FACT] Commerce compatibility is `DOCUMENTED_NON_LIVE_STUB` in the first sprint.
- **Approval status:** DECIDED_DOCUMENTED_NON_LIVE_STUB
- **Restrictions:** [FACT] Preserve routes/discovery; deliver canonical mapping, schema, canonical response/derived aliases, contract tests, and preview/planned docs only. Do not implement full payment/x402 enforcement until the deploy vertical slice passes QA and independent review.
- **Rationale:** [FACT] Compatibility intent must remain visible without expanding the first sprint beyond the deploy-control proof.
- **Decision date:** 2026-07-18
- **Applicable version:** v0.1 first sprint
- **Superseded decision:** [FACT] Supersedes an optional or potentially complete first-sprint commerce adapter.
- **Implementation consequence:** [FACT] Build documentation/schema/tests only and ensure all public claims remain non-live.

## Gate effect

- [FACT] These decisions authorize contract revision, not implementation.
- [FACT] Current state remains `PM_CONTRACT_GATE=REVISE` and `DEVELOPER_STATUS=BLOCKED` until Founder final approval of all revised source artifacts.

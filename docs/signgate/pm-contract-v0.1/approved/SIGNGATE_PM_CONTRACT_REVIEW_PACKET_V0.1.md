# SignGate PM Contract Founder Pre-Approval Review Packet v0.1

Date: 2026-07-18
Prepared by: Nomos Labs — PM
Requested by: CMO
Historical determination: `PM_CONTRACT_GATE=REVISE`
Developer status: `BLOCKED`

> This packet records the pre-approval review that produced the Founder decisions later incorporated in `SIGNGATE_PM_CONTRACT_REVISION_CHANGELOG_V0.1.md`.

## 1. Executive summary of the five artifacts

- [FACT] `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md` defines SignGate as the Policy Decision Point for high-impact actions, with `deploy_change` first and external execution out of scope.
- [FACT] `SIGNGATE_DECISION_CONTRACT_V0.1.md` defines `/v1/decisions`, `ALLOW / REQUIRE_APPROVAL / DENY`, action binding, expiry, audit, idempotency, and compatibility direction.
- [FACT] `SIGNGATE_MVP_PRD_V0.1.md` defines the seven-day vertical slice, dogfood proof, acceptance criteria, and non-goals.
- [FACT] `SIGNGATE_LIVE_PREVIEW_CLAIMS_MATRIX.md` distinguishes live, preview, planned, not deployed, and direction claims.
- [FACT] `SIGNGATE_TASK_PACKAGES_V0.1.md` defines Developer, QA, Reviewer, and PM packages and keeps implementation blocked until Gate 1 passes.
- [INFERENCE] The baseline was product-coherent but required Founder decisions on approval trust, errors, atomic consume, tenancy, fingerprinting, data, and adapter scope before implementation.

## 2. `REQUIRE_APPROVAL` lifecycle review

- [RECOMMENDATION] A requesting agent cannot approve its own action.
- [RECOMMENDATION] Internal v0.1 dogfood uses Founder as the only production-deploy approver, authenticated by a principal distinct from agent and executor credentials.
- [RECOMMENDATION] Approver identity/role comes from a trusted approval authority or grant store, never arbitrary agent-supplied JSON.
- [RECOMMENDATION] The grant binds organization, original decision, action fingerprint, policy version, verified approver identity/role, issue time, and expiry.
- [RECOMMENDATION] The original `REQUIRE_APPROVAL` remains immutable and non-executable.
- [RECOMMENDATION] Approval is referenced in a fresh evaluation with a new `request_id`; success mints a new `ALLOW` and `decision_id`.
- [RECOMMENDATION] The grant is atomically used for one logical `ALLOW`; exact retry is idempotent, mismatched reuse returns `409`.
- [RECOMMENDATION] Action change, decision/grant/mandate expiry, or incompatible policy version invalidates the approval and requires fresh evaluation/approval.
- [RECOMMENDATION] A consumed `ALLOW` cannot be reused.

## 3. Decision versus transport/error semantics review

- [RECOMMENDATION] `200 + ALLOW / REQUIRE_APPROVAL / DENY` is returned only after successful auth, tenancy, schema, canonicalization, policy retrieval, evaluation, and required audit persistence.
- [RECOMMENDATION] `200 + DENY` is reserved for successful domain-policy outcomes: expired/revoked/out-of-scope resolved mandate, missing/stale mandatory evidence, failed tests, prohibited secret-touching deploy, blocked target/counterparty, or insufficient budget.
- [RECOMMENDATION] `400`: malformed JSON, duplicate keys, invalid content type, or excessive payload.
- [RECOMMENDATION] `401`: missing/invalid credential.
- [RECOMMENDATION] `403`: valid credential but wrong tenant/principal/action/grant scope.
- [RECOMMENDATION] `409`: request-ID mismatch, grant reuse mismatch, consume conflict, or already-consumed decision.
- [RECOMMENDATION] `422`: schema/enum/action-version/unknown-field/canonicalization contract failure.
- [RECOMMENDATION] `503`: required policy, approval, audit, or consumption dependency unavailable.
- [RECOMMENDATION] `500`: unexpected evaluator, canonicalizer, persistence, or invariant failure.
- [FACT] `4xx/5xx/503` can instruct fail-closed enforcement but are not policy `DENY`; system failures must never be represented as policy decisions.
- [FACT] Executor proceeds only after valid `200 + ALLOW` plus successful atomic consume; every other result refuses execution.

## 4. Single-use enforcement review

- [RECOMMENDATION] Use internal/preview-protected `POST /v1/decisions/{decision_id}/consume` immediately before the irreversible action.
- [RECOMMENDATION] Consume includes the recomputed fingerprint and an executor `execution_attempt_id`.
- [RECOMMENDATION] A transactional store atomically transitions `AVAILABLE → CONSUMED`.
- [RECOMMENDATION] Exactly one concurrent consume succeeds; same-attempt retry returns the prior receipt; a different attempt returns `409 DECISION_ALREADY_CONSUMED`.
- [RECOMMENDATION] The receipt binds decision, fingerprint, tenant, executor, attempt ID, and timestamp.
- [FACT] If execution fails after consume, the decision remains consumed and a new decision is required.
- [INFERENCE] A stateless token or eventually consistent cache without atomic compare-and-set cannot support a credible single-use claim.
- [RECOMMENDATION] v0.1 therefore needs the minimum transactional state for idempotency, grants, decision status, and consume receipts.

## 5. Authentication and tenancy review

- [RECOMMENDATION] Preview uses scoped API keys over TLS; only hashes are stored.
- [RECOMMENDATION] Each key binds one organization, principal type, allowed agent IDs/actions/environment, status, and rotation metadata.
- [RECOMMENDATION] Agent, executor, and approver are separate logical principals.
- [FACT] Payload `organization_id`, `agent_id`, mandate fields, approver fields, action, and evidence are caller claims until constrained or resolved by trusted server state.
- [RECOMMENDATION] Organization comes from credential binding; payload mismatch returns `403`.
- [RECOMMENDATION] Agent ID must be permitted by the credential registry.
- [RECOMMENDATION] Mandate ID is a tenant-scoped reference; authoritative issuer, scope, expiry, and status come from the server mandate/policy store.
- [RECOMMENDATION] Approver identity/role comes from the trusted approval authority/store.
- [RECOMMENDATION] All resource lookups and uniqueness constraints are tenant-scoped; cross-tenant mismatch reveals no foreign-resource existence.
- [RECOMMENDATION] v0.1 must not expand this into IAM, SSO, RBAC, or enterprise identity.

## 6. Action fingerprint review

- [RECOMMENDATION] Use RFC 8785 JSON Canonicalization Scheme plus SHA-256 over UTF-8 canonical bytes, encoded as lowercase hex with `sha256:`.
- [RECOMMENDATION] Reject duplicate keys, unknown fields, ambiguous encodings, invalid UTF-8, invalid nulls, NaN, and infinity.
- [RECOMMENDATION] Fingerprint authenticated organization, resolved agent, contract version, action type, and all normalized target/parameter fields that affect what/where/how execution occurs.
- [RECOMMENDATION] For `deploy_change`, include environment, service/project, repository, commit, artifact/build digest, routes, paths or diff digest, secret/DNS/credential/permission flags, deployment strategy/command ID, and configuration fingerprint.
- [RECOMMENDATION] Objects follow RFC 8785 ordering; ordered arrays preserve order; schema-declared sets are validated, deduplicated, and sorted.
- [RECOMMENDATION] Omit optional values; reject null unless explicitly nullable.
- [RECOMMENDATION] Money in planned schemas uses decimal strings plus asset.
- [RECOMMENDATION] Enums use canonical case; opaque IDs/paths remain case-sensitive unless explicitly normalized.
- [FACT] Any execution-related change invalidates the decision and approval.
- [RECOMMENDATION] First sprint fully implements/test canonicalization only for `deploy_change`; other actions remain planned.

## 7. Compatibility adapter review

- [RECOMMENDATION] Map commerce agent/buyer/mandate/merchant/resource/payment/budget/risk/x402 fields into the canonical tenant-constrained request and provenance-preserving evidence model.
- [FACT] Adapter and canonical surface must share evaluator, enum, decision ID, fingerprint, policy version, reason codes, audit ID, expiry, and consume semantics.
- [RECOMMENDATION] Canonical body is authoritative; preview legacy fields such as `signer_directive` are derived read-only aliases and cannot diverge.
- [RECOMMENDATION] Old clients that cannot verify fingerprint/expiry/consume are demo clients, not enforcement integrations.
- [RECOMMENDATION] First sprint preserves routes/discovery, documents mapping/aliases, adds schemas/tests, and labels the adapter non-live; full payment/x402 enforcement is deferred.
- [FACT] No deprecation clock or 90-day promise should be published without production usage and migration evidence.

## 8. Data handling review

- [RECOMMENDATION] Store only IDs, versions, normalized action metadata, fingerprints, evidence references/status, reason codes, decision, approval reference, timestamps, enforcement outcome, and consume receipt needed for control/audit.
- [RECOMMENDATION] For deploys, store hashes and necessary paths/routes/flags; no full source diff or draft file by default.
- [RECOMMENDATION] For planned messages, store recipient pseudonymous hash/domain and content/attachment digests; no full bodies or attachments.
- [FACT] Prohibit private keys, seed phrases, passwords, tokens, API keys, cookies, signing material, payment credentials, raw secrets, environment files, full source archives/diffs, full messages, attachments, identity documents, and regulated sensitive data.
- [RECOMMENDATION] Use structured allowlist logging, redact sensitive headers, disable request-body dumps, and never echo rejected secrets.
- [RECOMMENDATION] Preview retention is 30 days for decisions, approvals, audit, idempotency, and consume records.
- [OPEN] Production retention, deletion, residency, backup, legal hold, and deletion SLA remain unresolved.

## 9. Dogfood acceptance flow

- [FACT] PDP is the SignGate decision endpoint, evaluator, trusted mandate/policy/approval resolution, and decision/audit persistence.
- [FACT] PEP is the reference deployment wrapper plus atomic consume operation.
- [FACT] Evidence producers are CI/tests, repository/diff collector, mandate/policy store, and approval authority.

1. [FACT] Preview deploy + valid mandate + passing commit-bound tests → `200 + ALLOW`; PEP fingerprints, consumes once, and performs preview/simulation; retain decision, receipt, and result evidence.
2. [FACT] Production deploy → `200 + REQUIRE_APPROVAL`; PEP refuses; verified Founder grant plus unchanged fresh evaluation may mint new `ALLOW`; no real production action without Gate 4.
3. [FACT] `touches_secrets: true` → `200 + DENY / SECRET_CHANGE_NOT_SUPPORTED_V0_1`; no consume; retain redacted refusal evidence.
4. [FACT] Failed tests → `200 + DENY / TESTS_FAILED`; no consume; retain test reference and refusal.
5. [FACT] Payload changes after `ALLOW` → fingerprint mismatch; PEP refuses before consume; retain both fingerprints and refusal.
6. [FACT] Expired decision → PEP and consume refuse; retain expiry evidence; no successful receipt.
7. [FACT] Exact duplicate request → same artifact; different payload with same ID → `409`; one consume succeeds and replay/concurrency attempts fail or return the same receipt only for the same attempt ID.

## 10. Differences from the original PM command

- [FACT] Broad “return DENY” fail-closed language was refined into policy `DENY` versus `4xx/5xx` errors while preserving executor fail-closed behavior.
- [FACT] Secret-touching deployment was selected as hard `DENY` rather than the original `REQUIRE_APPROVAL or DENY` option.
- [FACT] Immutable approval, trusted grant, fresh `ALLOW`, and approval-grant state were added.
- [FACT] Atomic consume endpoint and transactional state were added to make single-use enforceable.
- [FACT] API-key tenant binding and distinct agent/executor/approver principals were added.
- [FACT] RFC 8785 and action-specific normalization were added; implementation was narrowed to `deploy_change`.
- [FACT] Adapter response compatibility and non-live first-sprint stub scope were added.
- [FACT] Minimum-data storage and 30-day preview retention were added.
- [FACT] A previously suggested 90-day deprecation assumption was withdrawn as an unapproved commitment.

## 11. Open questions and Founder approval items identified

- [OPEN] Transactional state technology, trusted Founder human-auth mechanism, key rotation, clock/skew, exact deploy fields/libraries, audit expiry deletion, and consume exposure form.
- [FACT] Founder decisions were required for immutable approval, Founder-only internal approver, error separation, atomic consume/state, scoped API-key tenancy, RFC 8785 deploy-only scope, adapter aliases/deprecation, data/retention, secret hard denial, 15-minute permanent consume, non-production-only dogfood, and adapter stub scope.
- [FACT] Those decisions were subsequently provided as `APPROVED_WITH_CONDITIONS` and are incorporated in the revision changelog and revised artifacts.

## 12. Historical gate recommendation

```text
PM_CONTRACT_GATE=REVISE
DEVELOPER_STATUS=BLOCKED
NEXT_ACTION=FOUNDER_DECISION_ON_SECTION_12_ITEMS
```

- [FACT] This packet did not authorize implementation.

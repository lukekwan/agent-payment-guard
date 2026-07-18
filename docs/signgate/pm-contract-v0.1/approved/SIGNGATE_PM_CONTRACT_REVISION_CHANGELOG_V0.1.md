# SignGate PM Contract Revision Changelog v0.1

Date: 2026-07-18
Owner: Nomos Labs — PM
Trigger: `FOUNDER_DECISION_ON_SECTION_12=APPROVED_WITH_CONDITIONS`
Current gate: `PM_CONTRACT_GATE=REVISE`
Developer status: `BLOCKED`

## 1. Revision scope

- [FACT] Revised `SIGNGATE_DECISION_CONTRACT_V0.1.md`.
- [FACT] Revised `SIGNGATE_MVP_PRD_V0.1.md`.
- [FACT] Revised `SIGNGATE_TASK_PACKAGES_V0.1.md`.
- [FACT] Revised `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md` only where needed to clarify the minimum stateful consume surface and explicit non-goals.
- [FACT] Did not change `SIGNGATE_LIVE_PREVIEW_CLAIMS_MATRIX.md` and did not mark any API or enforcement capability `LIVE`.
- [FACT] Added this changelog; the earlier Founder Pre-Approval Review Packet remains the historical review record.

## 2. Exact Founder decisions incorporated

| # | Founder decision | Incorporated contract result | Affected artifact sections |
|---|---|---|---|
| 1 | [FACT] Immutable `REQUIRE_APPROVAL`; trusted bound grant; fresh evaluation; new `ALLOW`. | [FACT] Original decision never becomes executable; grant binds organization, decision, fingerprint, policy, approver, and expiry; new request mints new decision. | [FACT] Decision Contract §§6, 7; MVP PRD FR-13, AC-11; Task Packages Developer/QA scopes. |
| 2 | [FACT] Founder-only production-deploy approver for internal dogfood; separate credentials. | [FACT] Founder-only rule is internal, not a permanent customer restriction; agent/executor/approver credentials are distinct. | [FACT] Product Boundary §§5, 7; Decision Contract §§6, 14; MVP PRD NFR-08; Task Packages constraints/tests. |
| 3 | [FACT] Separate `200` policy decisions, `4xx` caller/contract failures, and `5xx/503` system failures. | [FACT] `200 + DENY` is only successful policy evaluation; errors carry fail-closed effect without masquerading as policy denial. | [FACT] Decision Contract §8; MVP PRD FR-11, AC-12; Task Packages Developer/QA/Reviewer tests. |
| 4 | [FACT] Atomic consume and minimum transactional state, preview-protected/internal only. | [FACT] Added `POST /v1/decisions/{decision_id}/consume`, atomic `AVAILABLE → CONSUMED`, idempotent attempt receipts, concurrent-use protection, and minimum state store. | [FACT] Product Boundary §4; Decision Contract §§13, 16; MVP PRD P0, FR-12/15, AC-13; Task Packages deliverables/tests. |
| 5 | [FACT] API-key preview auth with organization binding and separate principals; no IAM expansion. | [FACT] Scoped hashed keys bind tenant/principal/action/environment; cross-tenant requests fail; no IAM/SSO/RBAC product. | [FACT] Product Boundary §5; Decision Contract §14; MVP PRD FR-14, NFR-08, AC-14; Task Packages deliverables/constraints/tests. |
| 6 | [FACT] RFC 8785/SHA-256/strict fields/decimal strings, implemented only for `deploy_change`. | [FACT] Frozen canonical rules and deploy execution fields; all other action canonicalizers remain planned and out of first-sprint scope. | [FACT] Product Boundary §8; Decision Contract §15; MVP PRD action scope, FR-16, NFR-06, AC-15/16; Task Packages deliverables/constraints/tests. |
| 7 | [FACT] Canonical responses with derived preview aliases; no published deprecation clock. | [FACT] Canonical response is authoritative; legacy aliases are derived only; 90-day assumption removed as a commitment. | [FACT] Decision Contract §2; MVP PRD P1/AC-16; Task Packages adapter-stub deliverables/tests. |
| 8 | [FACT] Minimum-data storage, prohibited full content/secrets, allowlist logging, 30-day preview retention. | [FACT] Added accepted/prohibited data boundaries, structured logging, and preview-only retention; production policies remain open. | [FACT] Decision Contract §17; MVP PRD FR-17, NFR-09, AC-17; Task Packages deliverables/tests. |
| 9 | [FACT] Secret-touching deployment hard `DENY`; only non-sensitive flags/categories accepted. | [FACT] Retained hard policy denial and explicitly prohibited secret names, values, environment files, tokens, credentials, and signing material. | [FACT] Decision Contract §§9, 17; MVP PRD deployment template/NFR-09; Task Packages constraints/tests. |
| 10 | [FACT] 15-minute `ALLOW`, single use, permanent consume after attempt begins. | [FACT] Executor consumes immediately before irreversible action; failure after consume requires a new decision. | [FACT] Decision Contract response semantics, §§13, 16; MVP PRD FR-12/AC-13; Task Packages done criteria/tests. |
| 11 | [FACT] Non-production dogfood only; real production stays behind Gate 4. | [FACT] Revised artifacts explicitly preserve non-production scope and separate Founder Gate 4. | [FACT] Decision Contract §18; MVP PRD AC-10/Founder decisions; Task Packages constraints/gate sequence. |
| 12 | [FACT] Commerce adapter is a documented non-live stub in sprint one. | [FACT] Preserve routes/discovery, document mapping/response/aliases, add schema tests, accurate labels; no full payment/x402 enforcement. | [FACT] Decision Contract §§2, 11; MVP PRD P1/action scope/AC-16; Task Packages deliverables/constraints/tests. |

## 3. Required section-level change ledger

| Artifact | Section changed | Previous semantics | Revised semantics | Founder decision reference | Unresolved implementation choice | Acceptance criteria impact |
|---|---|---|---|---|---|---|
| `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md` | Product role / owns / non-goals | [FACT] PDP and executor-owned consumption were described without authoritative control state. | [FACT] SignGate owns minimum transactional idempotency/grant/decision/consume state and an internal/preview-protected consume surface, but not the external executor. | FD-4, FD-10 | [OPEN] Concrete transactional technology and internal-vs-protected-route deployment shape. | [FACT] Developer scope and QA/Reviewer state-boundary review affected. |
| `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md` | Non-goals / action scope | [FACT] Multiple secondary actions remained broadly described. | [FACT] No dashboard, IAM/SSO/RBAC, approval inbox, Gmail/social/CRM integration, or non-deploy vertical slice in sprint one. | FD-2, FD-5, FD-6, FD-12 | [OPEN] None for Gate 1; later roadmap remains separate. | [FACT] Developer scope and Reviewer scope-creep criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Approval grant semantics | [FACT] Approval evidence existed without a complete trusted issuer/state transition. | [FACT] Immutable `REQUIRE_APPROVAL`, trusted bound grant, fresh request/evaluation, new `ALLOW`, and atomic grant use. | FD-1, FD-2 | [OPEN] Trusted Founder human-auth mechanism. | [FACT] Developer implementation plus QA/Reviewer grant forgery/replay criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Decision/error model | [FACT] Some malformed/system cases were grouped under fail-closed `DENY`. | [FACT] `200` policy outcomes, `4xx` contract/auth errors, and `5xx/503` system failures are separate; only enforcement effect is fail closed. | FD-3 | [OPEN] Error-envelope field names may be finalized without changing semantics. | [FACT] Developer, QA, and Reviewer error-path criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Authentication and tenancy | [FACT] Organization, agent, mandate, and approver were mainly request fields. | [FACT] Scoped API keys bind tenant/principal; server resolves trust; agent/executor/approver are distinct; every lookup is tenant-scoped. | FD-5 | [OPEN] Key issuance/rotation/revocation mechanism. | [FACT] Developer and QA cross-tenant criteria; Reviewer impersonation criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Action fingerprint | [FACT] SHA-256 binding lacked a complete canonical standard/action boundary. | [FACT] RFC 8785 + SHA-256, strict fields, deploy-only normalization/golden vectors, every execution field invalidates old artifacts. | FD-6 | [OPEN] Library selection and exact first integration deploy field set. | [FACT] Developer canonicalizer; QA vectors/mutation; Reviewer substitution criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Atomic consumption | [FACT] Single-use was stated but consume authority/races were underspecified. | [FACT] Preview-protected consume, transactional CAS, attempt idempotency, one-winner concurrency, receipts, permanent consumption. | FD-4, FD-10 | [OPEN] State technology, trusted clock/skew, route vs internal service method. | [FACT] Developer state machine; QA race/replay; Reviewer concurrency criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Data handling / retention | [FACT] Audit existed without explicit payload minimization or retention. | [FACT] No full diffs/messages/attachments/secrets; allowlist logs/redaction; 30-day preview retention. | FD-8, FD-9 | [OPEN] Expiry deletion/anonymization implementation; production policies unresolved. | [FACT] Developer persistence; QA leak/retention; Reviewer audit/privacy criteria affected. |
| `SIGNGATE_DECISION_CONTRACT_V0.1.md` | Commerce compatibility | [FACT] Adapter implementation timing and response compatibility were open. | [FACT] `DOCUMENTED_NON_LIVE_STUB`; mapping/schema/aliases/tests/docs only; canonical response authoritative; no deprecation clock. | FD-7, FD-12 | [OPEN] Exact stub file organization and later adapter milestone. | [FACT] Developer docs/schema only; QA contract tests; Reviewer no-enforcement/no-live-claim criteria affected. |
| `SIGNGATE_MVP_PRD_V0.1.md` | P0/P1 scope and requirements | [FACT] P0 did not fully specify auth/state/error/data controls and multiple actions could appear implementable. | [FACT] Added trusted approval/auth/tenancy/consume/state/data requirements and limited implementation to `deploy_change`. | FD-1–FD-10, FD-12 | [OPEN] Bounded technical choices listed above. | [FACT] All Developer/QA/Reviewer acceptance packages affected. |
| `SIGNGATE_MVP_PRD_V0.1.md` | Dogfood / AC | [FACT] Seven scenarios lacked full error, race, tenant, and sensitive-data expectations; two extra paths used ambiguous error/deny wording. | [FACT] Seven mandatory scenarios plus separate `409` and `503` tests; added grant, race, tenant, fingerprint, adapter-stub, and redaction acceptance criteria. | FD-1, FD-3–FD-6, FD-8–FD-12 | [OPEN] Test harness and concurrency implementation. | [FACT] QA and Reviewer acceptance criteria directly affected; Developer must produce evidence. |
| `SIGNGATE_LIVE_PREVIEW_CLAIMS_MATRIX.md` | Commerce/consume/auth/approval rows | [FACT] Commerce was “adapter planned” and new approved contract surfaces were not listed. | [FACT] Commerce is exactly `DOCUMENTED_NON_LIVE_STUB`; consume/auth/approval remain planned/internal/not deployed and never LIVE. | FD-4, FD-5, FD-12 | [OPEN] Release-time URL/state verification. | [FACT] QA claims verification and Reviewer misleading-claims criteria affected. |
| `SIGNGATE_TASK_PACKAGES_V0.1.md` | Developer deliverables/constraints | [FACT] A broader evaluator and optional commerce adapter were possible. | [FACT] Exact deploy vertical slice, decision API, auth/tenant binding, evaluator, consume/state, enforcement wrapper, audit, tests, minimum docs; prohibited expansion listed. | FD-1–FD-12 | [OPEN] Bounded implementation technology. | [FACT] Developer scope is replaced; QA/Reviewer verify same frozen commit. |
| `SIGNGATE_PM_CONTRACT_REVIEW_PACKET_V0.1.md` | Historical review record | [FACT] The initial five artifacts lacked Founder-resolved semantics. | [FACT] Preserves the eight-area review, differences, open questions, and historical `REVISE` recommendation that led to FD-1–FD-12. | FD-1–FD-12 | [OPEN] None; historical record only. | [FACT] Provides Reviewer traceability; does not itself authorize Developer. |
| `SIGNGATE_FOUNDER_DECISIONS_V0.1.md` | New governance record | [FACT] Founder decisions existed only in conversation. | [FACT] Twelve decisions are recorded with status, restrictions, rationale, date, version, supersession, and consequences. | FD-1–FD-12 | [OPEN] Only choices explicitly left unresolved in each decision. | [FACT] Becomes authoritative acceptance/change-control input for all roles. |

## 4. Artifact-by-artifact changes

### 3.1 `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md`

- [FACT] Status changed to revised/final-approval-pending.
- [FACT] Clarified that v0.1 includes PDP plus minimum transactional decision/idempotency/approval/consume state.
- [FACT] Added the internal or preview-protected consume surface to owned scope.
- [FACT] Reconfirmed that SignGate does not execute deployments or other external actions.
- [FACT] Added explicit non-goals: full IAM/SSO/RBAC, approval dashboard, generally available consume API, and non-deploy vertical slices in sprint one.
- [FACT] Replaced the Founder-approver assumption with the approved internal dogfood rule.
- [FACT] Updated gate state to `REVISE`.

### 3.2 `SIGNGATE_DECISION_CONTRACT_V0.1.md`

- [FACT] Added immutable approval/new-evaluation/new-`ALLOW` lifecycle and trusted grant requirements.
- [FACT] Separated policy decisions from caller/contract and system/dependency errors.
- [FACT] Added scoped API-key authentication, tenant binding, principal separation, server-resolved mandate/approval trust, and cross-tenant protection.
- [FACT] Added complete `deploy_change` RFC 8785/SHA-256 fingerprint scope and normalization rules.
- [FACT] Added atomic consume endpoint, compare-and-set state machine, receipts, concurrency/idempotency rules, and permanent consumption.
- [FACT] Added minimum-data handling and 30-day preview retention.
- [FACT] Converted commerce compatibility to a documented non-live stub and removed any unapproved deprecation commitment.
- [FACT] Limited first-sprint implementation to the `deploy_change` vertical slice.

### 3.3 `SIGNGATE_MVP_PRD_V0.1.md`

- [FACT] Added auth, tenancy, trusted approval, atomic consume, transactional state, data handling, and retention to P0/functional requirements.
- [FACT] Limited implemented canonicalization and policy/enforcement to `deploy_change`.
- [FACT] Converted commerce compatibility into route/docs/schema/test work only.
- [FACT] Added acceptance criteria for error separation, grant immutability, concurrent consume, cross-tenant isolation, full deploy-field fingerprint invalidation, adapter non-live scope, and redaction/retention.
- [FACT] Replaced pending Founder decision list with the decisions incorporated and final-gate requirement.

### 3.4 `SIGNGATE_TASK_PACKAGES_V0.1.md`

- [FACT] Kept all execution packages blocked and updated current gate to `REVISE`.
- [FACT] Narrowed Developer implementation to `deploy_change` plus preview-protected consume/auth/state/audit surfaces.
- [FACT] Replaced the optional full adapter with a mandatory documented non-live stub package.
- [FACT] Added QA cases for approval immutability, tenant isolation, canonicalization vectors, concurrent consume, transport semantics, retention/redaction, and adapter-stub status.
- [FACT] Added Reviewer questions for forged approval, credential privilege crossover, cross-tenant access, consume races, system-error misclassification, and scope expansion.
- [FACT] Updated the exact OpenClaw command to keep Developer blocked until explicit final `PASS`.

## 5. Remaining open implementation choices

- [OPEN] Transactional state technology that provides atomic compare-and-set and uniqueness guarantees.
- [OPEN] Internal human-auth mechanism used by the trusted Founder approval authority.
- [OPEN] API-key issuance, rotation, revocation, and storage implementation details within the approved scoped-key model.
- [OPEN] Trusted clock source and maximum permitted clock skew for decisions, grants, and consume.
- [OPEN] Exact `deploy_change` repository, artifact, diff/configuration, and deployment-strategy fields required by the first reference integration.
- [OPEN] Concrete RFC 8785 and SHA-256 libraries and cross-language golden-vector harness.
- [OPEN] Audit deletion/anonymization implementation after 30-day preview expiry.
- [OPEN] Whether the preview-protected consume surface is an externally addressable protected route or an internal service method using the same contract.
- [FACT] These are implementation choices, not permission to change approved product semantics or expand scope.

## 6. Explicitly unresolved production policy

- [FACT] Production retention, deletion SLA, residency, backups, and legal hold are unresolved.
- [FACT] Customer approval models, multi-approver quorum, enterprise identity, SSO, and RBAC are unresolved and out of v0.1 scope.
- [FACT] Public consume API availability, SLA, and production authentication are unresolved.
- [FACT] Full `send_external_message`, `payment`, and `x402_purchase` enforcement contracts remain planned.
- [FACT] No deprecation period is committed publicly.
- [FACT] Canonical production domain, public launch, pricing, outreach, and any real production deployment remain Gate 4 decisions.

## 7. Claims and implementation confirmation

- [FACT] `SIGNGATE_LIVE_PREVIEW_CLAIMS_MATRIX.md` was not promoted or changed to mark any new capability `LIVE`.
- [FACT] The Decision API, consume surface, trusted approval flow, and commerce adapter remain not implemented.
- [FACT] No product/source code, API implementation, schema implementation, test implementation, website code, Worker code, deployment configuration, or infrastructure was modified during this revision.
- [FACT] No commit was created.
- [FACT] Only PM Markdown artifacts were revised or added.

## 8. Final PM recommendation

- [INFERENCE] The revised artifacts now incorporate all twelve Founder decisions and scope limits without expanding beyond the `deploy_change` vertical slice.
- [INFERENCE] The remaining open items are bounded implementation choices and do not block contract freeze, provided Developer cannot alter the approved semantics without PM/Founder change control.
- [RECOMMENDATION] PM recommends Founder set `PM_CONTRACT_GATE=PASS` after reviewing these revisions and this changelog.
- [FACT] PM does not self-approve the gate; current state remains:

```text
PM_CONTRACT_GATE=REVISE
PM_RECOMMENDATION=PASS
DEVELOPER_STATUS=BLOCKED
NEXT_ACTION=FOUNDER_FINAL_APPROVAL
```

- [FACT] Stop after this revision package and wait for Founder approval.

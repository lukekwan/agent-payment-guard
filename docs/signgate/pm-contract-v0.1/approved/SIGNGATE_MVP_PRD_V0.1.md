# SignGate MVP PRD v0.1

Date: 2026-07-18
Owner: Nomos Labs — PM
Status: REVISED AFTER FOUNDER PRE-APPROVAL — FINAL GATE APPROVAL PENDING

## 1. Product outcome

- [FACT] Seven-day outcome: freeze, implement, document, and dogfood `SIGNGATE_GENERAL_DECISION_CONTRACT_V0.1` through one deployment-control flow.
- [FACT] This sprint does not build a dashboard or expand use cases.
- [INFERENCE] The MVP succeeds only if a downstream executor demonstrably refuses unsafe, changed, expired, or unapproved actions.

## 2. Problem

- [FACT] Agents can propose high-impact actions faster than humans can manually inspect every step.
- [FACT] A model's ability to choose an action is not proof of mandate, policy compliance, or authority.
- [FACT] Existing public SignGate surfaces show a decision concept but no verified production general Decision API.
- [INFERENCE] Without an action-bound enforcement proof, SignGate risks being perceived as a recommendation API rather than a control layer.

## 3. Initial customer and job-to-be-done

- [FACT] Primary customer: AI-native development teams, coding/deployment-agent teams, and agencies building autonomous workflows.
- [FACT] Primary job: “Before my agent deploys a change, deterministically decide whether it may proceed and give my wrapper enough evidence to enforce that result.”
- [FACT] Secondary customer/job: operations teams gating outbound messages.
- [FACT] Payment/x402 remains a supported compatibility surface.

## 4. Scope

### P0 product capabilities

- [FACT] Machine-readable request/response schemas for the frozen contract.
- [FACT] Deterministic reference evaluator.
- [FACT] Preview `POST /v1/decisions` endpoint.
- [FACT] Deployment and communications policy templates.
- [FACT] Action fingerprinting, expiry, policy versioning, audit ID, idempotency, and replay semantics.
- [FACT] Reference deployment enforcement wrapper.
- [FACT] Internal or preview-protected atomic consume operation and minimum transactional control-state store.
- [FACT] Scoped API-key authentication with organization binding and logically separate agent, executor, and approver principals.
- [FACT] Minimum static/in-repo developer docs and three curl examples.
- [FACT] Contract tests and an evidence/acceptance report.

### P1 compatibility

- [FACT] Commerce-preflight is a documented non-live stub in the first sprint, not a full enforcement adapter.
- [FACT] Preserve existing commerce route/discovery surfaces, document canonical request mapping, define canonical response and derived legacy aliases, add schema/contract tests, and label status accurately.
- [FACT] Payment/x402 adapter example in docs.
- [FACT] Existing x402/public listing behavior remains unchanged.
- [FACT] Full `payment`/`x402_purchase` enforcement is deferred until the `deploy_change` vertical slice passes QA and independent review.

### First-sprint action scope

- [FACT] `deploy_change` is the only action with fully implemented evaluator policy, RFC 8785 canonicalization, SHA-256 fingerprinting, and enforcement tests.
- [FACT] `send_external_message`, `payment`, and `x402_purchase` may be documented as planned contracts but must not expand the first implementation scope.

## 5. User stories

- [FACT] As a developer, I can submit a preview deployment with commit-bound passing tests and receive a deterministic `ALLOW`.
- [FACT] As a founder, I can require approval for every production deployment.
- [FACT] As an executor, I can prove a decision belongs to the exact action I am about to execute.
- [FACT] As an auditor, I can connect request, decision, policy, enforcement, and result through stable identifiers.
- [FACT] As an integrator of the old commerce surface, I can migrate without silent endpoint removal or decision-enum changes.

## 6. Functional requirements

- [FACT] FR-01: The API accepts only the frozen request shape and rejects unknown/unfingerprinted action fields.
- [FACT] FR-02: The evaluator is deterministic for the same canonical request, policy version, and evidence.
- [FACT] FR-03: The API returns only `ALLOW`, `REQUIRE_APPROVAL`, or `DENY` for valid evaluations.
- [FACT] FR-04: Every executable `ALLOW` includes exact `bound_action`, fingerprint, issue/expiry time, policy version, audit ID, and single-use directive.
- [FACT] FR-05: Policy/evaluator/transport failures never mint `ALLOW`.
- [FACT] FR-06: Exact duplicate requests are idempotent; request-ID payload conflicts are refused with HTTP `409` contract errors, not policy `DENY`.
- [FACT] FR-07: A valid approval grant is action-bound and causes a fresh evaluation rather than mutating the old decision.
- [FACT] FR-08: The executor refuses `REQUIRE_APPROVAL`, `DENY`, expired, consumed, malformed, or fingerprint-mismatched decisions.
- [FACT] FR-09: Audit records exclude secret values and raw credentials.
- [FACT] FR-10: Docs and website status labels reflect what is actually deployed.
- [FACT] FR-11: Policy decisions use HTTP `200`; caller/auth/schema/contract failures use `4xx`; system/dependency failures use `5xx/503` and never masquerade as policy `DENY`.
- [FACT] FR-12: The executor executes only after an atomic consume transition succeeds immediately before the irreversible action.
- [FACT] FR-13: The trusted approval grant is organization-, decision-, fingerprint-, policy-, approver-, and expiry-bound; approval causes a fresh evaluation and new `ALLOW`.
- [FACT] FR-14: Scoped API keys bind authenticated organization and principal type; cross-tenant assertions fail before policy evaluation.
- [FACT] FR-15: A transactional state store supports request idempotency, trusted grant use, decision status, and atomic consumption.
- [FACT] FR-16: First-sprint canonicalization is complete and tested only for `deploy_change`.
- [FACT] FR-17: Preview records follow minimum-data storage, structured allowlist logging, prohibited-secret inputs, and 30-day retention.

## 7. Policy templates

### Deployment template

- [FACT] Preview + scoped mandate + passing commit-bound tests + no protected-surface flags → `ALLOW`.
- [FACT] Production → `REQUIRE_APPROVAL`.
- [FACT] Failed/missing tests → `DENY`.
- [FACT] Secret-touching change → `DENY` in v0.1.
- [FACT] DNS/permission change → `REQUIRE_APPROVAL` when otherwise valid.

### Communications template

- [FACT] New external recipient → `REQUIRE_APPROVAL`.
- [FACT] Pricing/legal/security/financial/contractual claim → `REQUIRE_APPROVAL`.
- [FACT] Missing recipient, mandate, or content fingerprint → `DENY`.

## 8. Seven mandatory dogfood scenarios

| ID | Scenario | Expected decision | Enforcement expectation |
|---|---|---|---|
| DF-01 | [FACT] Preview deploy, passing tests | `ALLOW` | [FACT] Wrapper permits one simulated/preview execution. |
| DF-02 | [FACT] Production deploy | `REQUIRE_APPROVAL` | [FACT] Wrapper refuses until a valid bound grant is re-evaluated. |
| DF-03 | [FACT] Deployment touches a secret | `DENY` | [FACT] Wrapper refuses. |
| DF-04 | [FACT] Failed tests | `DENY` | [FACT] Wrapper refuses. |
| DF-05 | [FACT] Payload changes after decision | N/A | [FACT] Wrapper detects fingerprint mismatch and refuses. |
| DF-06 | [FACT] Expired decision | N/A | [FACT] Wrapper refuses. |
| DF-07 | [FACT] Exact duplicate request | Same artifact | [FACT] No second execution after first consumption. |

### Mandatory scenario execution steps and evidence

- [FACT] DF-01: collect commit-bound passing tests → request decision → receive `200 + ALLOW` → wrapper recomputes fingerprint → atomically consumes → executes preview/simulation → records decision, receipt, and result.
- [FACT] DF-02: request production action → receive `200 + REQUIRE_APPROVAL` → wrapper refuses → trusted Founder grant binds the unchanged action → fresh evaluation may mint a new `ALLOW`; no real production execution occurs without Gate 4.
- [FACT] DF-03: submit only `touches_secrets: true` or a non-sensitive category → receive `200 + DENY / SECRET_CHANGE_NOT_SUPPORTED_V0_1` → wrapper refuses and stores only redacted evidence.
- [FACT] DF-04: submit commit-bound failed-test evidence → receive `200 + DENY / TESTS_FAILED` → wrapper refuses and preserves the test reference.
- [FACT] DF-05: mutate any execution-related field after `ALLOW` → wrapper fingerprint mismatch → refuse before consume; preserve original and attempted fingerprints.
- [FACT] DF-06: present `ALLOW` after expiry → wrapper and consume boundary refuse; no successful receipt.
- [FACT] DF-07: exact duplicate returns the same artifact; same request ID with changed payload returns `409`; only one consume succeeds under replay/concurrency.

### Additional required error-path tests

- [FACT] EP-01: same request ID with different payload → `409` contract error; wrapper refuses; audit does not label it policy `DENY`.
- [FACT] EP-02: policy or required state dependency unavailable → `503` dependency error with no decision enum; wrapper refuses.
- [FACT] EP-03: malformed/duplicate-key/unknown-field input → appropriate `400`/`422` contract error; wrapper refuses.
- [FACT] EP-04: invalid credential, cross-tenant organization, or wrong principal scope → `401`/`403`; no resource disclosure; wrapper refuses.
- [FACT] EP-05: prohibited secret/full-diff/full-message/attachment content → rejected before policy evaluation; logs and errors contain no sensitive value.

## 9. Documentation requirements

- [FACT] Overview and current status.
- [FACT] Preview authentication/access.
- [FACT] `POST /v1/decisions`.
- [FACT] Request and response schemas.
- [FACT] Decision and approval semantics.
- [FACT] Reason codes.
- [FACT] Idempotency and replay.
- [FACT] Deployment example.
- [FACT] Payment/x402 adapter example.
- [FACT] Error model and current limitations.
- [FACT] Three curl examples: preview allow, production approval, failed-tests deny.

## 10. Website/contact requirements after Gate 1

- [FACT] Preserve TEST → DECIDE → MONITOR.
- [FACT] Update only claims affected by the frozen contract.
- [FACT] Add required contact question: “Which agent action do you want to control?”
- [FACT] Options: deployment/production, external messaging, social posting, payment/x402, CRM/Sheets/data, other.
- [FACT] Also collect agent/tool stack, action frequency, current approval method, feared failure, and required audit evidence.
- [FACT] Continue warning users not to submit secrets or credentials.

## 11. Non-functional requirements

- [FACT] NFR-01: Deterministic canonicalization and hashing must be covered by golden vectors.
- [FACT] NFR-02: No secrets in requests, logs, fixtures, or audit evidence.
- [FACT] NFR-03: Unknown enum values fail closed.
- [FACT] NFR-04: Preview docs must not invent a production host.
- [FACT] NFR-05: Chinese and English decision vocabulary and status labels remain semantically consistent.
- [FACT] NFR-06: RFC 8785/SHA-256 golden vectors cover every `deploy_change` execution field, ordering, array, omission/null, Unicode, and case rule.
- [FACT] NFR-07: Atomic consume has concurrency tests proving exactly one successful logical consumption.
- [FACT] NFR-08: Agent, executor, and approver credentials are distinct and tenant-scoped; v0.1 does not add full IAM/SSO/RBAC.
- [FACT] NFR-09: No full diffs, source drafts, full messages, attachments, secrets, secret names, environment files, tokens, credentials, or signing material are accepted or persisted.
- [ASSUMPTION] Preview performance targets are secondary to correctness; latency must still be recorded in acceptance evidence.

## 12. Acceptance criteria

- [FACT] AC-01: OpenAPI and machine-readable schemas agree with the PM contract.
- [FACT] AC-02: All seven DF-01 through DF-07 mandatory scenarios and EP-01 through EP-05 error paths pass automatically.
- [FACT] AC-03: There is no path that executes without a valid, unused, unexpired `ALLOW` bound to the exact payload.
- [FACT] AC-04: Approval grants cannot be replayed for another payload, policy version, role, or validity window.
- [FACT] AC-05: Contract tests cover malformed input, unknown action, missing evidence, policy failure, and request-ID conflict.
- [FACT] AC-06: Three curl examples reproduce their documented outcomes against the preview endpoint.
- [FACT] AC-07: Docs distinguish live, preview, planned, and not deployed.
- [FACT] AC-08: Website claims match the verified release candidate.
- [FACT] AC-09: Evidence report links test output to contract version and implementation commit.
- [FACT] AC-10: No real production deployment occurs without explicit Founder approval.
- [FACT] AC-11: `REQUIRE_APPROVAL` remains immutable; a server-verified grant plus fresh evaluation produces a new `ALLOW` and cannot be reused for another action.
- [FACT] AC-12: `200`, `4xx`, and `5xx/503` semantics are tested independently, and system failures never appear as policy `DENY`.
- [FACT] AC-13: Two concurrent consume attempts produce one logical success and one conflict/idempotent retry result as defined by attempt ID.
- [FACT] AC-14: Cross-tenant organization, agent, mandate, approval, decision, and consume access attempts fail without resource disclosure.
- [FACT] AC-15: Every execution-related `deploy_change` mutation changes the fingerprint and invalidates the original decision.
- [FACT] AC-16: Commerce adapter artifacts are docs/schema/tests only and are labeled non-live; no full payment/x402 enforcement is shipped.
- [FACT] AC-17: Retention/redaction tests prove prohibited content does not enter logs or stored audit records.

## 13. Success metrics for the pilot

- [FACT] Primary technical metric: 100% pass rate for mandatory enforcement scenarios.
- [FACT] Primary product metric: at least one internal deploy proposal is blocked or allowed for the documented reason and verified by the wrapper.
- [INFERENCE] Pilot discovery should measure integration time, number of policy exceptions, and usefulness of audit evidence before setting SaaS pricing.

## 14. Risks and failure conditions

- [FACT] Fail if endpoint/docs/site use different decision enums or schemas.
- [FACT] Fail if the executor trusts the decision enum without verifying the fingerprint and expiry.
- [FACT] Fail if policy/evaluator outages allow execution.
- [FACT] Fail if approval is detached from the exact action.
- [FACT] Fail if request-ID reuse can execute twice.
- [FACT] Fail if website copy implies production API or universal enforcement before proof.
- [FACT] Fail if Developer expands scope into dashboard, workflow, identity, secrets, or broad integrations.
- [INFERENCE] A technically correct PDP without a credible PEP integration remains commercially weak; dogfood evidence is therefore a release requirement.

## 15. Founder decisions incorporated

- [FACT] Immutable approval lifecycle, trusted Founder-only internal dogfood approver, and fresh-evaluation/new-`ALLOW` semantics are incorporated.
- [FACT] Strict `200` policy, `4xx` caller/contract, and `5xx/503` system-failure separation is incorporated.
- [FACT] Preview-protected atomic consume and transactional state are incorporated without presenting a general production API.
- [FACT] Scoped API-key tenancy and separate principals are incorporated without expanding into IAM/SSO/RBAC.
- [FACT] RFC 8785/SHA-256 canonicalization is limited to `deploy_change` in the first sprint.
- [FACT] Minimum-data storage, prohibited inputs, structured logging, and 30-day preview retention are incorporated.
- [FACT] Secret-touching deploy hard `DENY`, 15-minute validity, single-use/permanent consume, and non-production dogfood limits are incorporated.
- [FACT] Commerce compatibility is a documented non-live stub for the first sprint.
- [FACT] Final `PM_CONTRACT_GATE=PASS` still requires Founder approval of the revised packet; Developer remains blocked.

# SignGate Task Packages v0.1

Date: 2026-07-18
Owner: Nomos Labs — PM
Status: REVISED AFTER FOUNDER PRE-APPROVAL / BLOCKED UNTIL FINAL `PM_CONTRACT_GATE=PASS`

## 1. Gate sequence

- [FACT] Gate 1 — PM Freeze: Founder approves boundary, use case, vocabulary, endpoint/versioning, schema, enforcement semantics, and acceptance criteria.
- [FACT] Gate 2 — Builder: reference evaluator, schemas, preview endpoint, wrapper, tests, and minimum docs pass.
- [FACT] Gate 3 — QA/Reviewer: mandatory scenarios, fail-closed review, claims verification, and resolved/accepted findings pass.
- [FACT] Gate 4 — Founder: decides any temporary/public deployment, canonical domain, announcement, outreach, pricing, or production action.
- [FACT] Current status is `PM_CONTRACT_GATE=REVISE`; none of the implementation packages is authorized yet.
- [FACT] Founder pre-approved the section-12 contract decisions with scope limits, but Developer remains blocked until the revised artifacts receive final approval.

## 2. Developer package — `DEV-SG-001`

### Objective

- [FACT] Implement the frozen general decision contract and one non-production deployment-control proof without changing product semantics.

### Inputs

- [FACT] `SIGNGATE_PRODUCT_BOUNDARY_V0.1.md`.
- [FACT] `SIGNGATE_DECISION_CONTRACT_V0.1.md`.
- [FACT] `SIGNGATE_MVP_PRD_V0.1.md`.
- [FACT] `SIGNGATE_LIVE_PREVIEW_CLAIMS_MATRIX.md`.
- [FACT] Founder approval record for Gate 1.

### Deliverables

- [FACT] `openapi/signgate-decision-v0.1.yaml`.
- [FACT] Machine-readable `deploy_change` request, response, error, approval-grant, consume-request, and consume-receipt schemas.
- [FACT] RFC 8785/SHA-256 `deploy_change` canonicalizer/fingerprint implementation with golden vectors; no other action canonicalizer is implemented in this sprint.
- [FACT] Deterministic reference evaluator and reason-code registry.
- [FACT] Preview `POST /v1/decisions` endpoint.
- [FACT] Commerce-preflight documented non-live stub: preserve route/discovery surfaces, publish mapping and canonical/legacy-alias contract, add schema/contract tests, and label `PREVIEW / PLANNED / NOT DEPLOYED`; do not build full payment/x402 enforcement.
- [FACT] One `deploy_change` policy template only; communications policy may be documented as planned but is not implemented.
- [FACT] Reference deployment enforcement wrapper plus internal/preview-protected `POST /v1/decisions/{decision_id}/consume` and transactional single-use state.
- [FACT] Scoped preview API-key authentication with organization binding and separate agent, executor, and approver principals.
- [FACT] Trusted Founder-only internal approval-grant path without a general approval dashboard.
- [FACT] Minimum-data audit persistence, structured allowlist logging, and 30-day preview retention.
- [FACT] Automated contract and policy tests.
- [FACT] Static/in-repo docs plus three curl examples.
- [FACT] Evidence/acceptance report keyed to implementation commit.

### Constraints

- [FACT] Do not add `REVIEW` as an API value.
- [FACT] Do not redesign fields, reason-code meanings, or adapter policy without PM change control.
- [FACT] Do not build dashboard, inbox, workflow engine, identity suite, or secret storage.
- [FACT] Do not deploy production.
- [FACT] Do not use real credentials or customer secrets in fixtures, logs, or examples.
- [FACT] Do not build full IAM, SSO, RBAC, enterprise identity, approval dashboard, or customer workflow product.
- [FACT] Do not implement `send_external_message`, `payment`, or `x402_purchase` vertical slices in the first sprint.
- [FACT] Do not build Gmail, social publishing, CRM, or any external messaging/data integration.
- [FACT] Do not position the consume operation as a generally available production API.

### Developer done criteria

- [FACT] All PRD acceptance criteria that are implementation-owned pass.
- [FACT] The wrapper blocks changed, expired, non-ALLOW, reused, malformed, and policy-error cases.
- [FACT] Atomic concurrency tests prove exactly one successful logical consume and permanent consumption after execution begins.
- [FACT] Transport/system tests prove `4xx`/`5xx/503` never masquerade as policy `DENY`.
- [FACT] Tenancy tests prove cross-organization resources and identities cannot be asserted or discovered.
- [FACT] Curl examples reproduce documented responses.
- [FACT] Implementation evidence is ready for QA and Reviewer; Developer does not self-declare release candidate.

## 3. QA package — `QA-SG-001`

### Objective

- [FACT] Independently verify contract conformance, mandatory scenarios, regression safety, bilingual claims, and fail-closed behavior.

### Required tests

- [FACT] Validate OpenAPI against machine-readable schemas and sample payloads.
- [FACT] Run DF-01 through DF-09.
- [FACT] Test unknown fields, unknown enums, missing identity/mandate/evidence, malformed JSON, policy outage, and evaluator exception.
- [FACT] Test exact duplicate idempotency and conflicting request-ID reuse.
- [FACT] Test fingerprint changes for every action field, array ordering rule, normalized values, and commit/route changes.
- [FACT] Test decision expiry boundaries and consumed-decision replay.
- [FACT] Test approval grant role, expiry, decision ID, policy version, and fingerprint mismatch.
- [FACT] Test that the original `REQUIRE_APPROVAL` remains immutable and a trusted grant plus fresh evaluation mints a new `ALLOW`.
- [FACT] Test API-key organization binding and logical separation of agent, executor, and approver credentials.
- [FACT] Test two concurrent consume attempts, same-attempt idempotent retry, different-attempt replay, and post-consume execution failure.
- [FACT] Test strict separation of `200` policy outcomes, `4xx` caller/auth/schema failures, and `5xx/503` system/dependency failures.
- [FACT] Test RFC 8785/SHA-256 golden vectors for every `deploy_change` execution field; do not require implemented canonicalizers for planned action types.
- [FACT] Test commerce route/mapping/schema/derived aliases as a non-live stub without expecting payment/x402 enforcement.
- [FACT] Test that audit/log output contains no supplied secret-like fixture values.
- [FACT] Test 30-day preview retention configuration and rejection of full diffs, full messages, attachments, secret names/values, environment files, tokens, credentials, and signing material.
- [FACT] Verify three curl examples against the same preview build.
- [FACT] Verify Chinese/English decision vocabulary, endpoint status, and live/preview/planned labels.

### QA output

- [FACT] A signed-off acceptance report with pass/fail per criterion, build/commit identifier, endpoint tested, timestamps, and retained evidence.
- [FACT] QA reports defects; QA does not silently change the contract.

## 4. Reviewer package — `REV-SG-001`

### Objective

- [FACT] Red-team the frozen contract and implementation for bypasses, fail-open paths, replay, tampering, audit gaps, and misleading claims.

### Review questions

- [FACT] Can any executor path proceed without a valid `ALLOW`?
- [FACT] Can an agent change a field not covered by the fingerprint?
- [FACT] Can a request ID, decision, or approval grant be replayed?
- [FACT] Can stale policy or clock-boundary behavior authorize execution?
- [FACT] Can customer-provided risk data be mistaken for trusted policy output?
- [FACT] Can malformed/unknown input produce an incomplete but executable artifact?
- [FACT] Can adapter behavior weaken the canonical contract?
- [FACT] Can a forged payload approval, cross-tenant key, or agent credential obtain approver/executor authority?
- [FACT] Can two concurrent consume calls both succeed, or can a failed external action reuse the consumed decision?
- [FACT] Can a system/dependency failure be mislabeled as policy `DENY`?
- [FACT] Does any planned action type accidentally expand implementation beyond `deploy_change`?
- [FACT] Do audit records prove enforcement without leaking secrets?
- [FACT] Do website/docs claims exceed the tested deployment state?
- [FACT] Has implementation scope absorbed Agent Assurance, x402scan, identity, approval, or execution responsibilities?

### Reviewer output

- [FACT] Findings ranked P0–P3, each with evidence, exploit/failure path, affected acceptance criterion, and required disposition.
- [FACT] Reviewer reports findings and does not silently fix the primary writer's work.
- [FACT] P0/P1 findings must be resolved or explicitly accepted by Founder before release-candidate pass.

## 5. PM release package — `PM-SG-002`

- [FACT] Reconcile QA and Reviewer findings against the frozen contract.
- [FACT] Update the claims matrix using the actual release candidate URL and evidence.
- [FACT] Verify docs/site/endpoint use the same enum, schema, status, and limitations.
- [FACT] Prepare Gate 3 recommendation; do not make Gate 4 decisions for Founder.

## 6. Acceptance matrix

| Requirement | Developer | QA | Reviewer | Gate owner |
|---|---|---|---|---|
| [FACT] Contract/schema implementation | R | V | C | PM |
| [FACT] Deterministic evaluator | R | V | C | PM |
| [FACT] Enforcement wrapper | R | V | Red-team | PM |
| [FACT] Idempotency/replay | R | V | Red-team | PM |
| [FACT] Docs/curl | R | V | C | PM |
| [FACT] Claims matrix | C | V | Red-team | PM |
| [FACT] Non-production preview deployment | R after approval | V | C | Founder |
| [FACT] Production/public launch | — | — | — | Founder only |

`R = responsible`, `V = verify`, `C = consulted`.

## 7. Exact next command for OpenClaw

```text
Maintain the Primary Task "Nomos Labs — SignGate PM Contract Gate v0.1". Store and lock the five revised artifacts, SIGNGATE_PM_CONTRACT_REVIEW_PACKET_V0.1.md, and SIGNGATE_PM_CONTRACT_REVISION_CHANGELOG_V0.1.md as the source-of-truth review packet. Keep PM_CONTRACT_GATE=REVISE and DEVELOPER_STATUS=BLOCKED. Request Founder final approval of the revised artifacts. Do not dispatch DEV-SG-001, QA-SG-001, or REV-SG-001 and do not modify product code until an explicit Founder message changes PM_CONTRACT_GATE=PASS. After final approval, dispatch DEV-SG-001 to one Developer worktree with deploy_change as the only implemented action vertical slice; then dispatch QA-SG-001 and REV-SG-001 independently against the same frozen contract and implementation commit.
```

## 8. Founder pre-approval incorporated; final review required

- [FACT] All twelve Founder section-12 decisions and scope limits are incorporated into the revised task packages.
- [FACT] Remaining implementation choices—transactional technology, trusted human-auth mechanism, key rotation procedure, trusted clock/skew, and concrete deploy libraries—may be proposed by Developer only after Gate 1 and must not change contract semantics.
- [FACT] Founder must review the revised artifacts and revision changelog before explicitly setting `PM_CONTRACT_GATE=PASS`.
- [FACT] Until that explicit message, Developer remains blocked.

# SignGate Product Boundary v0.1

Date: 2026-07-18
Owner: Nomos Labs — PM
Status: REVISED AFTER FOUNDER PRE-APPROVAL — FINAL GATE APPROVAL PENDING

## 1. Current-state summary

- [FACT] Nomos Labs is the company and platform; its public architecture is TEST → Agent Assurance, DECIDE → SignGate, MONITOR → x402scan.
- [FACT] The temporary Chinese demo was reachable on 2026-07-18 at `https://jelsoft-francis-joined-permit.trycloudflare.com/zh`.
- [FACT] The live site labels SignGate and x402scan `PREVIEW / IN DEVELOPMENT` and presents Agent Assurance as a service/pilot.
- [FACT] The live SignGate page exposes `ALLOW`, `REQUIRE_APPROVAL`, and `DENY`, and references `/v1/agentic-commerce/preflight` plus its sample route.
- [FACT] The live docs page says GitBook and the production API base URL are not configured.
- [FACT] The live contact form currently collects only name, email, company/organization, and message.
- [FACT] The supplied branded-preview archive contains a deterministic browser demo, but not a verifiable deployed SignGate decision API.

## 2. Contradictions found and resolutions

| Conflict | Evidence | PM resolution |
|---|---|---|
| Decision vocabulary | [FACT] Existing public copy uses `REQUIRE_APPROVAL`; an earlier handoff proposed `REVIEW`. | [FACT] External enum is frozen as `ALLOW`, `REQUIRE_APPROVAL`, `DENY`. `REVIEW` is not an API value. |
| Endpoint name | [FACT] Current public copy references commerce preflight routes; the new general contract needs a generic route. | [FACT] Canonical endpoint is `POST /v1/decisions`. Commerce preflight becomes a compatibility adapter and is not silently removed. |
| Product scope | [FACT] Existing messaging is commerce-heavy while the next proof use case is deployment control. | [FACT] SignGate is a general policy decision point for high-impact actions; payment/x402 remains a supported adapter, not the company category. |
| Risk provenance | [FACT] A requesting agent can supply risk context but cannot authoritatively rate itself safe. | [FACT] All supplied risk signals carry `source` and `observed_at`; customer-provided values are evidence, never trusted policy conclusions. |
| Decision vs enforcement | [FACT] A decision response alone cannot stop an executor. | [FACT] v0.1 includes an action-bound, expiring directive, while the dogfood wrapper acts as the reference policy enforcement point. |
| Fail-closed malformed requests | [FACT] An unparseable or unfingerprintable action cannot produce a safely bound authorization artifact. | [FACT] Such requests return a denial/error envelope with `enforcement_effect: DENY`; only a valid, bound artifact may authorize execution. |

## 3. Product decision

- [FACT] Positioning: **SignGate — Agent Policy & Execution Control**.
- [FACT] v0.1 product role: a Policy Decision Point that returns action-bound execution directives and audit evidence, plus the minimum stateful consume control surface required to make an `ALLOW` single-use.
- [FACT] First buyer: AI-native development teams, coding/deployment-agent teams, and agencies building autonomous workflows.
- [FACT] First proof use case: `deploy_change`.
- [FACT] Secondary use case: `send_external_message`.
- [FACT] Preserved compatibility use cases: `payment` and `x402_purchase`.
- [INFERENCE] Deployment control is the best first proof because it demonstrates enforceable policy without narrowing Nomos Labs to crypto or payments.
- [ASSUMPTION] The first commercial motion is a managed pilot/setup fee with a lightweight API, policy template, integration guide, and audit package.

## 4. SignGate v0.1 owns

- [FACT] Validate a structured action request against the frozen schema.
- [FACT] Evaluate deterministic, versioned policy.
- [FACT] Consume supplied evidence and preserve its provenance.
- [FACT] Return exactly one canonical decision value.
- [FACT] Return stable reason codes and required checks.
- [FACT] Declare approval requirements without operating a general approval inbox.
- [FACT] Bind the decision to the exact canonical action payload.
- [FACT] Return an expiring execution directive and replay constraints.
- [FACT] Create a decision/audit record suitable for an evidence package.
- [FACT] Maintain the minimum transactional state for request idempotency, trusted approval grants, decision expiry/status, and atomic decision consumption.
- [FACT] Expose `POST /v1/decisions/{decision_id}/consume` only as an internal or preview-protected enforcement surface in v0.1.

## 5. SignGate v0.1 does not own

- [FACT] Executing deployments, payments, messages, or any other external action.
- [FACT] Running a general autonomous verification agent.
- [FACT] Building a dashboard, approval inbox, identity suite, visual policy builder, or workflow engine.
- [FACT] Custodying keys, signing transactions, storing customer secrets, or acting as a wallet/payment gateway.
- [FACT] Acting as an email sender, deploy system, CRM, social client, or data store for arbitrary customer content.
- [FACT] Replacing Agent Assurance or x402scan.
- [FACT] Public usage-based SaaS pricing in this sprint.
- [FACT] A full IAM, SSO, RBAC, or enterprise identity product; v0.1 uses narrowly scoped preview credentials only.
- [FACT] A general approval dashboard or customer-facing approval workflow; internal dogfood uses one trusted Founder approver.
- [FACT] A generally available production consume API; the consume surface remains internal or preview-protected.

## 6. Relationship to other Nomos products

- [FACT] Agent Assurance produces pre-deployment test/check evidence and failure-mode knowledge.
- [FACT] SignGate consumes evidence and decides whether a proposed action may proceed.
- [FACT] x402scan provides ongoing service/transaction monitoring evidence.
- [FACT] The execution system remains responsible for enforcing the directive and recording the result.

## 7. Assumptions

- [ASSUMPTION] No real production deployment is required for the first dogfood proof.
- [ASSUMPTION] A preview deployment may be simulated or performed in a non-production Nomos environment.
- [FACT] Founder is the only production-deploy approver for internal v0.1 dogfood; this is not a permanent customer-product restriction.
- [ASSUMPTION] The v0.1 reference evaluator is deterministic and does not depend on an LLM at decision time.
- [ASSUMPTION] Customer secrets and raw credentials never enter the SignGate request body.

## 8. Non-goals for the seven-day sprint

- [FACT] No dashboard.
- [FACT] No broad integration catalog.
- [FACT] No public pricing page.
- [FACT] No production-domain migration.
- [FACT] No generalized identity, approval, workflow, or secrets system.
- [FACT] No claim that universal execution enforcement is live.
- [FACT] No rewrite of the whole company website around SignGate.
- [FACT] No complete `send_external_message`, `payment`, or `x402_purchase` implementation in the first sprint; these remain planned contracts while `deploy_change` is the only full vertical slice.

## 9. Founder approval gate

- [FACT] Approval is required for this product boundary, buyer, first use case, decision vocabulary, endpoint/versioning policy, and enforcement semantics.
- [FACT] After Founder pre-approval with conditions, current status is `PM_CONTRACT_GATE=REVISE` until final approval of the revised artifacts.
- [FACT] Developer implementation must not begin while the gate is pending.

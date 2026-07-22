# DEV-CANDIDATE-IMPLEMENTATION-DESIGN

TASK_TYPE=DEVELOPER_DESIGN_HANDOFF

AUTHORIZATION_STATUS=DESIGN_ONLY_NO_IMPLEMENTATION_NO_DEPLOYMENT

## Candidate routes

- Risk Source API: `POST /v1/risk-source/address-risk`.
- Approval & Signer Control: `POST /v1/approval-signer/evaluate`.

PM_DECISION=APPROVE_AS_PROPOSED_CANDIDATE

## Objective

Turn the approved documentation candidates into implementation-ready technical designs without adding routes, changing runtime/OpenAPI, deploying code, or representing either endpoint as current.

## Risk Source design requirements

- Map candidate fields to verified BCS address-risk, classify, wallet-overview, and trace evidence; mark unmappable fields as unavailable.
- Define orchestration ownership, upstream failure/timeout behavior, cache and evidence freshness, request-to-data timestamps, and latency boundary.
- Propose versioned semantics for risk score thresholds, risk level, source reliability, local risk signal, matched rules, behavioral taxonomy, multi-hop boundaries, and evidence retention/retrieval.
- Specify chain/address validation, provider credential isolation, billing model, rate limits, idempotency, and privacy/retention controls.
- Compare every candidate field with actual current provider/wrapper output; never synthesize missing evidence as low risk.

## Approval & Signer design requirements

- Define verification of upstream decision integrity, expiry, tenant, action binding, mandate, approval reference, signer class, amount, destination, asset, chain, and nonce.
- Reuse existing signer-directive meanings only where semantically exact; do not silently equate directives with decision enums.
- Ensure the route evaluates and returns a directive only. It must not sign, expose keys, mint approvals, submit transactions, or claim enforcement.
- Specify stale decision, missing approval, mismatched action, unsupported signer, replay, and evidence-unavailable behavior.
- Define auth, tenant isolation, billing, rate limits, audit/retention, and idempotency proposals.

## Required design artifacts

- Component and trust-boundary diagram.
- Sequence diagrams for success, approval required, denial, stale evidence/decision, and upstream failure.
- Field-by-field source/provenance matrix.
- Threat model covering credential leakage, confused deputy, replay, SSRF/upstream abuse, tenant crossover, and signer misuse.
- Proposed versioned OpenAPI diff kept outside production OpenAPI.
- Test plan and migration/versioning strategy.
- Cost, latency, and availability assumptions clearly labelled as estimates or TBD.

## Acceptance criteria

- Both routes remain labelled `PROPOSED_CANDIDATE` and not deployed.
- No Test it, sandbox, production availability, auth, billing, or SLA claim is introduced.
- Design resolves or explicitly assigns every open contract question.
- Security and product owners approve the design before any implementation task is authorized.

## Return to PM

Provide the design artifacts, unresolved decisions, proposed owners, estimated implementation/testing work, and a statement confirming runtime, production OpenAPI, and deployment were unchanged.

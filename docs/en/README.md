# SignGate API Documentation

Status: preview. Production deployment is not authorized.

SignGate v0.1 is a policy decision point for the `deploy_change` action. It evaluates a structured action request and returns one of three decision values:

- `ALLOW`: the exact bound action may proceed only after atomic consume succeeds.
- `REQUIRE_APPROVAL`: execution is not authorized. A trusted Founder approval grant must be obtained and submitted in a fresh decision request.
- `DENY`: execution is not authorized.

Every non-valid-`ALLOW` outcome fails closed. A decision response alone is not enough to execute. ALLOW is not executable until atomic consume succeeds. `ALLOW` is action-bound, time-limited to at most 15 minutes, single-use, and non-executable until `POST /v1/decisions/{decision_id}/consume` succeeds.

## Public Preview Endpoints

### `POST /v1/decisions`

Creates a policy decision for a `deploy_change` request.

Use this endpoint when an authenticated agent wants SignGate to evaluate a pending preview deployment. The request must include:

- `contract_version: "0.1"`
- an organization-scoped `request_id`
- `organization_id` matching the authenticated API credential
- authenticated agent identity claims
- a complete `deploy_change` action target and parameters
- a valid mandate such as `deploy:preview`
- commit-bound passing test evidence

The service performs strict JSON intake, duplicate-key rejection, schema validation, RFC 8785 canonicalization, SHA-256 fingerprinting, policy evaluation, persistence, and audit before returning HTTP 200 with a policy decision.

HTTP 200 does not mean execution is authorized. Execution is authorized only when the response decision is `ALLOW`, the wrapper verifies the exact bound action and fingerprint, and atomic consume succeeds.

### `POST /v1/decisions/{decision_id}/consume`

Consumes a valid `ALLOW` decision immediately before the executor begins the irreversible action.

The consume request must match:

- organization
- decision ID
- action fingerprint
- policy version
- execution attempt ID

The decision must still be `ALLOW`, `AVAILABLE`, unexpired, and unused. Same-attempt retries return the original receipt. Different attempts after consumption fail with conflict semantics.

## Internal Endpoint Boundary

`POST /internal/dogfood/founder-approval-grants` is internal only. It must not appear in the public OpenAPI specification or public documentation examples. The internal specification may document it for the Founder dogfood workflow.

## Policy Summary

- Valid preview deployment, valid `deploy:preview` mandate, passing tests, no protected-surface flags: `ALLOW`.
- `touches_permissions=true`: `REQUIRE_APPROVAL` when otherwise valid.
- `touches_dns=true`: `REQUIRE_APPROVAL` when otherwise valid.
- `touches_credentials=true` without raw secrets: `REQUIRE_APPROVAL` when otherwise valid.
- `touches_secrets=true`: `DENY`.
- Secret-like or raw credential material: rejected or denied, with no secret retention.
- Failed tests: `DENY`.
- Missing mandatory test evidence: `DENY`.
- Invalid or expired mandate: `DENY`.
- Unknown target or environment: `DENY`.
- Production intent before Founder Gate 4: no executable `ALLOW`.

Founder policy approval is not Founder Gate 4. Production deployment remains not authorized in DOC-SG-001.

## Authentication

SignGate preview uses bearer API keys bound to an organization, principal identity, principal type, scope, status, digest version, and credential prefix. Raw secrets are not stored in D1 and must not be logged.

The request `organization_id` is mandatory and must match the authenticated credential organization. Cross-tenant failures are non-enumerating.

Required scopes:

- Decision creation: `decision:create`
- Atomic consume: `decision:consume`
- Founder dogfood grant: `approval:founder:deploy_change` with Founder approver identity

## Fingerprinting

SignGate computes SHA-256 over an RFC 8785 canonical fingerprint envelope containing:

- contract version
- authenticated organization
- authenticated/resolved agent identity
- complete normalized deploy_change action

`changed_paths` and `changed_routes` use set semantics: validate each string, remove exact duplicates, sort deterministically, preserve case-distinct values, and fingerprint only the normalized copy.

Unknown execution-relevant fields are rejected before fingerprinting.

## Error Model

Only HTTP 200 responses contain a policy decision enum. Errors do not contain `decision`.

- `400`: malformed JSON or invalid UTF-8
- `401`: authentication failure
- `403`: authorization failure, wrong scope, or tenant mismatch
- `409`: request-ID, grant-reuse, or consume conflict
- `422`: schema or contract validation failure
- `500`: invariant or persistence failure
- `503`: policy or dependency unavailable

`500` and `503` responses never mint an `ALLOW` artifact and must not be audited as policy `DENY`.

## Commerce/x402 Status

Commerce/x402 enforcement is not live in DOC-SG-001. Existing commerce preflight surfaces remain a documented non-live compatibility stub. Payment enforcement, x402 purchase execution, signer integration, and a separate commerce policy engine are out of scope.

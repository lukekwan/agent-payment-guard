# SignGate General Decision Contract v0.1

Contract identifier: `SIGNGATE_GENERAL_DECISION_CONTRACT_V0.1`
Date: 2026-07-18
Owner: Nomos Labs — PM
Status: REVISED AFTER FOUNDER PRE-APPROVAL / NOT YET IMPLEMENTED / FINAL GATE APPROVAL PENDING

## 1. Canonical surface and versioning

- [FACT] Canonical endpoint: `POST /v1/decisions`.
- [FACT] URI major version is `v1`; the request and response include `contract_version: "0.1"` during preview.
- [FACT] Additive optional fields may ship within v1; removing fields, changing enum meanings, or changing fail-closed behavior requires a new major endpoint.
- [FACT] Preview responses must carry `api_status: "preview"` until Founder authorizes production status.
- [FACT] Authentication is implementation-gated and must be documented before any externally reachable preview endpoint is opened.

## 2. Compatibility and migration policy

- [FACT] `/v1/agentic-commerce/preflight` is not deleted or silently replaced.
- [FACT] Current status of the commerce path is `DOCUMENTED PREVIEW / NO VERIFIED PRODUCTION API`.
- [FACT] In the first implementation sprint, the commerce route remains a documented non-live stub; the full payment/x402 enforcement adapter is not built.
- [FACT] The first sprint must preserve existing route/discovery surfaces, document the mapping to `POST /v1/decisions`, define canonical responses and derived legacy aliases, add schema/contract tests, and label the adapter `PREVIEW / PLANNED / NOT DEPLOYED` as applicable.
- [FACT] A later full adapter maps payment requests to action type `payment` or `x402_purchase` only after the `deploy_change` vertical slice passes QA and independent review.
- [FACT] The adapter must use the same evaluator, reason-code registry, audit path, and decision enum as the canonical endpoint.
- [FACT] `signer_directive` may be returned only as a documented adapter alias of canonical `execution_directive`; it is not a second source of truth.
- [FACT] No deprecation clock starts during v0.1 preview.
- [FACT] No public deprecation clock or 90-day commitment may be published until production usage and migration requirements exist.

## 3. Canonical decision values

- [FACT] `ALLOW`: the exact bound action may execute only while the directive is valid and unused.
- [FACT] `REQUIRE_APPROVAL`: the action must not execute; a verified approval grant must be supplied in a new evaluation request.
- [FACT] `DENY`: the action must not execute.
- [FACT] `REVIEW` is not an API value.
- [FACT] Absence of a valid `ALLOW` artifact is equivalent to denial at the enforcement point.

## 4. Request schema

```json
{
  "contract_version": "0.1",
  "request_id": "req_01J...",
  "organization_id": "org_nomos",
  "agent": {
    "id": "codex_dev_01",
    "type": "coding_agent",
    "authenticated_by": "internal_service_identity"
  },
  "action": {
    "type": "deploy_change",
    "target": {
      "environment": "preview",
      "service": "signgate-worker"
    },
    "parameters": {
      "git_commit": "abc123",
      "changed_routes": ["/v1/decisions"],
      "touches_secrets": false,
      "touches_dns": false,
      "touches_permissions": false
    }
  },
  "intent": "Deploy approved SignGate preview changes",
  "mandate": {
    "id": "mandate_01",
    "scope": ["deploy:preview"],
    "issued_by": "founder",
    "expires_at": "2026-07-19T12:00:00Z"
  },
  "evidence": [
    {
      "id": "ev_ci_01",
      "type": "test_result",
      "source": "ci",
      "status": "passed",
      "observed_at": "2026-07-18T11:58:00Z",
      "subject_fingerprint": "sha256:..."
    }
  ],
  "context": {
    "requested_at": "2026-07-18T12:00:00Z"
  }
}
```

### Required request semantics

- [FACT] `request_id` is unique within an organization and is the idempotency key.
- [FACT] `organization_id`, `agent.id`, `agent.type`, and `mandate` are mandatory.
- [FACT] `action.type`, `action.target`, and the complete action-specific `parameters` object are mandatory.
- [FACT] `intent` is descriptive only and never overrides policy.
- [FACT] `mandate.scope` and `mandate.expires_at` are evaluated; a free-text mandate is insufficient.
- [FACT] Each evidence item preserves `source` and `observed_at`.
- [FACT] Customer-provided risk input uses evidence such as `{ "type": "risk_signal", "source": "customer_provided", ... }`; it is never authoritative by itself.
- [FACT] Requests must not contain secret values, private keys, tokens, passwords, or raw credentials.
- [FACT] Unknown top-level or action fields are rejected in preview to prevent silently unfingerprinted parameters.
- [FACT] `organization_id`, `agent.id`, mandate fields, approver fields, and evidence are caller claims unless resolved or constrained by an authenticated server-side trust source.
- [FACT] A request `organization_id` must exactly match the organization bound to the API credential; mismatch is a `403` contract/auth failure, not a policy decision.

## 5. Response schema

```json
{
  "contract_version": "0.1",
  "api_status": "preview",
  "decision": "REQUIRE_APPROVAL",
  "decision_id": "dec_01J...",
  "request_id": "req_01J...",
  "organization_id": "org_nomos",
  "action_fingerprint": "sha256:...",
  "bound_action": {
    "type": "deploy_change",
    "target": {
      "environment": "production",
      "service": "signgate-worker"
    },
    "parameters": {
      "git_commit": "abc123",
      "changed_routes": ["/v1/decisions"],
      "touches_secrets": false,
      "touches_dns": false,
      "touches_permissions": false
    }
  },
  "policy_version": "deploy_policy_2026_07_18_01",
  "issued_at": "2026-07-18T12:00:00Z",
  "expires_at": "2026-07-18T12:15:00Z",
  "reason_codes": ["PRODUCTION_DEPLOY_REQUIRES_APPROVAL"],
  "required_checks": [],
  "approval": {
    "required": true,
    "role": "founder",
    "grant_binding_required": true
  },
  "execution_directive": {
    "action": "DO_NOT_EXECUTE",
    "max_uses": 0,
    "replay_protection": "EXECUTOR_ENFORCED"
  },
  "audit_id": "audit_01J..."
}
```

### Required response semantics

- [FACT] `bound_action` contains the exact normalized action whose fingerprint was evaluated.
- [FACT] `action_fingerprint` is SHA-256 over the RFC 8785 canonical fingerprint envelope defined in section 15, which contains the authenticated tenant/principal context plus the complete normalized `bound_action`.
- [FACT] `ALLOW` returns `execution_directive.action: EXECUTE` and `max_uses: 1`.
- [FACT] `REQUIRE_APPROVAL` and `DENY` return `execution_directive.action: DO_NOT_EXECUTE` and `max_uses: 0`.
- [FACT] The executor compares its pending action with `bound_action`, recomputes the fingerprint, checks policy version and expiry, and refuses on any mismatch.
- [FACT] The executor records successful consumption of an `ALLOW` decision and refuses reuse.
- [FACT] The response never contains an instruction to execute when approval is still required.
- [FACT] A valid `ALLOW` remains non-executable until the preview-protected consume operation succeeds.
- [FACT] `ALLOW` validity is at most 15 minutes from `issued_at`; policy may issue a shorter window.

## 6. Approval grant semantics

- [FACT] SignGate v0.1 does not provide a general approval inbox.
- [FACT] A trusted approval authority may produce an opaque or signed `approval_grant`; arbitrary approval JSON supplied by the requesting agent is never trusted.
- [FACT] The grant binds `organization_id`, verified approver identity, approver role, approval time, expiry, original decision ID, policy version, and exact action fingerprint.
- [FACT] A grant for a different fingerprint, expired grant, wrong role, or different policy version is invalid.
- [FACT] A valid grant reference is submitted with a new `request_id` and re-evaluated; the original `REQUIRE_APPROVAL` response is immutable and never becomes executable in place.
- [FACT] Successful re-evaluation mints a new `ALLOW` with a new `decision_id`.
- [FACT] The grant is atomically bound/used when it mints that logical `ALLOW`; exact retry returns the same result, while mismatched reuse returns `409 APPROVAL_GRANT_REUSE_MISMATCH`.
- [FACT] Internal v0.1 dogfood uses Founder as the only production-deploy approver, authenticated with a credential distinct from agent and executor credentials.
- [FACT] The Founder-only rule is internal dogfood scope, not a permanent customer-product restriction.

Example decoded claims from a server-verified grant; callers submit an opaque/signed grant reference rather than trusting this JSON directly:

```json
{
  "id": "ev_approval_01",
  "type": "approval_grant",
  "organization_id": "org_nomos",
  "source": "nomos_internal_approval",
  "status": "approved",
  "approver": { "id": "founder_01", "role": "founder" },
  "original_decision_id": "dec_01J...",
  "action_fingerprint": "sha256:...",
  "policy_version": "deploy_policy_2026_07_18_01",
  "observed_at": "2026-07-18T12:03:00Z",
  "expires_at": "2026-07-18T12:10:00Z"
}
```

## 7. Idempotency and replay

- [FACT] An exact duplicate request with the same organization, `request_id`, canonical action, policy version, and relevant evidence returns the same decision artifact while it remains valid.
- [FACT] Reusing `request_id` with a different canonical request returns HTTP `409`, reason `REQUEST_ID_REUSE_MISMATCH`, and `enforcement_effect: DENY`.
- [FACT] An expired decision is never refreshed in place; the caller submits a new `request_id` for a new evaluation.
- [FACT] `ALLOW` artifacts are single-use for v0.1.
- [FACT] The authoritative service owns the atomic consumption record; the enforcement wrapper requests consumption immediately before the irreversible action.
- [INFERENCE] These rules prevent request-ID replay, payload substitution, and accidental repeated execution without requiring SignGate to become the executor.

## 8. Decision, transport, and fail-closed model

- [FACT] HTTP `200` returns one of the three policy decisions only after authentication, tenancy, parsing, schema validation, canonicalization, policy retrieval, evaluation, and required audit persistence succeed.
- [FACT] `200 + DENY` is reserved for a successful domain-policy evaluation such as resolved mandate failure, missing/stale mandatory evidence, failed tests, prohibited secret-touching deployment, blocked target/counterparty, or insufficient budget.
- [FACT] Syntactically valid but schema-invalid requests return HTTP `422` with an error code and `enforcement_effect: DENY`; they are not policy `DENY` decisions.
- [FACT] Request-ID conflicts return HTTP `409` with `enforcement_effect: DENY`.
- [FACT] Unauthenticated/unauthorized callers return HTTP `401`/`403` with `enforcement_effect: DENY`.
- [FACT] Policy/dependency unavailability returns HTTP `503`; unexpected evaluator, canonicalizer, persistence, or invariant failure returns HTTP `500`.
- [FACT] `5xx/503` never contains a policy decision enum and must never be represented or audited as policy `DENY`; no `ALLOW` artifact is minted.
- [FACT] Malformed JSON returns HTTP `400` with `enforcement_effect: DENY`.
- [FACT] A denial/error without a computable action fingerprint is not an executable decision artifact; the executor still refuses.
- [FACT] The executor fails closed for every outcome other than valid `200 + ALLOW` followed by successful atomic consume.

Error envelope:

```json
{
  "contract_version": "0.1",
  "error": "REQUEST_SCHEMA_INVALID",
  "reason_codes": ["ACTION_PARAMETERS_UNFINGERPRINTABLE"],
  "request_id": "req_01J...",
  "enforcement_effect": "DENY",
  "audit_id": "audit_01J..."
}
```

## 9. Deployment policy v0.1

- [FACT] Preview deployment with valid `deploy:preview` mandate, matching commit-bound passing tests, and no protected-surface flags returns `ALLOW`.
- [FACT] Production deployment returns `REQUIRE_APPROVAL` even when tests pass.
- [FACT] Failed tests return `DENY`.
- [FACT] Missing mandatory test evidence returns `DENY`.
- [FACT] `touches_secrets: true` returns `DENY` with `SECRET_CHANGE_NOT_SUPPORTED_V0_1`.
- [FACT] DNS, credential, or permission changes return `REQUIRE_APPROVAL` when no secret material is included and all other evidence is complete.
- [FACT] A commit, route set, target, or parameter change after evaluation changes the fingerprint and the executor refuses.
- [FACT] Unknown environment or deploy target returns `DENY`.

## 10. External-message policy v0.1

- [FACT] `send_external_message` is a planned contract only and is not implemented in the first sprint.

- [FACT] A message to a new external recipient returns `REQUIRE_APPROVAL`.
- [FACT] Pricing, legal, security, financial, or contractual claims return `REQUIRE_APPROVAL`.
- [FACT] Missing recipient identity, mandate, or content fingerprint returns `DENY`.
- [FACT] SignGate evaluates metadata/evidence and a content fingerprint; it does not send the message.
- [ASSUMPTION] Raw sensitive customer content is minimized or excluded from preview requests.

## 11. Payment/x402 adapter policy

- [FACT] `payment` and `x402_purchase` are planned contract/stub surfaces only and are not implemented as full enforcement adapters in the first sprint.

- [FACT] The adapter preserves merchant/counterparty, amount, asset/network, resource, mandate, budget, and evidence provenance.
- [FACT] New counterparty or exceeded approval threshold returns `REQUIRE_APPROVAL`.
- [FACT] Blocked counterparty, invalid mandate, unsupported asset/network, insufficient budget, or mandatory-evidence failure returns `DENY`.
- [FACT] The adapter cannot weaken canonical fail-closed rules.
- [FACT] Documented request mapping for the non-live stub:
  - [FACT] commerce `agent` → canonical `agent`, constrained by authenticated principal;
  - [FACT] `buyer` → principal/evidence context, never a substitute for authenticated organization;
  - [FACT] `mandate` → tenant-scoped `mandate.id`, resolved server-side;
  - [FACT] `merchant` → `action.target.counterparty`;
  - [FACT] `resource` → `action.target.resource`;
  - [FACT] amount/asset/network → `action.parameters.payment` using decimal-string amount;
  - [FACT] budget/limits/client policy → provenance-preserving claims checked against authoritative server policy;
  - [FACT] wallet/merchant risk → evidence with source and observation time;
  - [FACT] x402 request → planned `x402_purchase` plus canonical payment-request digest.
- [FACT] Canonical response is authoritative; preview legacy fields such as `signer_directive` are derived aliases of `execution_directive` and cannot diverge.

## 12. Minimum reason-code registry

- [FACT] Allow: `POLICY_CHECKS_PASSED`.
- [FACT] Approval: `PRODUCTION_DEPLOY_REQUIRES_APPROVAL`, `DNS_CHANGE_REQUIRES_APPROVAL`, `PERMISSION_CHANGE_REQUIRES_APPROVAL`, `NEW_EXTERNAL_RECIPIENT`, `SENSITIVE_CLAIM_REQUIRES_APPROVAL`, `NEW_COUNTERPARTY`, `THRESHOLD_EXCEEDED`.
- [FACT] Policy deny: `MANDATE_EXPIRED`, `MANDATE_REVOKED`, `MANDATE_SCOPE_INVALID`, `MANDATORY_EVIDENCE_MISSING`, `TESTS_FAILED`, `SECRET_CHANGE_NOT_SUPPORTED_V0_1`, `TARGET_BLOCKED`, `INSUFFICIENT_BUDGET`.
- [FACT] Contract/auth error codes: `MANDATE_REFERENCE_MISSING`, `ACTION_TYPE_UNKNOWN`, `ACTION_PARAMETERS_UNFINGERPRINTABLE`, `REQUEST_SCHEMA_INVALID`, `REQUEST_ID_REUSE_MISMATCH`, `TENANT_CONTEXT_MISMATCH`, `APPROVAL_GRANT_REUSE_MISMATCH`, `DECISION_EXPIRED`, `ACTION_FINGERPRINT_MISMATCH`, `DECISION_ALREADY_CONSUMED`.
- [FACT] System/dependency error codes: `POLICY_UNAVAILABLE`, `APPROVAL_STORE_UNAVAILABLE`, `AUDIT_STORE_UNAVAILABLE`, `CONSUMPTION_STORE_UNAVAILABLE`, `POLICY_EVALUATION_FAILED`, `INTERNAL_INVARIANT_FAILED`; these are never policy `DENY` reason codes.

## 13. Executor acceptance rules

- [FACT] Execute only with decision `ALLOW`, directive `EXECUTE`, and a successful atomic consume receipt obtained immediately before the irreversible action.
- [FACT] Refuse if current time is outside `issued_at`/`expires_at`.
- [FACT] Refuse if recomputed fingerprint differs.
- [FACT] Refuse if the decision has already been consumed.
- [FACT] Refuse if policy version is not accepted by the wrapper.
- [FACT] Refuse on transport failure, missing decision, malformed response, unknown enum, or audit-record failure required by policy.
- [FACT] Record the proposed action, decision, enforcement result, and external execution result without storing secrets.
- [FACT] If external execution fails after consume, the decision remains consumed and a new decision is required.

## 14. Authentication and tenancy

- [FACT] Preview authentication uses scoped API keys over TLS; only one-way hashes of keys are stored.
- [FACT] Each credential is server-bound to one `organization_id`, credential type, allowed agent IDs, allowed action types, environment, status, and rotation metadata.
- [FACT] Agent, executor, and approver are logically separate principals with separate credentials/scopes.
- [FACT] v0.1 scoped credentials do not expand SignGate into IAM, SSO, RBAC, or an enterprise identity product.
- [FACT] Mandate IDs are tenant-scoped references; authoritative mandate scope, issuer, expiry, and status come from the trusted server-side mandate/policy store.
- [FACT] Approver identity and role come from the trusted approval authority/store, never from agent-supplied JSON alone.
- [FACT] Every request, decision, policy, mandate, approval, audit, idempotency, and consume lookup is scoped by authenticated organization.
- [FACT] Cross-tenant mismatch returns `403 TENANT_CONTEXT_MISMATCH` without revealing whether a foreign resource exists.

## 15. `deploy_change` action fingerprint v0.1

- [FACT] The first implementation sprint fully implements canonicalization only for `deploy_change`.
- [FACT] Use RFC 8785 JSON Canonicalization Scheme over a validated action envelope, then SHA-256 over its UTF-8 bytes, encoded as lowercase hex with prefix `sha256:`.
- [FACT] Reject duplicate object keys, unknown fields, ambiguous encodings, invalid UTF-8, NaN/infinity, and schema-invalid nulls before fingerprinting.
- [FACT] The fingerprint envelope includes `contract_version`, authenticated organization, resolved agent ID, action type, and the complete normalized `deploy_change` target and parameters.
- [FACT] `deploy_change` execution fields include environment, service/project, repository identity, commit SHA, artifact/build digest when available, changed routes, changed paths or diff digest, secret/DNS/credential/permission flags, deployment strategy/command identifier, and relevant configuration fingerprint.
- [FACT] Object member ordering follows RFC 8785.
- [FACT] Ordered arrays preserve order; schema-declared sets such as `changed_routes` are validated, deduplicated, and sorted.
- [FACT] Optional values are omitted; `null` is rejected unless explicitly nullable.
- [FACT] Monetary values in planned future schemas are decimal strings plus asset, never binary floating point.
- [FACT] Enum values use canonical defined case; opaque IDs, paths, resource names, and other identifiers remain case-sensitive unless explicitly defined otherwise.
- [FACT] Any change to any execution-related field invalidates the prior decision, approval grant, and consume eligibility.
- [FACT] Golden vectors must cover ordering, arrays, omission/null, Unicode, case, and every `deploy_change` field.
- [FACT] `send_external_message`, `payment`, and `x402_purchase` canonicalization may be documented but is not implemented in the first sprint.

## 16. Atomic consumption and state

- [FACT] Preview-protected/internal operation: `POST /v1/decisions/{decision_id}/consume`.
- [FACT] The request includes recomputed `action_fingerprint` and executor-generated `execution_attempt_id`.
- [FACT] A transactional state store performs atomic compare-and-set `AVAILABLE → CONSUMED`.
- [FACT] Only correct-tenant, valid `ALLOW`, unexpired, fingerprint-matching, policy-accepted decisions in `AVAILABLE` state may transition.
- [FACT] Concurrent calls yield exactly one successful logical consumption.
- [FACT] Exact retry with the same attempt ID returns the original consume receipt; a different attempt returns `409 DECISION_ALREADY_CONSUMED`.
- [FACT] The receipt binds decision, fingerprint, consumed timestamp, executor identity, and attempt ID.
- [FACT] The consume operation is not positioned as a generally available production API in v0.1.
- [FACT] The state store is the minimum control state needed for idempotency, grants, decision status, and consumption; it is not a workflow engine or approval dashboard.

## 17. Data handling and preview retention

- [FACT] Persist only minimum records required for idempotency, approval, audit, expiry, and single-use enforcement.
- [FACT] Do not accept or store full diffs, full source drafts, full message bodies, attachments, environment files, secret names/values, tokens, credentials, private keys, seed phrases, session material, or signing material.
- [FACT] Deploy audit data may contain commit/artifact/diff hashes, changed paths/routes when necessary, and non-sensitive flags/category codes.
- [FACT] Use structured allowlist logging; disable request-body dumps; redact sensitive headers and never log raw API keys.
- [FACT] Preview decision, approval, audit, idempotency, and consume records have 30-day retention.
- [FACT] Production retention, deletion, residency, backup, and legal-hold policy remain unresolved and outside this preview decision.

## 18. Approved scope and remaining implementation choices

- [FACT] Founder pre-approved the semantics in sections 6–17 subject to final review of the revised artifacts.
- [FACT] Non-production dogfood only is authorized after final Gate 1 approval; any real production deployment remains separately blocked behind Founder Gate 4.
- [OPEN] Transactional state technology, trusted human authentication provider, exact API-key rotation process, trusted clock/skew limit, and concrete deploy integration fields/libraries remain implementation choices to be proposed without changing the contract semantics.
- [FACT] Developer remains blocked until Founder explicitly changes `PM_CONTRACT_GATE` to `PASS` after reviewing these revisions.

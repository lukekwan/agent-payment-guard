# Payment Decision Contract — Reconciliation Candidate

Authority: `RECONCILIATION_CANDIDATE`
Schema version: `payment_decision_contract.v1.candidate`
Status: not approved, not frozen, not deployed

This document reconciles the dispatched Payment Decision candidate with the
SignGate v0.1 product boundary. The machine-readable candidate is
`specs/payment-decision-contract.schema.json`. The schema controls fields,
requiredness, enums, and validation; this document controls the accompanying
candidate semantics. Neither artifact authorizes a payment or x402 production
adapter.

## Immutable inputs

The reconciliation started from these verified inputs:

- general decision contract blob `b398451901836f4b3f0ab6254203d8e842990b3d`,
  SHA-256 `a1f07ee4ed2b51c5808d3538c9a00e24b1934903ea4561253ff7fa1e055f49c9`;
- product boundary blob `edc60235fc4612f5b9ee64b1901b615aa491e515`,
  SHA-256 `7a02150930c7096b8a4b1b74d6459378a4c2e4c4e8b5fa348ef50e7eb669a68d`;
- Payment Decision schema input blob
  `a0714bc5aa5d6c349b7fe471e5e6d4576b3d496a`, SHA-256
  `849c8914b1bf648f53293a3398b7eea8e34ee317714cd70a3c8548d7e9d3c302`;
- Payment Decision prose input blob
  `a8b2e3e4136d062a94527961e5f223d324fbad66`, SHA-256
  `43fe5cc5de4a715484b4b491d19e6bc3f5b591cf2eb2b7aec6cf6918e3836a39`.

All inputs have authority `CANDIDATE_INPUT_FOR_RECONCILIATION`.

## Endpoint and product boundary

The SignGate canonical endpoint remains `POST /v1/decisions`. The fully
implemented v0.1 vertical slice remains `deploy_change`. Payment and
`x402_purchase` are compatibility-contract surfaces only. The existing
`/v1/agentic-commerce/preflight` surface is not removed, but its adapter is
`PREVIEW / PLANNED / NOT DEPLOYED` and must not imply live enforcement.

The generic SignGate response owns `execution_directive`. A compatibility
`signer_directive` is derived from that directive and cannot become an
independent execution authority.

## Decisions and transport

Policy decisions are exactly:

```text
ALLOW
REQUIRE_APPROVAL
DENY
```

`REVIEW` is forbidden. `APPROVAL_REQUIRED` is accepted only by the explicit
legacy adapter and normalizes to `REQUIRE_APPROVAL`; a candidate producer never
emits it.

- HTTP 200 is reserved for a completed policy evaluation and contains one of
  the three decision values.
- malformed JSON is 400;
- authentication and tenant failures are 401/403;
- schema-invalid input is 422;
- idempotency or binding conflict is 409;
- dependency unavailability is 503;
- unexpected invariant, canonicalization, evaluation, or persistence failure
  is 500.

Every non-200 result has enforcement effect `DENY`, but 5xx is a system failure,
never a policy `DENY`, and never carries a policy decision enum.

## Request

The schema requires agent, buyer, mandate, merchant, resource, payment intent,
evidence, and context. Unknown fields at every declared object boundary are
rejected. Authentication and tenant identity are server-side inputs; caller
claims do not substitute for them.

Amounts use positive integer atomic units encoded as strings. JSON numbers,
zero, decimal, negative, exponent, caller-supplied decimals, and duplicated
currency fields are rejected. EVM v1 resolves trusted asset metadata and
decimals server-side. `symbol` is display metadata only.

The parser rejects invalid UTF-8, comments, trailing commas, malformed escapes,
duplicate keys, escaped-equivalent duplicate keys, unsupported numeric forms,
excessive nesting, and bounded-resource violations before policy evaluation or
fingerprinting.

## Response and enforcement

Every response carries independent `decision_id`, trusted-clock
`evaluated_at`, required `expires_at`, request/evidence/authorization binding
fingerprints, minimal mandate/merchant/resource references, reason registry and
policy versions, signer directive, and enforcement requirements.

Compatibility projections use the closed reason mapping defined in
`PAYMENT_DECISION_COMPATIBILITY_ADAPTER.md`. They preserve generic `audit_id` as
Payment Decision `audit_ref` exactly. Missing or unknown mappings are contract
errors, never silent fallbacks. Final-persistence authority races are exposed
consistently by Memory and D1 as HTTP 409 `AUTHORITY_PROVENANCE_INVALID`.

`ALLOW` requires:

- `signer_directive.action=ALLOW_SIGNING_AFTER_ENFORCEMENT`;
- `max_uses=1`;
- profile `sg.enforcement.v1.atomic_single_use_authority_revalidation`;
- successful atomic revalidation and single-use consume immediately before
  execution.

`REQUIRE_APPROVAL` and `DENY` require `DO_NOT_SIGN`, `max_uses=0`, and profile
`sg.enforcement.v1.non_executable_fresh_evaluation`. An approval causes a new
evaluation and new decision ID; the original response never becomes executable.

Consumers validate against an expected execution context and execute only from
the sanitized validated object. They compare expiry, request/evidence/
authorization fingerprints, mandate/merchant/resource IDs, approval binding,
policy version, directive, max uses, and enforcement profile. Unknown
security-critical fields, directives, checks, or enums fail closed.

## Fingerprints and serialization

Serialization is RFC 8785 JCS using UTF-8 and SHA-256 encoded as
`sha256:<lowercase hex>`. The pinned JavaScript implementation is
`canonicalize@3.0.0`.

Request domain:

```text
signgate.payment_decision_contract.v1.candidate.request\n
```

Evidence domain:

```text
signgate.payment_decision_contract.v1.candidate.evidence\n
```

The request fingerprint is computed after schema validation and explicit
allowlist projection of `schema_version`, `request_id`, `agent`, `buyer`,
`mandate`, `merchant`, `resource`, `payment_intent`, `evidence`, and `context`.
Authorization is separately bound by `authorization_subject_fingerprint`.
Response identity and timestamps never enter request/evidence fingerprints.

## Runtime authority and atomicity

Policy data never supplies trusted clocks, asset metadata, approval grants,
decision IDs, or persistence authority. An executable `ALLOW` is valid only if
credential, mandate, authorized target, trusted evidence, approval (when used),
policy, expiry, and action binding are all checked inside the same
transactional/conditional persistence authority.

A mutation after provenance materialization and before insert must make the
conditional operation fail. Zero-row conditional persistence must roll back the
transaction and leave no decision, idempotency row, executable artifact,
approval-use mutation, receipt, or success audit. A redacted failure audit may
be recorded separately after the failed transaction.

## Redaction and non-goals

Responses use minimal references and do not echo complete buyer, merchant,
resource, mandate, credentials, secrets, private keys, tokens, signing material,
or raw evidence. This candidate does not execute payments, custody keys, sign
transactions, deploy production, alter Cloudflare/D1 bindings, create a
dashboard, begin Phase C, or authorize repository migration.

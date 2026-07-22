# API Endpoint Page Template

**Use only for approved public operations.** An OpenAPI-generated operation block supplements this structure; it never replaces the human-readable sections.

## Required section order

1. **Purpose** — one task-focused sentence, when to use it, and what it does not do.
2. **Method and path** — exact method/path, copyable, with service family.
3. **Availability** — sample/sandbox/production, authority status, last verified date, side-effect class.
4. **Authentication** — exact scheme, credential type, scopes and tenant/owner/agent boundary; `none` if none.
5. **Pricing / usage** — exact unit/price/source date, x402/subscription/unpaid/internal mode, and payment warning.
6. **Rate limit** — numeric rule and response headers, or explicit `not yet published`; never invent a limit.
7. **Request parameters** — path/query/header tables with type, required, constraints and examples.
8. **Request body** — human explanation followed by schema/field table and full example.
9. **Response envelope** — exact current shape first; proposed canonical envelope only in a clearly labeled concept callout.
10. **Success example** — schema-valid complete response with environment and request ID when contract supports them.
11. **Decision-state examples** — only service values; separate tabs/cards for allow, review/approval, deny/block, unknown/malformed behavior.
12. **Error examples** — status, stable code, meaning, corrective action and safe execution effect.
13. **Retry behavior** — idempotency key, safe/unsafe methods, backoff, expiry, payment/replay consequences.
14. **Security notes** — credential, payment, signer, privacy/provider and fail-closed boundaries.
15. **Related guides** — no more than 3–5 task-relevant links.
16. **Test it** — last, with exact environment, side-effect/price warning, key masking and availability. Disable when unsafe/unavailable.

## Header example

```text
Payment Guard Evaluation
GET /v1/x402/payment-guard/evaluate

Availability  Production · VERIFIED_PUBLIC · last verified 2026-07-22
Auth          x402 payment challenge
Price         $0.10 USDC per request
Side effect   Paid, read-only evaluation
Test it       Sample only; production auto-payment disabled
```

## Parameter table

| Name | In | Type | Required | Constraints | Example | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `amount` | query | string decimal | yes | service-defined positive range | `25.00` | Proposed payment amount; do not use binary float notation. |

## Decision presentation

Every state panel contains:

- exact source enum and casing;
- one-line meaning;
- executable vs advisory status;
- whether approval/review is required;
- caller action;
- retry/re-evaluation rule;
- complete JSON fixture validated against the approved schema.

Do not group `REVIEW`, `REQUIRE_APPROVAL`, and `APPROVAL_REQUIRED` into one response example unless the panel is explicitly a cross-service conceptual comparison.

## Test it policy

| Endpoint class | UI behavior |
| --- | --- |
| Static/fixed sample | Enabled without credential; no production dependency |
| Sandbox read-only | Enabled only after sandbox host/key/CORS/rate-limit/request-ID evidence |
| Paid x402 read-only | Sample by default; later explicit price and payment confirmation |
| Stateful/reservation/approval/webhook/signer | Sandbox only after security review; production disabled |
| Candidate | Non-executable fixture only |
| Internal/admin | Never public |

## Author/QA checklist

- Route, OA, catalog, x402, test and runtime evidence agree.
- Authority is `VERIFIED_PUBLIC`.
- Auth, scope, price and rate limit have sources.
- Request and all responses validate against the approved schema.
- cURL/JavaScript/Python examples parse and fail closed.
- No key, token, wallet secret, internal identifier or production unsafe Test it host is present.
- English/Traditional Chinese pages are semantically paired.
- Mobile tables/code do not overflow the page container.

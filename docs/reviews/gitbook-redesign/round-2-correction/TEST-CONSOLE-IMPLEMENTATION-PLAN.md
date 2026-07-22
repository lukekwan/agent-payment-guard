# Test Console and Sandbox Implementation Plan

**Status:** plan only; no runner, proxy, credential, payment, or deployment was created.

## Safety policy

Browser execution is allowed only when an endpoint is explicitly allowlisted by method/path, environment, authority, side-effect class, price ceiling, and credential type. Production keys must never be persisted or sent to analytics. Unknown response states fail closed. A visible OpenAPI button is not proof that a request is safe or usable.

## Three test tiers

### Tier A — read-only samples

No credential, payment, state change, approval consumption, reservation, signer action, or production dependency. The runner uses versioned fixtures or a dedicated sample service. It displays request, response, field descriptions, copyable cURL/JSON, and selectable examples for allow-style, review, `REQUIRE_APPROVAL`, and deny/block-style results while labeling the originating service taxonomy.

Immediate approved seed: GET `/v1/agentic-commerce/preflight/sample` was runtime-verified 200. To satisfy “no production dependency,” copy its reviewed schema-conformant fixtures into the docs build or a dedicated static sample runner rather than calling production from every browser session.

### Tier B — sandbox

Use sandbox-only credentials and test agents, buyers, merchants, wallets and resources. The sandbox must not connect to production wallet, signer, custody or payment systems; move funds; consume production quota; or issue production approvals. Every response carries an environment marker.

Required console behavior: request editor, masked headers, response body and headers, HTTP status, latency, request ID, rate-limit remaining, clear-credential action, copy as cURL, error-doc link, CORS allowlist, per-route rate limit, audit log, payload-size limit, timeout, and secret-redaction test. Credentials stay in memory/session only and are cleared on tab close and explicit action.

### Tier C — production

Initially show request formats and reviewed response examples only. Do not default to browser execution for paid, stateful, reservation, approval, webhook, signer or admin operations. Never store a production key or send it to telemetry. Show method-specific warnings and direct users to server-side clients. Even read-only x402 requests require an explicit payment confirmation and price display; $99/$499 operations are not browser-executable by default.

## Option comparison

| Option | Effort | Security / credential risk | GitBook compatibility | CORS requirement | Rate-limit support | Observability | Recommended use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GitBook OpenAPI Test it | Low after OA approval | Medium/high if production host/key or paid route is enabled | Native | Runtime must allow browser origin | Depends on API | Limited to API/runtime | Schema/reference rendering; Tier C examples only until allowlist exists |
| GitBook + sandbox proxy | Medium/high | Medium; proxy can prevent prod routing and redact secrets | Good if embedded/OpenAPI host points to proxy | Proxy controls CORS | Strong | Strong request IDs/logs/latency | **Recommended Tier B** after security review |
| External playground | High | Medium; separate app security surface | Link/embed | App + API CORS | Strong | Strong | Later, if rich workflows justify maintenance |
| Postman collection | Medium | Lower browser risk; local secret storage depends on user | Download/link | Usually no browser CORS | Manual/env dependent | Client-side history | Authenticated sandbox and server-like testing |
| Bruno collection | Medium | Lower cloud exposure; local file/env handling | Download/link | No browser CORS | Manual/env dependent | Local | Security-conscious downloadable companion |
| Downloadable cURL | Low | Low docs risk; shell/history risk must be explained | Excellent | None | User-managed | Low | **Recommended universal baseline** |
| Embedded static sample runner | Low/medium | Low when fixtures only | Good | None if bundled | Not applicable | UI event only, no secrets | **Recommended Tier A** |

## Recommended architecture

1. **Now:** static Tier A runner plus downloadable cURL and generated examples.
2. **After PM/security approval:** sandbox proxy with a route allowlist, short-lived sandbox tokens, redaction, request IDs, quotas, and no production upstream credentials.
3. **Companion assets:** Postman and Bruno collections generated from the approved sandbox OA.
4. **Production:** reference/examples only until each method passes side-effect and credential review.

## Endpoint eligibility

| Class | Tier A | Tier B | Tier C browser execution |
| --- | --- | --- | --- |
| Fixed sample/discovery | yes | optional | read-only GET only |
| Verified paid read-only x402 | fixtures | yes with test payment mechanism | conditional, explicit price/payment confirmation |
| Implemented-unverified | fixtures only after schema review | no until authority/test complete | no |
| Stateful approval/reservation/policy/webhook | fixtures | dedicated sandbox only | no |
| Candidate deploy_change | fixtures labeled candidate | preview sandbox only after PM | no |
| Internal/admin | no public fixture with sensitive fields | internal test environment | never |

## Sandbox acceptance evidence

Before any “Try it” claim, QA must attach: exact sandbox host, environment marker, allowed methods/paths, credential issuance/revocation, CORS result, 2xx/4xx fixtures, request/response schema validation, rate-limit headers, request ID correlation, secret masking/clearing test, no-production-upstream assertion, negative route tests, latency, and real HTTP evidence. GitBook must remain draft/noindex until this passes.

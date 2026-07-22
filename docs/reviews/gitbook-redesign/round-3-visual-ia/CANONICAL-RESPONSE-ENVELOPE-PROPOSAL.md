# Canonical Response Envelope Proposal

**Status:** non-binding proposal; do not modify existing API contracts.  
**Purpose:** give documentation, future SDKs, and a future major API version a consistent outer response while retaining service-specific payload semantics.

## Proposed shapes

### Success

```json
{
  "data": {
    "decision": "REQUIRE_APPROVAL",
    "signer_directive": {
      "agent_may_directly_sign": false
    }
  },
  "meta": {
    "request_id": "req_sandbox_01",
    "environment": "sandbox",
    "evaluated_at": "2030-01-01T12:00:00Z",
    "expires_at": "2030-01-01T12:05:00Z",
    "usage": {
      "billable_operation": "agentic_commerce_preflight",
      "units": 1
    }
  }
}
```

### Error

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request does not satisfy the service schema.",
    "reason_codes": ["MISSING_MANDATE"]
  },
  "meta": {
    "request_id": "req_sandbox_01",
    "environment": "sandbox"
  }
}
```

## Envelope rules

1. Exactly one of `data` or `error` is present.
2. `meta.request_id` and `meta.environment` are required in a future envelope-aware version.
3. `evaluated_at`, `expires_at`, pagination and `usage` appear only when meaningful.
4. Service-specific fields remain inside `data`; the envelope does not canonicalize existing decision enums.
5. Error `code` is stable/machine-readable; `message` is human-readable; `reason_codes` may carry ordered or set semantics only if the service contract states it.
6. HTTP status retains protocol meaning. A `data` envelope does not turn every service decision into HTTP success or execution permission.
7. Sensitive billing, policy, provider or internal metadata is not exposed through `usage` merely for consistency.

## Compatibility analysis

| Current family | Current pattern | Envelope compatibility | Semantic risk |
| --- | --- | --- | --- |
| Payment Guard evaluation | Top-level `decision` with `ALLOW / REVIEW / BLOCK` and evidence | Move existing response unchanged under `data`; add `meta` | Low structural, high if enum is silently remapped |
| Payment authorization | Lowercase decision plus `signing_directive` | Preserve casing/fields in `data` | High if clients confuse lower/uppercase values or infer signer enforcement |
| Agentic Commerce Preflight | `ALLOW / REQUIRE_APPROVAL / DENY`, reasons and `signer_directive` | Natural `data` payload; sample can demonstrate envelope | Medium; current clients expect top-level fields |
| Buyer policy/identity | `APPROVAL_REQUIRED` variants and policy payload | Preserve exact source value under `data` | Medium/high; approval spelling is contract-sensitive |
| Evidence products | Product-specific top-level evidence, risk and decision hints | Wrap entire current object in `data` | Low/medium; large payload and streaming considerations |
| deploy_change candidate | Decision and consume objects with candidate fields | Can wrap in a future candidate version only | High; not canonical or production |
| MCP tool result | Tool protocol result plus derived `auto_payment_allowed` | Envelope may live inside tool content, not replace MCP protocol | High; double-envelope and tool-schema compatibility |
| Error responses | Mixed top-level `error`, reason fields and status shapes | Map only with explicit version/adapter | High; consumers often branch on exact current fields |

## Breaking-change risk

Wrapping existing top-level fields is breaking for JSONPath, destructuring, generated clients, schemas, signatures, caches, MCP mappings, and webhook consumers. Adding `meta` alone may be non-breaking for tolerant JSON clients but still changes signatures/hashes and strict schemas. Therefore the envelope must not be rolled into existing endpoints as a docs-only cleanup.

Risk levels:

- **High:** in-place wrapping, enum mapping, field removal/rename, error rewrite.
- **Medium:** opt-in media type, query flag, or compatibility header on existing paths.
- **Lower:** new major API version or SDK-only normalized view that retains raw response.

## SDK impact

Future SDKs could return:

```text
result.data      normalized envelope payload
result.meta      request/environment/usage metadata
result.raw       exact service response during migration
result.sourceDecision.value
result.sourceDecision.service
```

SDK helpers must not collapse service decisions into a boolean without checking directives and contract version. Types should be discriminated by service/version, and unknown enum values must remain representable and fail closed.

## Migration paths

### Path 1 — documentation-only presentation adapter

Show a labeled “proposed canonical envelope” next to exact current responses. No runtime or SDK change. Safest now, but developers still integrate service-specific shapes.

### Path 2 — SDK normalization layer

Add opt-in normalized results while exposing raw response. Version SDK types and telemetry separately. This improves ergonomics without changing HTTP, but creates SDK/non-SDK divergence and requires exhaustive tests.

### Path 3 — new major API version

Introduce the envelope in `/v2` or an equivalently versioned contract. Run dual schemas, publish a migration matrix, generate both SDK versions, announce deprecation/effective dates, and retain old behavior for the support window. This is the cleanest authoritative path and the highest engineering/product effort.

## Recommendation for PM

Use Path 1 for the portal proposal. If the product wants a canonical network response, choose Path 3 through a separately approved API project. Do not retrofit the envelope into current runtime/OpenAPI during documentation work.

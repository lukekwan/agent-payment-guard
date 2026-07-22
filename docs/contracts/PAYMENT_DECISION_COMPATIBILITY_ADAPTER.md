# Payment Decision Compatibility Adapter

Status: `PREVIEW / PLANNED / NOT DEPLOYED`
Authority: `RECONCILIATION_CANDIDATE`

## Boundary

The canonical SignGate endpoint is `POST /v1/decisions`. The implemented v0.1
vertical slice is `deploy_change`. This adapter documents a future mapping for
`payment` and `x402_purchase`; it does not register a route, call an executor,
sign, consume, or authorize a payment.

The adapter must use the canonical SignGate evaluator, reason registry, audit
path, decision enum, idempotency boundary, approval lifecycle, and atomic
consume authority. It may not weaken generic 200/4xx/5xx separation.

## Request mapping

| Payment candidate | Generic SignGate projection |
|---|---|
| authenticated agent | canonical `agent`, constrained by server principal |
| server tenant | authenticated `organization_id`; never buyer-derived |
| `buyer` | provenance/principal evidence |
| `mandate.id` | tenant-scoped server-resolved mandate reference |
| `merchant` | `action.target.counterparty` |
| `resource` | `action.target.resource` |
| `payment_intent.scheme=x402` | `action.type=x402_purchase` |
| `payment_intent.scheme=direct_transfer` | `action.type=payment` |
| network/asset/amount | `action.parameters.payment` |
| evidence/context | provenance-preserving evidence/context |
| authorization | opaque approval reference and origin binding |

Caller-provided decimals, risk conclusions, approval claims, wallet safety, or
mandate authority are not trusted. The runtime resolves those values from typed
trusted dependencies.

## Response mapping

Generic `execution_directive` is authoritative. A legacy
`signer_directive` is a derived alias only:

| Canonical decision/directive | Derived legacy signer directive |
|---|---|
| `ALLOW` + `EXECUTE`, single use | `ALLOW_SIGNING_AFTER_ENFORCEMENT`, `max_uses=1` |
| `REQUIRE_APPROVAL` + `DO_NOT_EXECUTE` | `DO_NOT_SIGN`, `max_uses=0` |
| `DENY` + `DO_NOT_EXECUTE` | `DO_NOT_SIGN`, `max_uses=0` |

The adapter may accept legacy `APPROVAL_REQUIRED` and normalize it to
`REQUIRE_APPROVAL`. It never emits `APPROVAL_REQUIRED` or `REVIEW`.

## Fail-closed conditions

The adapter rejects unknown fields/enums, conflicting legacy and candidate
fields, missing mandate without an explicitly configured trusted resolver,
invalid money/time/identifier/asset/evidence values, binding loss, reason-code
loss, policy-version loss, decision-ID loss, or any mapping that discards
evidence provenance. It never object-spreads unvalidated input into canonical
output and never invents a production mandate.

The code projection returns `deployment_authorized=false` and
`adapter_status=PREVIEW_PLANNED_NOT_DEPLOYED`. Those values are invariant until
a separately authorized implementation phase changes the product boundary.

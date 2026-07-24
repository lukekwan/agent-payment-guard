# Nomos x402 Endpoint Catalog

Status: rolling catalog source-ready artifact. Public production deployment is
blocked until the Cloudflare Worker credential is accepted.

## Nomos Agent Utilities

Pay-per-request identity, blockchain intelligence, policy and decision APIs for
autonomous agents.

Validated rolling catalog exposes the 10 Founder/CMO-authorized endpoints below.
Wallet risk-360 and merchant trust use Nomos-derived output only and do not
return raw supplier responses or provider names.

### POST /x402/v1/value/convert

Price: 0.005 USDC

Purpose: convert a supported digital asset amount into USD or TWD for agent
budgeting, limit checks, or purchase planning.

Request example:

```json
{
  "asset": "USDT",
  "amount": "100",
  "quote_currency": "TWD",
  "idempotency_key": "agent-123:quote:001"
}
```

Response example:

```json
{
  "asset": "USDT",
  "amount": "100",
  "quote_currency": "TWD",
  "unit_price": "32.450000",
  "converted_value": "3245.00",
  "price_timestamp": "2026-07-24T00:00:00.000Z",
  "data_freshness_seconds": 30,
  "result_id": "val_..."
}
```

Supported assets: BTC, ETH, TRX, USDT, USDC

Supported quote currencies: USD, TWD

Freshness semantics: the response reports the quote timestamp and the freshness
window used by the MVP.

Fixed quote routes:

- `GET /x402/v1/value/btc-usd` — 0.002 USDC
- `GET /x402/v1/value/eth-usd` — 0.002 USDC
- `GET /x402/v1/value/trx-usd` — 0.001 USDC
- `GET /x402/v1/value/usdt-twd` — 0.001 USDC
- `GET /x402/v1/value/usdc-twd` — 0.001 USDC

## Authorized Rolling Catalog

| Method | Path | Price | Status |
| --- | --- | ---: | --- |
| POST | `/x402/v1/value/convert` | 0.005 USDC | ready |
| POST | `/x402/v1/policy/budget-check` | 0.020 USDC | ready |
| POST | `/x402/v1/service/health` | 0.020 USDC | ready |
| POST | `/x402/v1/wallet/identify` | 0.010 USDC | ready |
| POST | `/x402/v1/wallet/watchlist` | 0.020 USDC | ready |
| POST | `/x402/v1/wallet/risk-lite` | 0.040 USDC | ready |
| POST | `/x402/v1/wallet/risk-360` | 0.100 USDC | ready |
| POST | `/x402/v1/merchant/trust` | 0.200 USDC | ready |
| POST | `/x402/v1/decision/payment-preflight` | 0.200 USDC | ready |
| POST | `/x402/v1/service/preflight` | 0.100 USDC | ready |

All ready endpoints include OpenAPI request schema, response status metadata,
price metadata, x402 402 response metadata, examples, and freshness semantics in
the runtime response. Runtime unpaid behavior is enforced by the existing x402
middleware before business logic.

### POST /x402/v1/policy/budget-check

Price: 0.020 USDC

Purpose: return a deterministic spend decision before an agent buys a paid API,
uses budget, or initiates a consequential workflow.

Request example:

```json
{
  "agent_id": "agent-123",
  "currency": "USDC",
  "requested_amount": "250",
  "remaining_budget": "100",
  "per_transaction_limit": "150",
  "purpose": "api_purchase",
  "idempotency_key": "agent-123:budget:001"
}
```

Response example:

```json
{
  "decision": "DENY",
  "reason_codes": [
    "REQUEST_EXCEEDS_REMAINING_BUDGET",
    "REQUEST_EXCEEDS_TRANSACTION_LIMIT"
  ],
  "requested_amount": "250",
  "remaining_budget": "100",
  "per_transaction_limit": "150",
  "decision_id": "bud_...",
  "expires_at": "2026-07-24T00:10:00.000Z"
}
```

Decision values: ALLOW, REQUIRE_APPROVAL, DENY

Rules: fail closed on malformed input, unsupported currency, missing purpose,
negative or zero request amount, budget breach, or transaction-limit breach.
Requests above the auto-approval threshold or selected sensitive purposes return
REQUIRE_APPROVAL.

Additional policy and decision routes:

- `POST /x402/v1/policy/merchant-check` — 0.050 USDC
- `POST /x402/v1/decision/payment-preflight` — 0.100 USDC
- `POST /x402/v1/decision/tool-access` — 0.030 USDC
- `POST /x402/v1/service/health` — 0.010 USDC
- `POST /x402/v1/service/preflight` — 0.100 USDC

### POST /x402/v1/wallet/risk-lite

Price: 0.050 USDC

Purpose: return a normalized, lightweight wallet risk signal before an agent
interacts with a wallet.

Request example:

```json
{
  "chain": "ethereum",
  "address": "0x0000000000000000000000000000000000000000",
  "action": "api_purchase",
  "value_usd": "100",
  "idempotency_key": "agent-123:wallet:001"
}
```

Response example:

```json
{
  "risk_score": 0,
  "risk_level": "LOW",
  "entity_type": "unknown",
  "sanctions_match": false,
  "reason_codes": [],
  "data_timestamp": "2026-07-24T00:00:00.000Z",
  "data_freshness": "30s",
  "result_id": "wrl_..."
}
```

Supported chains: ethereum, tron, bitcoin

Additional wallet routes:

- `POST /x402/v1/wallet/identify` — 0.010 USDC
- `POST /x402/v1/wallet/labels` — 0.010 USDC
- `POST /x402/v1/wallet/watchlist` — 0.020 USDC

Risk mapping:

- LOW: 0-29
- MEDIUM: 30-74
- HIGH: 75-89
- SEVERE: 90-100

Privacy boundary: no raw upstream JSON, provider-specific field names, full
KYC/KYB documents, provider confidence internals, private customer data,
internal database identifiers, third-party identifiers, or licensed raw data dumps are
returned.

## Common Errors

- 402: x402 payment required
- 400: invalid JSON or malformed request
- 400: unsupported asset, quote currency, currency, chain, or address format
- 408/503: payment verification or data source timeout when enabled

## Health and Discovery

- `GET /health`
- `GET /openapi.json`
- `GET /.well-known/x402`
- `GET /.well-known/mcp.json`

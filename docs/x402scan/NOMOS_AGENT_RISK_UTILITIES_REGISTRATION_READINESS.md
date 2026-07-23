# Nomos Agent Utilities x402scan Registration Readiness

Status: MVP candidate, not yet approved for public mainnet listing.

Public product name: Nomos Agent Utilities

Public one-line description: Pay-per-request identity, blockchain intelligence, policy and decision APIs for autonomous agents.

## Paid Resources

| Method | Path | Price | Purpose |
| --- | --- | ---: | --- |
| POST | `/x402/v1/value/convert` | 0.002 USDC | Convert BTC, ETH, TRX, USDT, and USDC into USD or TWD. |
| GET | `/x402/v1/value/btc-usd` | 0.002 USDC | Return a BTC/USD reference quote. |
| GET | `/x402/v1/value/eth-usd` | 0.002 USDC | Return an ETH/USD reference quote. |
| GET | `/x402/v1/value/trx-usd` | 0.001 USDC | Return a TRX/USD reference quote. |
| GET | `/x402/v1/value/usdt-twd` | 0.001 USDC | Return a USDT/TWD reference quote. |
| GET | `/x402/v1/value/usdc-twd` | 0.001 USDC | Return a USDC/TWD reference quote. |
| POST | `/x402/v1/policy/budget-check` | 0.010 USDC | Return a deterministic budget policy decision. |
| POST | `/x402/v1/policy/merchant-check` | 0.050 USDC | Return a deterministic merchant policy decision. |
| POST | `/x402/v1/decision/payment-preflight` | 0.100 USDC | Return a compact payment preflight decision. |
| POST | `/x402/v1/decision/tool-access` | 0.030 USDC | Return a deterministic tool-access decision. |
| POST | `/x402/v1/service/health` | 0.010 USDC | Return a paid service health and discovery probe. |
| POST | `/x402/v1/service/preflight` | 0.100 USDC | Return a deterministic service preflight decision. |
| POST | `/x402/v1/wallet/identify` | 0.010 USDC | Return a normalized wallet identity-lite signal. |
| POST | `/x402/v1/wallet/labels` | 0.010 USDC | Return normalized wallet labels. |
| POST | `/x402/v1/wallet/watchlist` | 0.020 USDC | Return lightweight sanctions and watchlist booleans. |
| POST | `/x402/v1/wallet/risk-lite` | 0.050 USDC | Return a lightweight wallet risk signal for Bitcoin, Ethereum, and Tron. |

## Discovery Surfaces

- OpenAPI: `/openapi.json`
- x402 discovery: `/.well-known/x402`
- AI buyer catalog: `/catalog.json`
- Registry: `/registry.json`
- MCP metadata: `/.well-known/mcp.json`

The MCP metadata advertises these as paid tool definitions. The JSON-RPC `/mcp`
runtime does not bypass x402 payment for these utilities.

## Public Copy Guardrails

Allowed wording:

- multi-source blockchain intelligence
- identity and risk signals
- policy-derived decisions

Do not publicly mention upstream provider names or internal provider
architecture.

## Sample Requests

```json
{
  "asset": "USDT",
  "amount": "100",
  "quote_currency": "TWD"
}
```

```json
{
  "agent_id": "agent-123",
  "currency": "USDC",
  "requested_amount": "250",
  "remaining_budget": "100",
  "per_transaction_limit": "150",
  "purpose": "api_purchase"
}
```

```json
{
  "chain": "ethereum",
  "address": "0x94F751f04b98507D31b500b7Ed50bE68A1514873",
  "action": "api_purchase",
  "value_usd": "100"
}
```

## Validation Evidence

- `npm run check` must pass before listing.
- Local unpaid POST probes must return x402 `402 Payment Required`.
- `.well-known/x402` must include all validated Phase 1 operations with the
  correct method and price.
- OpenAPI must expose JSON request bodies for POST routes.

# Nomos x402 Publication Checklist

Status: prepared for review. Do not submit public x402scan listing until Founder
/ CMO approval.

## Service Identity

- Product name: Nomos Agent Utilities
- Public description: Pay-per-request identity, blockchain intelligence, policy
  and decision APIs for autonomous agents.
- Public origin: to be assigned from approved preview or production host
- Contact: Nomos Labs
- Logo reference: use existing approved Nomos Labs logo asset after publication
  approval

## Discovery

- `/health`: ready
- `/openapi.json`: ready
- `/.well-known/x402`: ready
- `/.well-known/mcp.json`: includes preview paid tool definitions
- Static review OpenAPI: `openapi/nomos-x402-revenue-mvp.openapi.yaml`

## Endpoints

- `POST /x402/v1/value/convert`: 0.002 USDC
- `GET /x402/v1/value/btc-usd`: 0.002 USDC
- `GET /x402/v1/value/eth-usd`: 0.002 USDC
- `GET /x402/v1/value/trx-usd`: 0.001 USDC
- `GET /x402/v1/value/usdt-twd`: 0.001 USDC
- `GET /x402/v1/value/usdc-twd`: 0.001 USDC
- `POST /x402/v1/policy/budget-check`: 0.010 USDC
- `POST /x402/v1/policy/merchant-check`: 0.050 USDC
- `POST /x402/v1/decision/payment-preflight`: 0.100 USDC
- `POST /x402/v1/decision/tool-access`: 0.030 USDC
- `POST /x402/v1/service/health`: 0.010 USDC
- `POST /x402/v1/service/preflight`: 0.100 USDC
- `POST /x402/v1/wallet/identify`: 0.010 USDC
- `POST /x402/v1/wallet/labels`: 0.010 USDC
- `POST /x402/v1/wallet/watchlist`: 0.020 USDC
- `POST /x402/v1/wallet/risk-lite`: 0.050 USDC

## Network and Asset

- Network: Base
- Payment asset: USDC
- Exact-price resources: yes
- Testnet or zero-value simulation preferred before real production funds

## Required Before Public Listing

- Founder / CMO public listing approval
- Preview or staging host selected
- Paid settlement tested without real customer data
- Duplicate payment/replay behavior reviewed
- Wallet Risk Lite licensed data boundary reviewed
- Unit economics reviewed
- Public copy reviewed for provider-name leakage
- Operational owner and support contact assigned

## Not Authorized In This Task

- Public mainnet listing
- Production deployment
- Corporate website change
- Production API Docs change
- SignGate canonical contract change
- x402scan submission
- Dedicated D1 creation
- Real customer data use

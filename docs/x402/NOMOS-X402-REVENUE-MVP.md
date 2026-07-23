# Nomos x402 Revenue MVP

Task ID: NOMOS-X402-REVENUE-MVP-001

Status: implementation PR candidate. Public mainnet listing and production
deployment are not authorized by this artifact.

## Product

Public name: Nomos Agent Utilities

Public description: Pay-per-request identity, blockchain intelligence, policy
and decision APIs for autonomous agents.

Internal description: 提供 Agent 按次付費使用的價值換算、預算政策檢查與錢包風險訊號。

## Source Discovery

Implementation repository: `lukekwan/agent-payment-guard`

Local project path: `projects/base-agent-preflight`

Rationale: the existing service already hosts x402 paid resources, OpenAPI,
`.well-known/x402`, catalog metadata, MCP metadata, and local x402 middleware.
The MVP is isolated to three new paid utility resources and does not alter the
SignGate canonical contract.

No fourth repository is required for this MVP.

## Endpoints

Validated Phase 1 endpoints:

1. `POST /x402/v1/value/convert`
2. `GET /x402/v1/value/btc-usd`
3. `GET /x402/v1/value/eth-usd`
4. `GET /x402/v1/value/trx-usd`
5. `GET /x402/v1/value/usdt-twd`
6. `GET /x402/v1/value/usdc-twd`
7. `POST /x402/v1/wallet/identify`
8. `POST /x402/v1/wallet/labels`
9. `POST /x402/v1/wallet/watchlist`
10. `POST /x402/v1/wallet/risk-lite`
11. `POST /x402/v1/policy/budget-check`
12. `POST /x402/v1/policy/merchant-check`
13. `POST /x402/v1/decision/payment-preflight`
14. `POST /x402/v1/decision/tool-access`
15. `POST /x402/v1/service/health`
16. `POST /x402/v1/service/preflight`

Not exposed in this MVP: `wallet/risk-360` and `wallet/counterparties`. Those
require deeper data licensing and sample evidence validation before public
listing.

## Payment Behavior

The resources are registered with the existing x402 Hono middleware. Unpaid
requests return HTTP 402 before business logic executes. Successful paid
requests use the existing exact-price Base USDC settlement flow.

MVP payment controls:

- fixed exact price per endpoint
- x402 middleware challenge before business logic
- asset/network allowlist from the service payment configuration
- JSON body validation
- deterministic result or decision ids
- no secrets returned to clients
- duplicate requests are side-effect free and return deterministic ids when
  the caller supplies an idempotency key
- payment verification and settlement are delegated to the existing x402
  middleware and facilitator configuration

Not completed in this local artifact:

- live paid settlement using production funds
- public x402scan listing submission
- production deployment
- persistent duplicate-payment ledger

## Endpoint Design

### Value Convert

Price: 0.002 USDC

Supported assets: BTC, ETH, TRX, USDT, USDC

Supported quotes: USD, TWD

The MVP uses decimal-safe integer arithmetic and returns timestamp,
freshness, and deterministic result id. Provider raw responses are not exposed.
The initial quote source is a server-side reference table for local MVP testing;
production market-data sourcing remains a separate review gate.

### Budget Check

Price: 0.010 USDC

Decision values: ALLOW, REQUIRE_APPROVAL, DENY

Rules:

- requested amount must be positive
- requested amount must fit remaining budget
- requested amount must fit per-transaction limit
- currency must be supported
- purpose must be present
- requests above auto-approval threshold require approval
- selected sensitive purposes require approval

No LLM is used.

### Wallet Risk Lite

Price: 0.050 USDC

Supported chains: bitcoin, ethereum, tron

Risk levels:

- LOW: score 0-29
- MEDIUM: score 30-74
- HIGH: score 75-89
- SEVERE: score 90-100

The MVP returns normalized risk-lite signals only. It does not expose provider
raw JSON, provider-specific field names, private customer data, or licensed raw
datasets.

Top-level response fields include risk score, risk level, normalized entity
type, sanctions boolean, normalized reason codes, freshness, and result id.

## x402scan Readiness

Prepared discovery surfaces:

- dynamic OpenAPI served by `/openapi.json`
- dynamic paid discovery served by `/.well-known/x402`
- service health served by `/health`
- static review OpenAPI artifact at
  `openapi/nomos-x402-revenue-mvp.openapi.yaml`
- registration package at
  `docs/x402scan/NOMOS_AGENT_RISK_UTILITIES_REGISTRATION_READINESS.md`

Public listing is not authorized by this task.

## Boundaries

This implementation does not:

- modify `nomoslabs2026-bit/signgate`
- modify the corporate website
- modify production API Docs
- modify Company OS
- create dedicated D1
- use real customer data
- disclose upstream provider names in new public MVP surfaces
- submit a public x402scan listing

# Agent Payment Guard

Pre-payment policy enforcement and post-payment delivery evidence for
autonomous agents using x402 on Base.

Production service:
https://base-agent-preflight.bytoken2023.workers.dev/

## SDKs

- JavaScript: `npm install agent-payment-guard`
- Python: `pip install agent-payment-guard`

Both SDKs are dependency-light clients for the hosted Payment Guard API. An
x402-capable paid transport is supplied by the caller, so wallet custody and
payment signing remain outside the SDK.

## Main product

`GET /v1/x402/payment-guard/evaluate?url=https://...&session_id=...&request_id=...` — 0.01 USDC

Stateful payment policy decision with `ALLOW`, `REVIEW`, or `BLOCK`,
single/session/daily budgets, recipient allowlists and blocklists, replay
protection, merchant and domain checks, optional EVM intent decoding, and a D1
audit trail.

Production integrations should use `POST /v1/x402/payment-guard/evaluate` with
an `application/json` body. Owner-controlled profiles can be created through
`POST /v1/x402/payment-guard/policies`; the one-time agent token can evaluate
payments but cannot modify or inspect owner policy. ALLOW responses include a
signed decision token and expiring reservation. Use
`POST /v1/payment-guard/lifecycle` to commit a verified USDC transaction or
release a reservation, and `POST /v1/payment-guard/status` with the owner token
to inspect budget and audit state.

Policy profiles default to fail-closed behavior when required merchant, domain,
or transaction evidence is unavailable. They also support human-review
thresholds, profile-wide daily budgets across sessions, velocity and price
spike detection, configurable audit retention, credential rotation, policy
updates, and revocation. Stored audit URLs omit query strings and fragments.

Version 2 adds an owner approval queue for REVIEW decisions, Base transaction
simulation, tool/purpose/domain/time-window mandates, client-reported
post-payment delivery evidence, merchant payment and delivery history, signed
webhooks with a D1 retry outbox, and an MCP endpoint at `/mcp`. Lightweight
JavaScript and Python integration clients are available under `sdk/`. Each SDK
directory is independently publishable.

## Underlying tools

## Products

`GET /v1/x402/base/address-preflight?address=0x...` — 0.02 USDC

`GET /v1/x402/base/token-preflight?token=0x...` — 0.02 USDC

`GET /v1/x402/base/merchant-trust?address=0x...` — 0.03 USDC

`GET /v1/x402/base/payment-proof?tx=0x...&recipient=0x...&amount=0.02` — 0.01 USDC

`GET /v1/x402/base/wallet-activity-delta?address=0x...&since=...` — 0.01 USDC

`GET /v1/x402/base/approval-risk?token=0x...&owner=0x...&spender=0x...` — 0.005 USDC

`GET /v1/x402/base/contract-verification?address=0x...` — 0.005 USDC

`GET /v1/x402/base/usdc-receipt?tx=0x...` — 0.003 USDC

`GET /v1/x402/base/wallet-counterparty?address=0x...` — 0.005 USDC

`GET /v1/x402/base/event-log-monitor?address=0x...&from_block=...` — 0.003 USDC

`GET /v1/x402/base/gas-fee-quote?gas_limit=21000` — 0.003 USDC

`GET /v1/x402/base/nonce-readiness?address=0x...` — 0.003 USDC

`GET /v1/x402/base/stablecoin-balance?address=0x...` — 0.003 USDC

`GET /v1/x402/base/dex-market-monitor?token=0x...` — 0.005 USDC

`GET /v1/x402/prediction/market-snapshot?ticker=...` — 0.005 USDC

`GET /v1/x402/web/endpoint-preflight?url=https://...` — 0.005 USDC

`GET /v1/x402/software/npm-package-preflight?package=express&version=4.18.2` — 0.005 USDC

`GET /v1/x402/software/github-repository-health?owner=cloudflare&repo=workers-sdk` — 0.005 USDC

`GET /v1/x402/web/url-change-fingerprint?url=https://...` — 0.003 USDC

`GET /v1/x402/web/feed-snapshot?url=https://...` — 0.003 USDC

`GET /v1/x402/base/transaction-intent?to=0x...&data=0x...&value=0` — 0.005 USDC

`GET /v1/x402/agent/a2a-card-preflight?url=https://...` — 0.005 USDC

`GET /v1/x402/web/openapi-preflight?url=https://...` — 0.005 USDC

`GET /v1/x402/web/domain-trust-preflight?domain=example.com` — 0.005 USDC

`GET /v1/x402/software/pypi-package-preflight?package=requests&version=latest` — 0.005 USDC

The suite uses public Blockscout, DexScreener, Kalshi, npm, PyPI, OSV, GitHub,
Cloudflare DNS over HTTPS, RDAP, 4byte signatures, and caller-supplied public
web resources with deterministic, machine-readable flags and explicit
limitations. It is designed for repeated use before and after autonomous
payments, software installation, agent connections, API integration,
monitoring, or contract interactions.

## Commands

```sh
npm install
npm run check
npm run deploy
```

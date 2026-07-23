# SignGate - Agent Policy & Execution Control

Policy decision layer between autonomous agents and the systems that move
money. Before an AI agent pays, buys an API, triggers a signer, or commits to
an economically consequential action, SignGate evaluates authority, mandate,
merchant evidence, risk signals, policy, and signer requirements.

Production service:
https://base-agent-preflight.bytoken2023.workers.dev/

Public contact form:
`GET /signgate#contact`

The SignGate landing page can send inquiries through Formspree to
`nomolabs2026@gmail.com`. Formspree requires a generated endpoint such as
`https://formspree.io/f/...`; the old email-address endpoint is not supported.
After creating the Formspree form, enable submissions with:

```sh
wrangler secret put FORMSPREE_ENDPOINT
npm run deploy
```

If `FORMSPREE_ENDPOINT` is not set, the contact form renders but blocks
submission with a clear setup message.

AI buyer catalog:
https://base-agent-preflight.bytoken2023.workers.dev/catalog.json

Admin purchase dashboard:
`GET /admin/purchases` with `Authorization: Bearer ...`

Admin purchase JSON:
`GET /admin/purchases.json` with `Authorization: Bearer ...`

The dashboard is protected by the rotated `ADMIN_DASHBOARD_TOKEN_V2` Worker
secret via the Authorization header; permanent query-string tokens are not
accepted. It returns 401/403 without valid authorization and records successful paid x402 route
executions in D1 table `x402_purchase_events`; unpaid 402 probes, discovery
checks, and failed executions are not counted as purchases.

Human-readable buyer catalog:
[`AI_BUYER_CATALOG.md`](./AI_BUYER_CATALOG.md)

Agentic Commerce public page:
`GET /agentic-commerce-preflight`

Readonly sample:
`GET /v1/agentic-commerce/preflight/sample`

Demo decision API:
`POST /v1/agentic-commerce/preflight`

The public demo returns `ALLOW`, `REQUIRE_APPROVAL`, or `DENY` with reason
codes, evidence, and `signer_directive`. It does not custody funds, expose
private keys, sign transactions, approve tokens, or move money.

This is a **Decision Response**, not a cryptographically verifiable Decision
Artifact. It includes `schema_version`, `evaluated_at`, `expires_at`,
`policy_version`, and `evaluator_version` so the future artifact format can add
`request_digest`, `policy_digest`, `mandate_digest`, `evidence_digest`,
`nonce`, `issuer`, and `signature` without breaking the demo API.

For `payment_execution`, `agent_may_directly_sign=false` means the agent must
not hold or use unrestricted signing authority. It does not mean an agent can
never initiate an approved autonomous payment through an isolated HSM, KMS,
custody platform, or smart-account module.

## SDKs

- JavaScript: `npm install agent-payment-guard`
- Python: `pip install agent-payment-guard`

Both SDKs are dependency-light clients for the hosted Payment Guard API. An
x402-capable paid transport is supplied by the caller, so wallet custody and
payment signing remain outside the SDK.

## Main product

`GET /v1/x402/payment-guard/evaluate?url=https://...&session_id=...&request_id=...` — 0.10 USDC

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

## Agent Payment Risk Gateway

The hosted API now exposes an unpaid MVP surface for the signing-gate pattern
Luke described:

- `POST /v1/intents/verify`
- `POST /v1/payments/preflight`
- `POST /v1/payments/authorize`
- `GET /v1/x402/agent/payment-risk-gateway` — 0.15 USDC

These endpoints treat the agent as an untrusted spender. The agent submits a
structured stablecoin payment intent with `agent_id`, `request_id`, `pay_to`,
`amount_usdc`, `purpose`, `invoice_id` or `invoice_hash`, `nonce`, and
`expires_at`. The gateway validates the intent, applies dynamic limits,
allowlists/blocklists, caller-supplied risk signals, and returns
`allow`, `review`, or `deny`.

`/v1/payments/authorize` returns a signer directive such as
`sign_with_policy_controlled_key`, `hold_for_human_review`, or `do_not_sign`.
It never exposes private keys to the agent; production signing should remain in
KMS, MPC, account-abstraction policy modules, or another owner-controlled
signing service.

The `GET /v1/x402/agent/payment-risk-gateway` wrapper is listed in the paid
x402 resource catalog so x402scan-style buyers can discover the capability. It
returns the same pre-signing decision surface but intentionally does not mint a
production authorization token.

Version 2 adds an owner approval queue for REVIEW decisions, Base transaction
simulation, tool/purpose/domain/time-window mandates, client-reported
post-payment delivery evidence, merchant payment and delivery history, signed
webhooks with a D1 retry outbox, and an MCP endpoint at `/mcp`. Lightweight
JavaScript and Python integration clients are available under `sdk/`. Each SDK
directory is independently publishable.

## Agent Buyer Identity Preflight

`GET /v1/x402/agent/buyer-identity-preflight?agent_role=research_agent&product_category=wallet_risk&purpose=security_research&price_usdc=0.005` — 0.005 USDC

Agent-aware purchase governance for x402 marketplaces. Before an agent buys a
machine-payable API, this endpoint checks whether the buyer role, purpose,
product category, data sensitivity, spend amount, and approval evidence fit the
policy. The result is `ALLOW`, `DENY`, or `APPROVAL_REQUIRED` with reason codes,
role fit, spend flags, and audit guidance.

Initial buyer roles:

- `research_agent`
- `writer_agent`
- `accounting_agent`
- `finance_agent`
- `operator_agent`

Example policy outcomes:

- `research_agent` buying `wallet_risk` for security research: `ALLOW`
- `writer_agent` buying `wallet_risk`: `APPROVAL_REQUIRED`
- `accounting_agent` buying `market_intelligence`: `DENY`
- `accounting_agent` buying `invoice_verification`: `ALLOW`
- `finance_agent` initiating `payment_execution`: `APPROVAL_REQUIRED`
- `operator_agent` buying `api_security`: `ALLOW`

The endpoint is exposed through OpenAPI, the buyer catalog, `.well-known/x402`,
and MCP as `x402_agent_buyer_preflight` so x402scan-style buyers can discover
it as a governance step before payment.

Developer kit:

`packages/agent-buyer-policy-kit`

The kit is now the private v0.1 Agentic Commerce Policy Kit. It packages the
starter policy so customers can buy or install a local copy and customize
roles, categories, mandate constraints, merchant trust rules, signer
directives, spend thresholds, approval escalation, audit fields, and reason
codes without editing the hosted Worker. It includes:

- JSON policy pack
- product category taxonomy
- role x product category matrix
- deterministic JavaScript evaluator
- deterministic Agentic Commerce evaluator
- mandate checks
- merchant trust checks
- signer directive rules
- Python evaluator
- package README and tests

Intended product shape:

- hosted x402 API for immediate checks
- developer policy kit for teams that want to customize locally
- enterprise self-hosted adapter for internal IAM, audit, and approval systems

## Underlying tools

## Nomos Agent Utilities

`POST /x402/v1/value/convert` — 0.002 USDC

Pay-per-request value conversion for BTC, ETH, TRX, USDT, and USDC into USD or
TWD. Responses use decimal-safe arithmetic, include timestamp/freshness, and do
not expose provider raw responses.

Fixed low-friction quote routes are also exposed at 0.001-0.002 USDC:
`/x402/v1/value/btc-usd`, `/x402/v1/value/eth-usd`,
`/x402/v1/value/trx-usd`, `/x402/v1/value/usdt-twd`, and
`/x402/v1/value/usdc-twd`.

`POST /x402/v1/policy/budget-check` — 0.010 USDC

Deterministic ALLOW / REQUIRE_APPROVAL / DENY budget decision for autonomous
agents. This is a pure policy function with fixed reason codes, idempotency-key
support, and no LLM decisioning.

Additional deterministic policy and decision utilities are exposed for merchant
checks, payment preflight, tool-access checks, service health, and service
preflight.

`POST /x402/v1/wallet/risk-lite` — 0.050 USDC

Lightweight wallet risk signal for Bitcoin, Ethereum, and Tron before an agent
interacts with a wallet. It is a low-cost screening utility, not a full KYT
investigation.

Identity-lite, normalized labels, and watchlist booleans are also exposed as
low-price wallet utilities. Deeper risk-360 and counterparty graph products are
not exposed in this MVP until data licensing and validation gates pass.

## Featured growth endpoint

`GET /v1/x402/base/alpha-risk?subject=0x...&kind=auto` — 0.003 USDC

High-frequency Base wallet or token risk and alpha context for trading bots.
Returns a compact `risk_score`, `alpha_score`, `trade_bias`, top wallet
counterparties, token liquidity/activity, machine tags, and a next action.
This is designed for repeated bot filtering before copying, buying, or
interacting with a Base address.

`GET /v1/x402/base/token-alpha-snapshot?token=0x...` — 0.003 USDC

Bot-ready token liquidity, volume, buy/sell imbalance, risk flags, and trade
bias for repeated Base token filtering.

`GET /v1/x402/base/wallet-copytrade-risk?address=0x...` — 0.003 USDC

Copytrade suitability for a Base wallet using public address risk, activity,
counterparty quality, and a machine-readable recommendation.

`GET /v1/x402/base/new-pool-risk?token=0x...` — 0.003 USDC

Launch-stage pool risk for Base tokens using pair age, liquidity, activity
imbalance, contract flags, and bot-oriented next action.

`GET /v1/x402/x402/server-trust?server_url=https://...&seller=0x...&volume_usdc=108.45&txns=6115&buyers=107` — 0.01 USDC

x402 marketplace trust score for API servers and sellers using public payment
volume, transaction count, buyer diversity, freshness, chain coverage, and
optional live Base seller-address enrichment.

`GET /v1/x402/x402/origin-due-diligence?server_url=https://...` — 0.01 USDC

x402 origin/server due diligence for AI buyers: resource inventory, payment
recipient consistency, metadata quality, marketplace activity hints, and next
checks before autonomous spending.

`GET /v1/x402/x402/resource-compare?resources=https://...,https://...&budget_usdc=0.02` — 0.01 USDC

Compare two to five x402 resources by price, payment metadata, schema quality,
risk flags, and budget fit, returning an agent-ready ranked recommendation.

`GET /v1/x402/agent/spend-route-plan?task=screen%20a%20Base%20token&budget_usdc=0.02` — 0.005 USDC

Plan which Agent Payment Guard resources an autonomous buyer should purchase
for a task, budget, and risk tolerance.

`GET /v1/x402/base/token-exit-risk?token=0x...` — 0.003 USDC

Base token exit-risk snapshot for bots using liquidity depth,
volume/liquidity pressure, sell imbalance, pair age, and token flags.

`GET /v1/x402/bcs/labels?chain=ethereum&address=0x...&sources=all` — 0.02 USDC

BlockchainSecurity Atlantis address labels through an x402 paid wrapper. The
hosted Worker keeps the upstream `X-API-Key` server-side and returns the
BlockchainSecurity response envelope plus upstream request id / credit headers.

`GET /v1/x402/bcs/assets?chain=ethereum` — 0.003 USDC

BlockchainSecurity chain asset specs through x402.

`GET /v1/x402/bcs/chains` — 0.003 USDC

BlockchainSecurity supported chains and native/token entries.

`GET /v1/x402/bcs/registry` — 0.005 USDC

BlockchainSecurity full token registry through x402.

`GET /v1/x402/bcs/resolve?blockchain=ethereum&symbols=usdt,weth` — 0.005 USDC

BlockchainSecurity asset resolution through an AI-friendly GET wrapper over the
upstream `POST /v1/resolve` endpoint.

`GET /v1/x402/bcs/address-risk?blockchain=tron&address=...` — 0.15 USDC

BlockchainSecurity behavior-based risk score and triggered suspicious behavior
patterns for Ethereum / Tron addresses.

`GET /v1/x402/bcs/address-classify?blockchain=tron&addresses=...` — 0.10 USDC

BlockchainSecurity ML address type classification for up to 100 addresses.

`GET /v1/x402/bcs/wallet-overview?blockchain=tron&address=...` — 0.08 USDC

BlockchainSecurity wallet activity and balance overview.

`GET /v1/x402/bcs/trace?blockchain=tron&address=...&direction=out&depth=2` — 0.49 USDC

BlockchainSecurity multi-hop fund-flow tracing.

`GET /v1/x402/bcs/cross-chain?txhash=...&label=across` — 0.29 USDC

BlockchainSecurity bridge/cross-chain transaction tracking.

## Products

`GET /v1/x402/base/alpha-risk?subject=0x...&kind=auto` — 0.003 USDC

`GET /v1/x402/base/token-alpha-snapshot?token=0x...` — 0.003 USDC

`GET /v1/x402/base/wallet-copytrade-risk?address=0x...` — 0.003 USDC

`GET /v1/x402/base/new-pool-risk?token=0x...` — 0.003 USDC

`GET /v1/x402/x402/server-trust?server_url=https://...&seller=0x...&volume_usdc=108.45&txns=6115&buyers=107` — 0.01 USDC

`GET /v1/x402/x402/origin-due-diligence?server_url=https://...` — 0.01 USDC

`GET /v1/x402/x402/resource-compare?resources=https://...,https://...&budget_usdc=0.02` — 0.01 USDC

`GET /v1/x402/agent/spend-route-plan?task=screen%20a%20Base%20token&budget_usdc=0.02` — 0.005 USDC

`GET /v1/x402/base/token-exit-risk?token=0x...` — 0.003 USDC

`GET /v1/x402/bcs/labels?chain=ethereum&address=0x...&sources=all` — 0.02 USDC

`GET /v1/x402/bcs/assets?chain=ethereum` — 0.003 USDC

`GET /v1/x402/bcs/chains` — 0.003 USDC

`GET /v1/x402/bcs/registry` — 0.005 USDC

`GET /v1/x402/bcs/resolve?blockchain=ethereum&symbols=usdt,weth` — 0.005 USDC

`GET /v1/x402/bcs/address-risk?blockchain=tron&address=...` — 0.15 USDC

`GET /v1/x402/bcs/address-classify?blockchain=tron&addresses=...` — 0.10 USDC

`GET /v1/x402/bcs/wallet-overview?blockchain=tron&address=...` — 0.08 USDC

`GET /v1/x402/bcs/trace?blockchain=tron&address=...&direction=out&depth=2` — 0.49 USDC

`GET /v1/x402/bcs/cross-chain?txhash=...&label=across` — 0.29 USDC

Pricing version for the first formal pricing experiment:
`x402-pricing-v1-20260720`

`GET /v1/x402/base/address-preflight?address=0x...` — 0.075 USDC

`GET /v1/x402/base/token-preflight?token=0x...` — 0.075 USDC

`GET /v1/x402/base/merchant-trust?address=0x...` — 0.100 USDC

`GET /v1/x402/base/payment-proof?tx=0x...&recipient=0x...&amount=0.02` — 0.030 USDC

`GET /v1/x402/base/wallet-activity-delta?address=0x...&since=...` — 0.030 USDC

`GET /v1/x402/base/approval-risk?token=0x...&owner=0x...&spender=0x...` — 0.005 USDC

`GET /v1/x402/base/contract-verification?address=0x...` — 0.005 USDC

`GET /v1/x402/base/usdc-receipt?tx=0x...` — 0.003 USDC

`GET /v1/x402/base/wallet-counterparty?address=0x...` — 0.020 USDC

`GET /v1/x402/base/event-log-monitor?address=0x...&from_block=...` — 0.003 USDC

`GET /v1/x402/base/gas-fee-quote?gas_limit=21000` — 0.003 USDC

`GET /v1/x402/base/nonce-readiness?address=0x...` — 0.003 USDC

`GET /v1/x402/base/stablecoin-balance?address=0x...` — 0.003 USDC

`GET /v1/x402/base/dex-market-monitor?token=0x...` — 0.005 USDC

`GET /v1/x402/prediction/market-snapshot?ticker=...` — 0.005 USDC

`GET /v1/x402/web/endpoint-preflight?url=https://...` — 0.015 USDC

`GET /v1/x402/software/npm-package-preflight?package=express&version=4.18.2` — 0.015 USDC

`GET /v1/x402/software/github-repository-health?owner=cloudflare&repo=workers-sdk` — 0.020 USDC

`GET /v1/x402/web/url-change-fingerprint?url=https://...` — 0.003 USDC

`GET /v1/x402/web/feed-snapshot?url=https://...` — 0.003 USDC

`GET /v1/x402/base/transaction-intent?to=0x...&data=0x...&value=0` — 0.005 USDC

`GET /v1/x402/agent/a2a-card-preflight?url=https://...` — 0.020 USDC

`GET /v1/x402/web/openapi-preflight?url=https://...` — 0.015 USDC

`GET /v1/x402/web/domain-trust-preflight?domain=example.com` — 0.015 USDC

`GET /v1/x402/agent/capability-security-preflight?target_type=agent&identifier=...` — 0.100 USDC

`GET /v1/x402/software/pypi-package-preflight?package=requests&version=latest` — 0.005 USDC

The suite uses public Blockscout, DexScreener, Kalshi, npm, PyPI, OSV, GitHub,
Cloudflare DNS over HTTPS, RDAP, 4byte signatures, and caller-supplied public
web resources with deterministic, machine-readable flags and explicit
limitations. It is designed for repeated use before and after autonomous
payments, software installation, agent connections, API integration,
monitoring, trading-bot filtering, or contract interactions.

## Commands

```sh
npm install
npm run check
npm run deploy
```

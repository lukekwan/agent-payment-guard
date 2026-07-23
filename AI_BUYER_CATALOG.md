# AI Buyer Catalog

This catalog explains when an autonomous AI buyer should use SignGate evidence
providers before paying, signing, buying data, or triggering another
economically consequential action. The machine-readable version is served at:

`https://base-agent-preflight.bytoken2023.workers.dev/catalog.json`

x402scan server:

`https://www.x402scan.com/server/b0ce6f4e-73e9-431d-b23c-814ac89cc77b`

## Product Shape

- Product families: 88
- Paid operations observed through `.well-known/x402`: 90
- Reason for the difference: x402scan counts paid OpenAPI operations. Product
  families count GET products; the extra paid operations are Payment Guard JSON
  evaluation and policy creation.
- Payment network: Base
- Payment protocol: x402

## Sumsub-backed Compliance Evidence

SignGate now exposes 8 Sumsub-backed evidence products through x402 discovery:

1. `sumsub-case-management-evidence`
2. `sumsub-db-net-evidence`
3. `sumsub-kyt-evidence`
4. `sumsub-payment-method-crypto-evidence`
5. `sumsub-poa-evidence`
6. `sumsub-crystal-crypto-risk-evidence`
7. `sumsub-travel-rule-evidence`
8. `sumsub-watchlist-aml-evidence`

These endpoints productize normalized evidence contracts and sandbox capability
mapping. They do not create applicants, upload documents, make compliance
claims, perform production signing, or move money.

## Recommended AI Workflows

### 0. Agentic Commerce Policy Decision

Goal: evaluate whether an autonomous agent action is authorized before payment
or signer execution.

Public page:

`https://base-agent-preflight.bytoken2023.workers.dev/agentic-commerce-preflight`

Sample:

`GET /v1/agentic-commerce/preflight/sample`

Demo API:

`POST /v1/agentic-commerce/preflight`

The decision contract returns `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`, with
reason codes, evidence, mandate context, merchant context, and
`signer_directive`.

The current public endpoint returns a Decision Response, not a signed Decision
Artifact. It does not claim signer enforcement, cryptographic immutability, or
transaction binding. Future Decision Artifacts should add request, policy,
mandate, evidence, nonce, issuer, and signature binding.

Use the x402 products below as evidence providers or application-specific
entry points. They are not the company-level positioning by themselves.

### 1. Before An Agent Buys Any x402 API

Goal: verify that the buyer agent role fits the x402 API, dataset, or tool
before payment.

Sequence:

1. `agent-buyer-identity-preflight`
2. `x402-endpoint-preflight`
3. `agent-payment-guard`

Escalate to human review when the role and product category do not clearly
match, data sensitivity is high, payment execution is involved, or price exceeds
the role limit.

### 2. Before Paying An Unknown x402 API

Goal: let an autonomous agent decide whether to pay an unknown x402 API.

Sequence:

1. `x402-origin-due-diligence`
2. `x402-resource-compare`
3. `x402-endpoint-preflight`
4. `x402-server-trust`
5. `agent-payment-guard`

Escalate to human review when endpoint metadata is malformed, seller activity is
concentrated, or Payment Guard returns `REVIEW` or `BLOCK`.

### 3. Wallet Or Token KYT Preflight

Goal: screen an address or token before payment, onboarding, copytrading, or
contract interaction.

Sequence:

1. `base-address-preflight`
2. `bcs-address-labels`
3. `base-wallet-counterparty`
4. `evm-transaction-intent`

Buy the label or counterparty steps only when the first preflight returns
medium/high risk or the value at risk is material.

### 4. Trading Bot Fast Filter

Goal: keep bot checks cheap while preserving a path to deeper review.

Sequence:

1. `base-alpha-risk-context`
2. `base-token-exit-risk`
3. `base-token-alpha-snapshot`
4. `base-new-pool-risk`
5. `base-dex-market-monitor`

Stop at the 0.003 USDC filters for low-value candidates; continue only for
high-alpha or suspicious tokens.

### 5. Agent Tool Supply Chain

Goal: preflight a tool, API, dependency, or agent before an AI runtime imports
or delegates to it.

Sequence:

1. `domain-trust-preflight`
2. `openapi-spec-preflight`
3. `a2a-agent-card-preflight`
4. `npm-package-preflight`
5. `pypi-package-preflight`
6. `github-repository-health`

Block or require review when package vulnerabilities, stale repos, unsafe
domains, or mismatched agent endpoints appear.

## Product Groups

### KYT Wallet And Contract Risk

Use these when the buyer needs to decide whether an AI agent, wallet, VASP, or
backend should interact with a Base address, token, contract, or counterparty.

- `base-address-preflight` — 0.075 USDC: first-line address risk and identity
  check before payment, onboarding, allowlisting, or routing.
- `base-token-preflight` — 0.075 USDC: token contract, reputation, holder, and
  DEX liquidity check before trading.
- `base-wallet-activity-delta` — 0.030 USDC: recent wallet movement since a
  known timestamp.
- `base-approval-risk` — 0.005 USDC: live allowance check for unlimited or
  unusually large approvals.
- `base-contract-verification` — 0.005 USDC: source verification, compiler,
  proxy, and implementation check.
- `base-wallet-counterparty` — 0.020 USDC: ranked counterparties from recent
  wallet activity.
- `base-event-log-monitor` — 0.003 USDC: decoded event logs after a known Base
  block.
- `evm-transaction-intent` — 0.005 USDC: calldata intent and approval/transfer
  risk before signing.

### x402 Payment Safety

Use these when an autonomous buyer needs to verify x402 merchants, payment
requirements, proof of payment, or seller reputation before or after spending.

- `agent-buyer-identity-preflight` — 0.05 USDC: verify whether the buyer
  agent role, purpose, product category, data sensitivity, and spend amount fit
  before an x402 purchase. Use as evidence for a broader SignGate decision.
- `agent-buyer-policy-kit` — 49.00 USDC: buy the customizable Agent Buyer
  / Agentic Commerce Policy Kit manifest, starter policy pack, mandate checks,
  merchant trust checks, signer directive rules, role-product matrix, and
  JS/Python integration guidance.
- `agent-payment-guard` — 0.10 USDC: core ALLOW/REVIEW/BLOCK payment firewall
  with budget, policy, replay, simulation, evidence, and decision token.
- `x402-endpoint-preflight` — 0.015 USDC: unpaid endpoint inspection and
  payment requirement decoding.
- `x402-server-trust` — 0.01 USDC: marketplace trust score for x402 API servers
  and sellers.
- `x402-origin-due-diligence` — 0.01 USDC: origin/server due diligence for
  resource inventory, payment-recipient consistency, metadata quality, and next
  checks.
- `x402-resource-compare` — 0.01 USDC: compare two to five x402 resources by
  price, payment metadata, risk flags, and budget fit.
- `agent-spend-route-plan` — 0.005 USDC: route a task and budget into an
  ordered set of Agent Payment Guard resources with stop conditions.
- `x402-merchant-trust` — 0.100 USDC: merchant USDC receipt history and payer
  concentration.
- `base-payment-proof` — 0.030 USDC: exact canonical Base USDC payment proof.
- `base-usdc-receipt` — 0.003 USDC: compact receipt extractor.
- `base-gas-fee-quote` — 0.003 USDC: transaction cost context.
- `base-nonce-readiness` — 0.003 USDC: pending/confirmed nonce readiness.
- `base-stablecoin-balance` — 0.003 USDC: USDC, USDT, and DAI balances.

### AgentOps Guard

Use these when an autonomous agent needs a runtime gate or harness-readiness
assessment before tools, deployments, MCP servers, or background workflows run.

- `agent-action-preflight` — 0.010 USDC: ALLOW/REVIEW/BLOCK decision before a
  side-effecting action such as shell, deploy, DNS, email, wallet, x402
  purchase, file write, browser, or MCP tool call.
- `mcp-server-risk-check` — 0.020 USDC: MCP server and tool-list risk check
  before connecting a runtime to a new connector or tool server.
- `agent-harness-score` — 0.050 USDC: 0-100 harness maturity score across loop,
  tools, permissions, human approval, context, memory, recovery, background
  execution, scheduling, subagents, MCP, observability, and eval controls.

### Trading Bot Alpha And Risk

Use these when bots need low-cost pre-trade filters for Base wallets, tokens,
pools, liquidity, and copytrade decisions.

- `base-alpha-risk-context` — 0.003 USDC: first-pass wallet/token risk,
  alpha score, trade bias, tags, and next action.
- `base-token-alpha-snapshot` — 0.003 USDC: liquidity, volume, buy/sell
  imbalance, risk flags, and trade bias.
- `base-wallet-copytrade-risk` — 0.003 USDC: follow/monitor/avoid decision for
  copytrading a wallet.
- `base-new-pool-risk` — 0.003 USDC: launch-stage pool risk.
- `base-token-exit-risk` — 0.003 USDC: exit-liquidity, sell-pressure, pair-age,
  and bot action guidance before entering or holding a token.
- `base-dex-market-monitor` — 0.005 USDC: DEX price, liquidity, volume, and
  activity.

### Agent And API Supply-Chain Preflight

Use these when an AI runtime needs to check tools, packages, domains, OpenAPI
specs, feeds, or agent cards before depending on them.

- `agent-capability-security-preflight` — 0.100 USDC: bundled Agent Card,
  repository, package, domain, OpenAPI, and x402 endpoint security preflight.
- `domain-trust-preflight` — 0.015 USDC: DNS, DNSSEC, mail, CNAME, RDAP age,
  expiration, and domain trust.
- `openapi-spec-preflight` — 0.015 USDC: OpenAPI validity, servers, auth,
  operation coverage, and fingerprint.
- `a2a-agent-card-preflight` — 0.020 USDC: A2A Agent Card discovery, skills,
  provider, auth, endpoints, and unsafe URLs.
- `npm-package-preflight` — 0.015 USDC: npm metadata, maintenance, deprecation,
  license, dependencies, and OSV vulnerabilities.
- `pypi-package-preflight` — 0.005 USDC: PyPI metadata, yanked status,
  requirements, dependencies, license, and OSV vulnerabilities.
- `github-repository-health` — 0.020 USDC: repository maintenance, release,
  archive, license, issue, and popularity signals.
- `url-change-fingerprint` — 0.003 USDC: redirect, metadata, cache validators,
  and SHA-256 content fingerprint.
- `feed-snapshot` — 0.003 USDC: normalized RSS/Atom entries with stable item
  fingerprints.

### BlockchainSecurity Data Wrappers

Use these when an AI agent needs labels or asset registry data through x402
without exposing the upstream BlockchainSecurity API key.

- `bcs-address-labels` — 0.02 USDC: address labels and entity hints.
- `bcs-assets` — 0.003 USDC: chain asset specs.
- `bcs-chains` — 0.003 USDC: supported chains and token entries.
- `bcs-token-registry` — 0.005 USDC: full token registry.
- `bcs-asset-resolve` — 0.005 USDC: symbol/contract resolution.

### Market Context

Use this when an agent needs a compact external market signal inside a workflow.

- `prediction-market-snapshot` — 0.005 USDC: public Kalshi quote, volume, open
  interest, and orderbook snapshot.

## Buyer Guidance

AI agents should not buy every resource for every task. The intended buying
pattern is staged:

1. Start with the cheapest preflight check.
2. Escalate only when the first result is medium/high risk, high value, or
   operationally ambiguous.
3. Use `agent-payment-guard` before the actual spend when the agent is allowed
   to make autonomous x402 payments.
4. Use human review for high-value payments, unclear provenance, concentrated
   seller activity, unknown calldata, or vendor/license uncertainty.

All results are public-data heuristics and upstream wrappers, not guarantees of
safety.

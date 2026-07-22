# Proposed Service-led Information Architecture

**Status:** proposal for PM review; no public GitBook pages are changed in this round.

## Positioning

English candidate:

> SignGate is the policy decision layer between autonomous agents and the systems that move money or execute sensitive actions. Before an agent pays, purchases an API, triggers a signer, or performs another economically consequential operation, SignGate evaluates authority, mandate, evidence, risk, and policy.

Traditional Chinese candidate:

> SignGate 是自主代理與付款、簽章及敏感執行系統之間的政策決策層。在 AI Agent 付款、購買 API、觸發簽章器或執行其他具經濟後果的操作前，SignGate 會評估權限、授權範圍、證據、風險與政策。

The homepage flow should be: **agent proposes an action → SignGate evaluates service-specific policy/evidence → result may allow, require review/approval, or deny/block → an executor or signer enforces the applicable directive → the integration retains an audit record**. This wording deliberately does not claim one universal enum or universal signer enforcement.

## Proposed compact tree

```text
SignGate Developer Docs
├── Home
│   ├── What SignGate does
│   ├── API services and availability
│   ├── How service-specific decisions work
│   ├── Test with sample data
│   └── Production limitations
├── Get Started
│   ├── Choose an API service
│   ├── Authentication and x402 payment
│   ├── Environments
│   ├── First safe request
│   ├── Test data
│   └── Errors and request IDs
├── API Services
│   ├── Agent Payment Control
│   ├── Agentic Commerce Preflight
│   ├── Buyer Identity and Mandate Checks
│   ├── Merchant and x402 Trust
│   ├── Wallet, Token, and Transaction Evidence
│   ├── Tool and API Supply-chain Checks
│   ├── RPC and Chain-data Readiness
│   └── Compliance Evidence Providers
├── Integration Guides
│   ├── Before an agent pays
│   ├── Before an agent buys an API
│   ├── Before a signer executes
│   ├── Human approval flow
│   ├── x402 integration
│   ├── SDK integration
│   ├── MCP integration
│   └── Preview use case: deploy_change
├── API Reference
│   ├── Verified public endpoints only
│   ├── Grouped by approved service
│   └── Generated from approved OpenAPI
├── Core Concepts
│   ├── Service-specific decisions
│   ├── Mandates
│   ├── Evidence
│   ├── Policies
│   ├── Signer directives
│   ├── Idempotency and expiry
│   └── Audit
├── Examples
│   ├── cURL
│   ├── JavaScript
│   ├── Python
│   ├── Allow-style results
│   ├── Review / approval-style results
│   ├── Deny / block-style results
│   └── Errors
├── Security
│   ├── Trust and enforcement boundaries
│   ├── Credential handling
│   ├── Replay protection
│   ├── Tenant isolation
│   ├── Data retention
│   └── Production limitations
└── Resources
    ├── Availability and API status
    ├── Pricing
    ├── Rate limits
    ├── Changelog and versioning
    ├── SDKs and MCP
    └── Support
```

## Service card contract

Cards come only from `SERVICE-INVENTORY.md`. Each must show: purpose, intended task, availability badge, auth/payment mode, price model, side-effect class, and safe test mode. Recommended badges are **Available**, **Available — x402 payment**, **Limited**, **Pending verification**, and **Candidate**.

Rules:

1. Only `VERIFIED_PUBLIC` operations may enter generated API Reference.
2. `IMPLEMENTED_UNVERIFIED` services may appear on a capability map only as **Pending verification**, without Test it or exact availability promises.
3. `PROPOSED_CANDIDATE` operations appear only under the preview use case.
4. `INTERNAL_ONLY` operations never enter the public tree.
5. Prices and auth are endpoint-level facts; do not infer them from the service name.
6. The $99 and $499 x402 products must never be executable by default in a browser.

## Developer journeys

| Journey | Start | Service | Safe next action |
| --- | --- | --- | --- |
| Evaluate a payment | Choose an API service | Agent Payment Control | Run a fixed Tier A sample; request sandbox access for live payloads |
| Buy an x402 API | x402 authentication/payment | Merchant and x402 Trust + Buyer Identity | Inspect unpaid 402 and copy payment-aware client example; never auto-pay |
| Screen a wallet/transaction | First safe request | Wallet, Token, and Transaction Evidence | Choose exact evidence product and review freshness/limitations |
| Let an agent use a tool | Choose an API service | Tool and API Supply-chain Checks | Inspect package/spec/card using an approved paid flow |
| Integrate an agent framework | Integration Guides | SDK and MCP Integration | Use versioned client/tool contract after authority review |
| Understand deploy approval preview | Preview Use Case | Decision Lifecycle and Audit | Read one consolidated candidate guide; no production Test it |

## Benchmark-derived presentation direction

Use the benchmark only for IA behavior: concise landing copy, service/task cards, linear onboarding, generated endpoint reference, compact callouts, and language isolation. Do not copy its wording, schemas, brand, or proprietary content. Page count is subordinate to independent developer tasks.

## Changed-files boundary for next phase

If PM approves this IA, the next docs change would rewrite `docs/gitbook/public/SUMMARY.md`, both locale homepages, onboarding/service landing pages, and approved generated reference; merge candidate deploy_change material into one preview guide; and implement separate locale navigation. This round intentionally changes none of those files.

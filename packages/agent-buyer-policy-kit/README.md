# SignGate Agent Buyer Policy Kit

Policy kit for deciding whether an AI agent should buy an x402 API, dataset, or
tool.

The core question:

```text
Before this agent pays for this service, is this agent allowed to buy this kind
of data or tool for this purpose?
```

This package is for teams that want to self-host or customize the Agent Buyer
Identity Preflight logic instead of only calling the hosted SignGate API.

## Included

- Five starter buyer roles:
  - `research_agent`
  - `writer_agent`
  - `accounting_agent`
  - `finance_agent`
  - `operator_agent`
- Product category taxonomy.
- Role x product category matrix.
- Deterministic JavaScript evaluator.
- JSON policy pack intended to be edited by customers.
- Tests covering `ALLOW`, `DENY`, and `APPROVAL_REQUIRED`.
- Draft pricing memo.
- Release checklist with public-sale approval gates.
- Python evaluator under `python/`.

## Install

This package is currently staged inside the SignGate Worker repo:

```sh
npm install ./packages/agent-buyer-policy-kit
```

Future package name:

```sh
npm install @signgate/agent-buyer-policy-kit
```

Python package draft:

```sh
cd python
python3 -m unittest discover -s tests
```

## Usage

```js
import { evaluateAgentBuyerPreflight } from "@signgate/agent-buyer-policy-kit";

const result = evaluateAgentBuyerPreflight({
  agent_id: "agent.research.001",
  agent_role: "research_agent",
  product_category: "wallet_risk",
  purpose: "security_research",
  price_usdc: "0.005",
  data_sensitivity: "medium",
});

console.log(result.decision); // ALLOW
console.log(result.reason_codes); // ROLE_PRODUCT_CATEGORY_ALLOWED
```

## Starter Outcomes

| Buyer | Product category | Decision |
| --- | --- | --- |
| `research_agent` | `wallet_risk` | `ALLOW` |
| `writer_agent` | `wallet_risk` | `APPROVAL_REQUIRED` |
| `accounting_agent` | `market_intelligence` | `DENY` |
| `accounting_agent` | `invoice_verification` | `ALLOW` |
| `finance_agent` | `payment_execution` | `APPROVAL_REQUIRED` |
| `operator_agent` | `api_security` | `ALLOW` |

## What Customers Edit

Most customers should edit policy, not source code:

- `policy/default-agent-buyer-policy.json`
- `policy/product-categories.json`
- `policy/role-product-matrix.md`

Common changes:

- Add company-specific agent roles.
- Add internal product categories.
- Change spend thresholds.
- Require approval for sensitive datasets.
- Deny specific roles from buying certain tools.
- Bind decision output to internal audit logs.

## Hosted API

Hosted SignGate endpoint:

```text
GET https://base-agent-preflight.bytoken2023.workers.dev/v1/x402/agent/buyer-identity-preflight
```

The hosted API is useful for immediate x402 marketplace checks. This kit is for
teams that want a customizable self-hosted or embedded policy evaluator.

## Pricing

Draft pricing is in [`PRICING.md`](./PRICING.md).

Recommended default before Founder approval:

- Hosted API: `$0.005` per preflight decision.
- Developer Kit: `$49` one-time.
- Self-hosted starter: `$499` one-time.
- Enterprise: starts around `$2,000/month`.

The Developer Kit price is not public/live until Founder approves final
pricing, license, and delivery flow.

## Non-Goals

- No wallet custody.
- No private key handling.
- No transaction signing.
- No token approval.
- No autonomous money movement.
- No seller-delivery guarantee.

## Enterprise Notes

Production deployments should bind this evaluator to:

- authenticated agent identity
- immutable policy versions
- human approval records
- signed audit logs
- spend ledgers
- x402 payment evidence

# SignGate Agentic Commerce Policy Kit

Policy kit for deciding whether an AI agent should buy an x402 API, dataset, or
tool, and whether the mandate, merchant evidence, and signer directive allow
the action to proceed.

The core question:

```text
Before this agent pays or asks a signer to move money, is this action allowed
by the buyer role, mandate, merchant evidence, and signer policy?
```

This package is for teams that want to self-host or customize Agentic Commerce
Preflight logic instead of only calling the hosted SignGate API.

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
- Deterministic Agentic Commerce evaluator covering mandate, merchant trust,
  and signer directive checks.
- Sumsub-backed compliance evidence service catalog for eight sandbox
  capabilities.
- JSON policy pack intended to be edited by customers.
- Tests covering `ALLOW`, `DENY`, `APPROVAL_REQUIRED`, missing mandate, role
  mismatch, merchant wallet mismatch, and payment signer directive.
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

Agentic commerce preflight:

```js
import { evaluateAgenticCommercePreflight } from "@signgate/agent-buyer-policy-kit";

const result = evaluateAgenticCommercePreflight({
  buyer_id: "buyer.acme",
  agent_id: "agent.finance.001",
  agent_role: "finance_agent",
  product_category: "payment_execution",
  amount_usdc: "0.25",
  asset: "USDC",
  chain: "base",
  merchant_domain: "pay.vendor.example",
  merchant_wallet: "0xabc0000000000000000000000000000000000001",
  mandate: {
    id: "mandate-001",
    type: "payment",
    status: "active",
    buyer_id: "buyer.acme",
    agent_id: "agent.finance.001",
    agent_role: "finance_agent",
    merchant_domains: ["pay.vendor.example"],
    merchant_wallets: ["0xabc0000000000000000000000000000000000001"],
    allowed_categories: ["payment_execution"],
    max_amount_usdc: "1.00",
    assets: ["USDC"],
    chains: ["base"],
    expires_at: "2099-01-01T00:00:00.000Z",
  },
  merchant: {
    domain: "pay.vendor.example",
    wallet: "0xabc0000000000000000000000000000000000001",
    expected_wallet: "0xabc0000000000000000000000000000000000001",
    openapi_domain: "pay.vendor.example",
    agent_card_domain: "pay.vendor.example",
    category: "payment_execution",
    kyt_risk: "low",
  },
});

console.log(result.decision); // APPROVAL_REQUIRED
console.log(result.signer_directive.agent_may_directly_sign); // false
console.log(result.signer_directive.execution_may_be_agent_initiated); // true
console.log(result.reason_codes);
// includes PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER
```

The evaluator returns a Decision Response, not a cryptographically verifiable
Decision Artifact. It includes `schema_version`, `response_kind`,
`evaluator_version`, `evaluated_at`, `expires_at`, `policy_version`,
`reason_codes`, and `signer_directive`. A future Decision Artifact should add
request, policy, mandate, evidence, nonce, issuer, and signature binding.

For `payment_execution`, `agent_may_directly_sign=false` means the agent must
not hold or use unrestricted signing authority. It does not prevent an approved
agent workflow from initiating execution through an isolated HSM, KMS, custody
platform, or smart-account module.

Sumsub evidence service manifest:

```js
import {
  buildSumsubEvidenceManifest,
  listSumsubEvidenceServices,
} from "@signgate/agent-buyer-policy-kit";

const services = listSumsubEvidenceServices();
console.log(services.length); // 8

const manifest = buildSumsubEvidenceManifest({
  environment: "sandbox",
  allowedChecks: {
    CASE_MANAGEMENT: "Case Management",
    DB_NET: "Database network verification",
    KYT: "Know Your Transaction",
    PAYMENT_METHOD_CRYPTO: "Crypto payment method check",
    POA: "Proof of Address",
    TM_CRYPTO_RISK_SCORING_CRYSTAL: "Crystal crypto risk scoring",
    TRAVEL_RULE: "Travel Rule compliance",
    WATCHLISTS: "AML Screening",
  },
});

console.log(manifest.service_count); // 8
console.log(manifest.enabled_service_count); // 8
```

The Sumsub manifest is a normalized service catalog for evidence binding. It
does not create applicants, upload documents, run production compliance checks,
move money, or issue a cryptographic Decision Artifact.

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
- Bind mandates to specific buyer, agent, merchant, chain, asset, category, and
  maximum amount.
- Require FIDO2, HSM, KMS, custody, hardware wallet, or smart-account signing
  for payment execution.
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

Sumsub-backed evidence service pricing should be based on normalized evidence
objects, not raw Sumsub endpoints:

- `identity_evidence`: medium
- `risk_evidence`: medium
- `premium_risk_evidence`: premium
- `compliance_evidence`: premium
- `aml_evidence`: premium
- `audit_ops`: enterprise

See [`docs/SUMSUB_EVIDENCE_SERVICES.md`](./docs/SUMSUB_EVIDENCE_SERVICES.md)
for the eight service schemas, error model, demo boundaries, and pricing tiers.

## Non-Goals

- No wallet custody.
- No private key handling.
- No transaction signing.
- No token approval.
- No autonomous money movement.
- No seller-delivery guarantee.
- No live AP2, x402, Sumsub, KYT, or chain-state calls inside the deterministic
  evaluator.
- Sumsub service catalog functions normalize capability/evidence metadata only;
  callers must inject live Sumsub evidence through an approved adapter.

## Enterprise Notes

Production deployments should bind this evaluator to:

- authenticated agent identity
- immutable policy versions
- human approval records
- signed audit logs
- spend ledgers
- x402 payment evidence

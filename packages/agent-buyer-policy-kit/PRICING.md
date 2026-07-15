# Agent Buyer Policy Kit Pricing

Status: DRAFT - Founder review required before public sale
Date: 2026-07-14

## Product Positioning

The product is not just source code. It is an Agent IAM starter module for x402
and agent-runtime buyers.

Core promise:

```text
Before an AI agent buys an API, verify that the buyer role fits the data or
tool being purchased.
```

## Recommended Pricing

### Hosted API

Status: live

Price:

```text
$0.005 per preflight decision
```

Use case:

- x402 buyers
- MCP clients
- lightweight agent runtimes
- wallets or marketplaces checking one purchase at a time

### Developer Kit

Status: draft, not yet public

Recommended first price:

```text
$49 one-time
```

Includes:

- JSON policy pack
- five starter buyer roles
- product category taxonomy
- role x product category matrix
- JavaScript evaluator
- Python evaluator
- tests
- README
- integration notes for x402scan, MCP, and agent runtimes

Why not lower:

- The value is not the code volume; it is the policy pattern and enterprise
  framing.
- Buyers are paying to avoid designing agent-role purchase governance from
  scratch.

Why not much higher yet:

- The kit is still a starter package.
- It does not yet include UI, SSO, audit retention, or approval workflow.

### Self-Hosted Starter

Status: draft

Recommended first price:

```text
$499 one-time
```

Includes:

- Developer Kit
- Cloudflare Worker starter
- MCP adapter
- x402 discovery metadata
- example policy deployment
- local audit log example

### Sumsub Evidence Services Add-On

Status: sandbox draft, not public

Pricing unit:

```text
normalized evidence object
```

Do not price raw Sumsub endpoint calls as standalone products. The value is the
normalized SignGate evidence object that can be bound into a policy decision,
audit trail, and future Decision Artifact evidence digest.

Service tiers:

| Service | Tier |
| --- | --- |
| `sumsub.case_management` | `audit_ops` |
| `sumsub.db_net` | `identity_evidence` |
| `sumsub.kyt` | `risk_evidence` |
| `sumsub.payment_method_crypto` | `risk_evidence` |
| `sumsub.poa` | `identity_evidence` |
| `sumsub.crystal_crypto_risk` | `premium_risk_evidence` |
| `sumsub.travel_rule` | `compliance_evidence` |
| `sumsub.watchlists` | `aml_evidence` |

Recommended packaging:

```text
Sumsub-backed Compliance Evidence Layer
8 service capabilities
sandbox only until production legal/compliance review
```

Do not publish a production compliance claim until the underlying Sumsub plan,
permissions, applicant data handling, PII minimization, and customer contract
are reviewed.

### Enterprise

Status: future

Recommended starting point:

```text
$2,000/month and up
```

Includes:

- internal agent registry
- SSO/IAM integration
- immutable policy versions
- approval workflow
- audit export
- retention controls
- private deployment

## Founder Decision Needed

Before public sale, choose:

1. Developer Kit price: `$29`, `$49`, or `$99`.
2. Whether the first public package is source-available or customer-delivered
   only after x402 payment.
3. Whether to publish to npm or keep distribution through x402 paid delivery.
4. Whether to create a public landing/download page.

Recommended default:

```text
Developer Kit = $49 one-time
Distribution = x402 paid delivery first, npm later
```

Reason:

This avoids rushing into public npm packaging before the positioning, license,
support promise, and update policy are ready.

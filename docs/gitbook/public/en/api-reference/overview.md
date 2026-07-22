---
description: First-release SignGate service allowlist and availability boundaries.
---

# API Reference

The first release organizes six endpoint contracts under five developer-facing services. A page may describe a verified current route, an implemented-but-unverified route, or a proposed candidate; check its availability before integration.

{% hint style="info" %}
Browse and copy safe samples now. Sandbox keys, an isolated sandbox Base URL, and production browser Test it are not verified.
{% endhint %}

## Services

- [Risk Source API](services/risk-source.md) — one candidate Address Risk endpoint; not deployed.
- [Agent Payment Control](services/agent-payment-control.md) — one verified x402 wrapper; price conflict pending.
- [Agentic Commerce Preflight](services/agentic-commerce.md) — one implemented compatibility route; production readiness unverified.
- [Approval & Signer Control](services/approval-signer-control.md) — one candidate endpoint; not deployed.
- [Merchant & x402 Trust](services/merchant-x402-trust.md) — two verified x402 wrappers.

## Contract rule

OpenAPI-generated material never overrides the human-readable availability, authentication, billing, evidence, retry, and security notes. Candidate envelopes are non-binding and are not retrofitted onto current v1 responses.

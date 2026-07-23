---
description: Decide whether an autonomous agent may move value before execution.
---

# Control agent value movement before it happens

SignGate gives agent runtimes, wallets, and payment clients an evidence-backed decision before a sensitive action executes.

{% hint style="info" %}
The current onboarding path is a credential-free safe sample. It does not call production, issue a sandbox key, or charge a payment.
{% endhint %}

[Start with a safe sample](getting-started/quickstart.md) · [Explore API services](api-reference/overview.md) · [Request access](resources/support.md#request-access) · [Contact us](resources/support.md#contact-us)

## Five first-release services

<table data-view="cards">
<thead><tr><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead>
<tbody>
<tr><td><strong>Risk Source API</strong></td><td>Inspect address risk, labels, exposure, behavior, and evidence boundaries.</td><td><a href="api-reference/services/risk-source.md">api-reference/services/risk-source.md</a></td></tr>
<tr><td><strong>Agent Payment Control</strong></td><td>Decide whether an agent payment may proceed, needs review, or must stop.</td><td><a href="api-reference/services/agent-payment-control.md">api-reference/services/agent-payment-control.md</a></td></tr>
<tr><td><strong>Agentic Commerce Preflight</strong></td><td>Evaluate an agent-initiated purchase before execution.</td><td><a href="api-reference/services/agentic-commerce.md">api-reference/services/agentic-commerce.md</a></td></tr>
<tr><td><strong>Approval &amp; Signer Control</strong></td><td>Translate an approved decision into an explicit signer directive.</td><td><a href="api-reference/services/approval-signer-control.md">api-reference/services/approval-signer-control.md</a></td></tr>
<tr><td><strong>Merchant &amp; x402 Trust</strong></td><td>Assess merchant wallets and payment endpoints before purchase.</td><td><a href="api-reference/services/merchant-x402-trust.md">api-reference/services/merchant-x402-trust.md</a></td></tr>
</tbody>
</table>

## Five-minute safe-sample path

1. Open the credential-free sample.
2. View the sample request.
3. Copy the cURL syntax.
4. Inspect the static/sample response.
5. Apply the service's exact decision vocabulary before continuing.

{% hint style="warning" %}
No verified sandbox key issuance flow, isolated sandbox Base URL, or authorized production browser Test it exists today.
{% endhint %}

## Find your next step

[Documentation](documentation/README.md) · [API Reference](api-reference/overview.md) · [Public OpenAPI JSON](../openapi/signgate-public-v0.1.openapi.json) · [Changelog](resources/changelog.md) · [Help Center](help-center/README.md) · [Contact us](resources/support.md#contact-us)

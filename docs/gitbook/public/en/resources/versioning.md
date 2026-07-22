---
description: Integrate against explicit contract and policy versions.
---

# Versioning

Requests declare `contract_version`; responses identify `policy_version` so clients can validate the contract and evaluated policy context.

{% hint style="info" %}
**Primary constraint:** Do not silently accept an unknown contract version.
{% endhint %}

## Contract version

Version `0.1` defines the current preview request and response envelope.

## Policy version

The response policy version must be included unchanged in consume and validated by the executor.

## OpenAPI

The [public OpenAPI 3.1 specification](../../../../openapi/signgate-public-v0.1.openapi.json) is the machine-readable source for public schemas and operations.

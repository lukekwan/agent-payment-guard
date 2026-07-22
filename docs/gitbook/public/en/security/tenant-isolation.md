---
description: Keep decisions and receipts inside the authenticated organization boundary.
---

# Tenant isolation

Every request, decision, and consume lookup is scoped by the credential-associated organization.

{% hint style="info" %}
**Primary constraint:** A body-supplied `organization_id` never overrides authenticated context.
{% endhint %}

## Enforcement

SignGate compares the body organization with the credential organization before accessing tenant-scoped records.

## Non-enumeration

Cross-tenant failures do not reveal whether a decision, request, or receipt exists for another tenant.

## Client design

Use separate credentials and identifiers per organization. Do not proxy an untrusted tenant identifier into a privileged shared credential.

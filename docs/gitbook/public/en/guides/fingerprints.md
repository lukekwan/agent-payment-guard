---
description: Verify that the decision authorizes exactly the action about to execute.
---

# Validate fingerprints

Compute SHA-256 over the RFC 8785 canonical fingerprint envelope for the validated normalized action.

{% hint style="info" %}
**Primary constraint:** Unknown execution-relevant fields or any mismatch must stop execution.
{% endhint %}

## Validation sequence

1. Validate the action schema.
2. Normalize schema-declared set fields.
3. Build the authenticated action envelope.
4. Canonicalize with RFC 8785.
5. Hash UTF-8 bytes with SHA-256.
6. Encode lowercase hex with the `sha256:` prefix.
7. Compare with the response and receipt.

## Mutation rule

Changing any execution field, including a protected-surface flag, invalidates the old fingerprint and decision.

## Testing

Maintain cross-language golden vectors and mutation tests for every execution field.

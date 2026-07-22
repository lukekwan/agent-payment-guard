---
description: Recover from timeouts without creating duplicate logical actions.
---

# Retry safely

Reuse the same identifier only when the body and logical operation are identical.

{% hint style="info" %}
**Primary constraint:** Changing the body requires a new identifier and a new evaluation.
{% endhint %}

## Create retry

Retry `POST /v1/decisions` with the same `request_id` and byte-equivalent semantic content after an ambiguous transport failure.

## Consume retry

Retry consume with the same `execution_attempt_id` to recover the original receipt. Do not generate a new attempt merely because the response was lost.

## Backoff

Use bounded exponential backoff for `503` and transient network errors. Preserve expiry awareness; if the decision expires, create a new decision.

## Conflicts

A `409` is not a generic transient failure. Inspect the error code before deciding whether an identical retry is safe.

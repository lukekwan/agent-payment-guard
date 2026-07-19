---
description: Retry requests without changing their meaning.
---

# Idempotency and retries

Decision creation uses `request_id` within an organization; consume uses `execution_attempt_id` within a decision.

{% hint style="info" %}
**Primary constraint:** Never reuse an idempotency identifier for different content.
{% endhint %}

## Decision creation

An exact duplicate request can return the original logical result. Reusing the same `request_id` with a different payload returns HTTP `409`.

## Consume

A same-attempt retry returns the original receipt. A different attempt after a successful consume returns HTTP `409`.

## Network recovery

After an ambiguous timeout, retry with the same identifier and identical body. Do not mint a new identifier until the previous outcome is known or intentionally abandoned.

## Guide

[Retry safely](../guides/retries.md).

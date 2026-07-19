---
description: Common SignGate integration questions and troubleshooting guidance.
---

# Help Center

## Frequently asked questions

<details open>

<summary>Does HTTP 200 authorize deployment?</summary>

No. HTTP `200` means policy evaluation completed. Execution requires `decision: ALLOW`, exact bound-action verification, and a successful atomic consume receipt.

</details>

<details>

<summary>Can I reuse an ALLOW decision?</summary>

No. `ALLOW` is action-bound, time-limited, and single-use. A retry with the same execution attempt ID returns the original receipt; a different attempt conflicts after consumption.

</details>

<details>

<summary>Why did I receive REQUIRE_APPROVAL?</summary>

The action touches a protected surface such as permissions, DNS, or credential configuration. It is not executable. Obtain a trusted approval grant through the authorized internal workflow, then submit a fresh decision request.

</details>

<details>

<summary>Why is production deployment rejected?</summary>

DOC-SG-001 authorizes preview/local deployment only. Founder policy approval is not Founder Gate 4 and cannot turn a production request into executable `ALLOW`.

</details>

<details>

<summary>Where should credentials be stored?</summary>

Use your authorized secret manager or runtime environment injection. Never put raw keys in repository files, D1 records, logs, screenshots, or support messages.

</details>

## Troubleshooting checklist

- Confirm `Authorization: Bearer <preview-api-key>` is present.
- Confirm `organization_id` matches the credential-bound organization.
- Confirm the credential has `decision:create` or `decision:consume` as appropriate.
- Confirm mandate scope and expiry.
- Confirm CI evidence is passing and bound to the same Git commit.
- Confirm all protected-surface flags are present and accurate.
- Treat every network, validation, persistence, or policy error as non-authorization.

Still blocked? Capture the HTTP status, error `code`, and `request_id` without including credentials or secret material.

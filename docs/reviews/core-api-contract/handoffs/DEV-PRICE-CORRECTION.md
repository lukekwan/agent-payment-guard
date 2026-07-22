# DEV-PRICE-CORRECTION

TASK_TYPE=DEVELOPER_HANDOFF

AUTHORIZATION_STATUS=TASK_PACKAGE_ONLY

TARGET_ENDPOINT=GET /v1/x402/agent/payment-risk-gateway

PM_DECISION=RETURN_TO_DEVELOPER

## Objective

Establish one authoritative Agent Payment price and make billing behavior consistent across runtime registry, machine-readable catalog, README, public documentation, and automated tests.

## Blocking conflict

- Runtime product registry: `$0.15`.
- README: `0.005 USDC`.
- No price may be published while both values remain.

## Required implementation work

1. Identify the actual x402 billing source of truth used for the payment challenge and settlement verification.
2. Obtain product-owner approval for the authoritative amount, currency, asset, chain/network, recipient, and success-only/refund behavior.
3. Update the runtime registry, generated/discovery catalog, README, endpoint docs, OpenAPI description where applicable, and price assertions atomically.
4. Ensure all representations derive from one price constant or one generated source where practical.
5. Preserve the endpoint's lowercase `allow|review|deny` response vocabulary.

This package does not authorize changing the price. A Developer task owner must receive separate runtime-change authorization and the approved price before editing code.

## Required evidence

- Redacted production-like x402 payment challenge showing status, price, currency/asset, network, payee, and relevant headers.
- Successful paid request/response with transaction/payment proof masked, request ID, status, latency, and charged amount.
- Failure evidence for absent, invalid, expired, underpaid, replayed, and wrong-network payment proofs.
- Catalog/README/docs/runtime parity diff.
- Tests proving the challenge and price use the same authoritative value.
- Confirmation that secrets, payment credentials, wallet keys, and reusable proofs are absent from committed evidence.

## Acceptance criteria

- Exactly one approved price appears across runtime, catalog, README, docs, and tests.
- Current x402 challenge and successful paid response match that price.
- Billing retry/replay and success-only charging behavior are documented.
- Existing endpoint request/response contract and decision vocabulary are unchanged unless separately approved.
- Production OpenAPI changes, if needed, receive separate contract approval.

## Out of scope

GitBook sync/publication, sandbox creation, live browser Test it, decision-enum normalization, and unrelated pricing changes.

## Return to PM

Provide the approved price, billing owner, exact changed files, commit SHA, test results, and sanitized challenge/paid-response evidence. PM then decides whether the endpoint can enter the current-contract allowlist.

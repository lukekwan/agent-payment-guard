# Merchant & x402 Trust: endpoints

CONTRACT_STATUS=PROPOSED_CANDIDATE

| Method | Path | Purpose | Availability | Authentication / scope | Billing / price |
|---|---|---|---|---|---|
| `GET` | `/v1/x402/base/merchant-trust` | Assess a Base merchant wallet. | Verified current public x402 wrapper | x402 payment; no API-key/OAuth scope claimed | Verified catalog price 0.03 USDC |
| `GET` | `/v1/x402/web/endpoint-preflight` | Inspect an HTTP(S) endpoint before x402 purchase. | Verified current public x402 wrapper | x402 payment; no API-key/OAuth scope claimed | Verified catalog price 0.005 USDC |

# Agent Payment Control: endpoints

CONTRACT_STATUS=PROPOSED_CANDIDATE

| Method | Path | Purpose | Availability | Authentication / scope | Billing / price |
|---|---|---|---|---|---|
| `GET` | `/v1/x402/agent/payment-risk-gateway` | Evaluate payment intent policy and risk. | Verified current public x402 wrapper | x402 payment; no API-key/OAuth scope claimed | Catalog conflict: runtime and README show 0.15 vs 0.005 USDC; verify before publication |

# Approval & Signer Control: endpoints

CONTRACT_STATUS=PROPOSED_CANDIDATE

| Method | Path | Purpose | Availability | Authentication / scope | Billing / price |
|---|---|---|---|---|---|
| `POST` | `/v1/approval-signer/evaluate` | Derive a signer directive from a bound decision, action, and optional approval. | Candidate; not deployed | TBD; no scope asserted | TBD; no approved price |

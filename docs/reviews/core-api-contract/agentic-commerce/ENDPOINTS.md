# Agentic Commerce Preflight: endpoints

CONTRACT_STATUS=PROPOSED_CANDIDATE

| Method | Path | Purpose | Availability | Authentication / scope | Billing / price |
|---|---|---|---|---|---|
| `POST` | `/v1/agentic-commerce/preflight` | Evaluate agent commerce action before execution. | Implemented, documented non-live/verification-pending | Current code unauthenticated; future auth/scope TBD | No verified billing entry or approved price |

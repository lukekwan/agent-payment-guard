# Nomos x402 Rolling Release Log

## 2026-07-24

Authorized target endpoint count: 10.

Implemented in this rolling pass:

- `POST /x402/v1/value/convert`
- `POST /x402/v1/policy/budget-check`
- `POST /x402/v1/service/health`
- `POST /x402/v1/wallet/identify`
- `POST /x402/v1/wallet/watchlist`
- `POST /x402/v1/wallet/risk-lite`
- `POST /x402/v1/wallet/risk-360`
- `POST /x402/v1/merchant/trust`
- `POST /x402/v1/decision/payment-preflight`
- `POST /x402/v1/service/preflight`

Batch status:

- Batch 1: ready in source and local tests
- Batch 2: ready in source and local tests using derived-only output
- Batch 3: ready in source and local tests using deterministic policy output

Production blocker:

Cloudflare production deployment still requires a valid token accepted by the
Worker account. Temporary staging can expose the current local Worker, but it is
not a stable production origin.

# x402 Evidence

This directory stores validation artifacts for the Nomos x402 rolling catalog.

Current local evidence is produced by:

- `npm test`
- `npm run check`
- local or tunnel probes against `/openapi.json`, `/health`, and
  `/.well-known/x402`

Do not store secrets, payment headers, raw supplier responses, customer data, or
private buyer information here.

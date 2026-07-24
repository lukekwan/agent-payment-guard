# Nomos x402 Runtime Architecture

Status: rolling implementation in `projects/base-agent-preflight`.

## Runtime Boundary

The current runtime is the existing Cloudflare Worker service for
`base-agent-preflight`. It already owns x402 middleware, public discovery, MCP
metadata, OpenAPI generation, and paid route registration.

No changes are made to SignGate canonical contracts, company-os, or the
corporate website. The Nomos endpoints are isolated paid utility surfaces under
`/x402/v1/*` and return provider-neutral normalized outputs only.

## Payment Controls

- Network: Base
- Asset: USDC
- Pricing: fixed per endpoint
- Unpaid access: x402 middleware returns HTTP 402 before route execution
- Paid execution: business logic runs only after middleware verification
- Idempotency: request schemas accept `idempotency_key`; result ids include it
- Replay / duplicate settlement: delegated to the x402 middleware and
  facilitator settlement path
- Runtime metadata: `/openapi.json`, `/health`, `/.well-known/x402`,
  `/.well-known/mcp.json`

## Output Boundary

Wallet risk and merchant trust responses expose only Nomos-derived fields:
normalized score, normalized classification, boolean match, reason codes,
decision, evidence references, and freshness timestamps. Raw supplier responses
and provider names are not exposed.

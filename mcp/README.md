# SignGate MCP Server

This is the first minimal real MCP mount for SignGate. It exposes one tool:

- `evaluate_payment`

The tool calls the existing SignGate Agentic Commerce Preflight endpoint:

```text
POST /v1/agentic-commerce/preflight
```

It does not sign, custody funds, call a wallet, broadcast transactions, or treat
`REQUIRE_APPROVAL` as `ALLOW`.

## Current Scope

Implemented:

- `evaluate_payment`
- stdio MCP server for local clients
- fail-closed behavior for missing credentials, timeout, invalid input,
  upstream errors, and malformed SignGate responses
- Worker `/mcp` JSON-RPC mirror that now calls the real preflight backend

Specification only:

- `audit_seller`: `NOT_IMPLEMENTED`. Seller evidence exists in merchant-trust
  and origin due-diligence endpoints, but there is no dedicated Seller Decision
  Packet backend contract yet.
- `verify_decision_receipt`: `NOT_IMPLEMENTED`. Current public responses are
  Decision Responses. Signed Decision Artifact / receipt signing, public key
  discovery, verification endpoint, key rotation, and revocation are not live.

## Install

```sh
npm install
```

## Configure

Create an environment file or export variables:

```sh
export SIGNGATE_BASE_URL=https://base-agent-preflight.bytoken2023.workers.dev
export SIGNGATE_API_KEY=replace-with-service-credential
export SIGNGATE_TIMEOUT_MS=5000
```

`SIGNGATE_API_KEY` is required. The MCP server refuses anonymous production
access even if the current demo endpoint does not yet enforce that header.

## Local Run

```sh
npm run mcp
```

Transport: stdio.

SDK: `@modelcontextprotocol/sdk@1.29.0`.

Runtime: Node.js ESM.

## Production Run

The current production Worker exposes a small JSON-RPC `/mcp` endpoint and
`/.well-known/mcp.json`. It mirrors `evaluate_payment` against the same backend
decision function. It is not yet the official SDK Streamable HTTP server.

Recommended next production step: add a Streamable HTTP MCP deployment using
the same `mcp/signgate-client.js` helper and enforce service credentials at the
edge.

## Authentication

The local MCP server uses a service credential:

- client sees: MCP tool schema and decision output only
- server stores: `SIGNGATE_API_KEY` in environment, not in config examples
- upstream call sends: `Authorization: Bearer <SIGNGATE_API_KEY>`
- credential missing: fail closed before any network call
- rotation: replace environment value and restart the MCP server

Future production auth should bind delegated agent credentials, buyer identity,
and mandate id before calling the decision endpoint.

## Tool Input

```json
{
  "agent": { "id": "agent.finance.001", "role": "finance_agent" },
  "buyer": { "id": "buyer.acme" },
  "mandate": {
    "id": "mandate-1",
    "type": "payment",
    "status": "active",
    "merchant_domains": ["api.seller.example"],
    "merchant_wallets": ["0x1111111111111111111111111111111111111111"],
    "allowed_categories": ["payment_execution"],
    "max_amount_usdc": "0.05",
    "assets": ["USDC"],
    "chains": ["base"]
  },
  "merchant": {
    "domain": "api.seller.example",
    "wallet": "0x1111111111111111111111111111111111111111",
    "category": "payment_execution",
    "kyt_risk": "low"
  },
  "resource": {
    "id": "seller-resource",
    "url": "https://api.seller.example/v1/x402/report",
    "category": "payment_execution"
  },
  "requested_amount": "0.025",
  "asset": "USDC",
  "network": "base",
  "payment_scheme": "x402",
  "evidence_refs": []
}
```

## Tool Output

The MCP envelope preserves the existing SignGate response under
`signgate_response` and repeats the fields an agent needs:

```json
{
  "schema_version": "signgate.mcp.evaluate_payment.v1",
  "response_kind": "mcp_decision_envelope",
  "decision": "REQUIRE_APPROVAL",
  "decision_id": "dec_...",
  "policy_version": "signgate-agentic-commerce-policy-2026-07-15",
  "request_hash": "sha256:...",
  "reason_codes": ["PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"],
  "signer_directive": {
    "agent_may_directly_sign": false,
    "execution_may_be_agent_initiated": true
  },
  "auto_payment_allowed": false,
  "fail_closed": false
}
```

Only `ALLOW` sets `auto_payment_allowed=true`. `REQUIRE_APPROVAL`, `DENY`, and
all uncertain states stop automatic signer continuation.

## Test

```sh
npm test
```

Covered flows:

- normal `ALLOW`
- `REQUIRE_APPROVAL`
- `DENY`
- timeout
- malformed upstream response
- missing credential

## Operations

See `mcp/RUNBOOK.md` for production discovery URLs, supported JSON-RPC methods,
rollback, and post-closeout backlog.

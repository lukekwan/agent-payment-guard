# SignGate MCP Architecture

## Decision

MCP v1 uses:

- SDK: `@modelcontextprotocol/sdk@1.29.0`
- language/runtime: JavaScript on Node.js ESM
- local transport: stdio
- production mirror: existing Worker JSON-RPC `/mcp`

Stdio is the first target because Claude Desktop and generic local MCP clients
can mount it without adding a new hosted runtime. The production Worker mirror
keeps discovery honest by exposing only the real `evaluate_payment` tool, but it
is not yet the final Streamable HTTP MCP deployment.

## Data Flow

```text
MCP client
-> evaluate_payment
-> local MCP server
-> POST /v1/agentic-commerce/preflight
-> SignGate decision response
-> MCP decision envelope
-> external wallet/signer decides whether to continue
```

The MCP server does not call a signer. It does not hold private keys. It does
not broadcast transactions.

## Existing Backend Mapping

`evaluate_payment` maps directly to the existing endpoint:

- method: `POST`
- path: `/v1/agentic-commerce/preflight`
- response kind: `decision_response`
- decisions: `ALLOW`, `REQUIRE_APPROVAL`, `DENY`
- signer control: `signer_directive`

The wrapper maps MCP input into the existing fields:

- `agent.id` -> `agent_id`
- `agent.role` -> `agent_role`
- `buyer.id` -> `buyer_id`
- `resource.category` -> `product_category`
- `requested_amount` -> `amount_usdc`
- `network` -> `chain`
- `payment_scheme` -> `payment.scheme`
- `merchant` and `mandate` pass through with compatibility defaults

## Authentication Boundary

The MCP server requires `SIGNGATE_API_KEY`. It sends the credential only to
SignGate as a bearer token. Examples never embed real secrets.

Credential missing behavior: fail closed before network access.

Rotation: update the environment variable and restart the server.

Future production hardening should enforce the same credential at the SignGate
edge and bind it to buyer, agent, and mandate claims.

## Conditional Tools

`audit_seller` is not mounted in v1 because there is not yet a dedicated Seller
Decision Packet backend contract. Existing merchant-trust and origin
due-diligence endpoints can become evidence providers.

`verify_decision_receipt` is not mounted in v1 because signed receipt production
is not implemented. The existing `SG-MVP-003-decision-artifact-v0.md` is a
design draft, not a live production receipt system.


# SignGate MCP Threat Model

## Assets

- SignGate service credential
- buyer, agent, mandate, merchant, and resource intent data
- decision response and signer directive
- downstream wallet/signer safety

## Trust Boundaries

- MCP client is not trusted to self-authorize payment.
- MCP server is trusted to call SignGate and fail closed.
- SignGate decides policy.
- External wallet/signer is responsible for execution.

## Non-Goals

- No private key custody.
- No production signer calls.
- No chain transaction broadcast.
- No funds held by the MCP server.
- No automatic conversion of `REQUIRE_APPROVAL` into `ALLOW`.

## Failure Handling

Fail closed for:

- missing credential
- invalid input
- unsupported or malformed upstream response
- timeout
- upstream HTTP error
- unavailable policy or evidence
- expired decision
- MCP transport error

`ALLOW` is the only decision that may let a mock signer continue. The server
still returns `agent_may_directly_sign=false` when SignGate says the signer must
stay outside the agent.

## Main Risks

- A client ignores `signer_directive` and pays anyway.
- A service credential leaks from local MCP config.
- Production endpoint accepts anonymous requests while MCP assumes service auth.
- A malformed SignGate response is accidentally treated as allow.
- A future receipt verifier is exposed before signing and key management are
implemented.

## Mitigations

- MCP output includes `auto_payment_allowed=false` for all non-ALLOW decisions.
- Missing credentials stop before network access.
- Response schema validation rejects unknown decisions.
- `verify_decision_receipt` remains unmounted until signing, key discovery,
rotation, revocation, and replay protection exist.
- Examples keep secrets in environment variables.


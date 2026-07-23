# SignGate MCP v0.1 Runbook

## Local stdio MCP

Install:

```sh
npm install
```

Required environment variables:

```sh
SIGNGATE_BASE_URL=https://base-agent-preflight.bytoken2023.workers.dev
SIGNGATE_API_KEY=replace-with-service-credential
SIGNGATE_TIMEOUT_MS=5000
```

Start:

```sh
npm run mcp
```

Claude-style client configuration:

```json
{
  "mcpServers": {
    "signgate": {
      "command": "node",
      "args": ["/absolute/path/to/projects/base-agent-preflight/mcp/server.js"],
      "env": {
        "SIGNGATE_BASE_URL": "https://base-agent-preflight.bytoken2023.workers.dev",
        "SIGNGATE_API_KEY": "replace-with-service-credential",
        "SIGNGATE_TIMEOUT_MS": "5000"
      }
    }
  }
}
```

Test:

```sh
npm run check
```

## Production Worker Mirror

Discovery URL:

```text
https://base-agent-preflight.bytoken2023.workers.dev/.well-known/mcp.json
```

MCP URL:

```text
https://base-agent-preflight.bytoken2023.workers.dev/mcp
```

Supported JSON-RPC methods:

- `initialize`
- `tools/list`
- `tools/call`

Supported tool:

- `evaluate_payment`

Limitations:

- Worker `/mcp` is a JSON-RPC mirror, not the SDK Streamable HTTP server.
- Edge-enforced backend auth is not implemented.
- No signer, wallet, custody, or chain transaction integration.
- `audit_seller` and `verify_decision_receipt` are not exposed.

## Rollback

Rollback target before MCP v0.1:

```text
fcae0894-818c-4e40-9942-de96ae25e827
```

List versions:

```sh
npx wrangler versions list --name base-agent-preflight
```

Deploy a rollback version through Wrangler's rollback/version deployment flow,
or redeploy the previous commit/source state if direct version rollback is not
available in the installed Wrangler command set.

After rollback, verify:

```sh
curl -fsS 'https://base-agent-preflight.bytoken2023.workers.dev/.well-known/mcp.json?cb=rollback' | jq .
curl -fsS 'https://base-agent-preflight.bytoken2023.workers.dev/.well-known/x402?cb=rollback' | jq '{resources:(.resources|length), operation_count, paid_operations:(.paid_operations|length)}'
curl -fsS 'https://base-agent-preflight.bytoken2023.workers.dev/catalog.json?cb=rollback' | jq '{product_families, paid_operations_observed_on_x402scan}'
curl -fsS 'https://base-agent-preflight.bytoken2023.workers.dev/registry.json?cb=rollback' | jq '.counts'
```

Expected x402 regression values after either normal deploy or rollback:

- product_families: 103
- paid_operations: 105
- .well-known/x402 operation_count: 105

To remove `evaluate_payment` discovery without rolling back all source changes:

1. Remove `evaluate_payment` from `/.well-known/mcp.json`.
2. Return `/mcp tools/list` without `evaluate_payment`.
3. Run `npm run check`.
4. Deploy.
5. Verify `/.well-known/x402`, `catalog.json`, and `registry.json` counts are
   unchanged.

## Backlog

1. Edge-enforced backend authentication
   - Priority: P0
   - Dependency: service credential policy and deployment secret plan
   - Acceptance criteria: unauthenticated `/v1/agentic-commerce/preflight`
     production calls fail closed; MCP credential works; tests cover 401.
   - Why not now: v0.1 scope is MCP mount closeout only.

2. Per-credential rate limiting
   - Priority: P1
   - Dependency: credential identity and storage model
   - Acceptance criteria: limits enforced per credential with audit fields and
     fail-closed behavior.
   - Why not now: requires auth foundation first.

3. Streamable HTTP MCP server
   - Priority: P1
   - Dependency: production MCP hosting decision
   - Acceptance criteria: SDK Streamable HTTP transport deployed and smoke
     tested with generic MCP client.
   - Why not now: stdio + Worker mirror is enough for v0.1 integration.

4. Seller Decision Packet backend
   - Priority: P1
   - Dependency: seller identity, wallet/domain consistency, evidence, and
     liability boundary.
   - Acceptance criteria: backend returns seller payment decision contract with
     confidence, reason codes, evidence references, and expiry.
   - Why not now: no dedicated backend contract exists.

5. Signed Decision Receipt infrastructure
   - Priority: P1
   - Dependency: canonicalization, signing keys, public key discovery, rotation,
     revocation, replay protection.
   - Acceptance criteria: `/v1/receipts/verify`, offline verifier, fixtures, and
     negative tests.
   - Why not now: current response is not a cryptographic receipt.

6. Signer enforcement
   - Priority: P2
   - Dependency: signed decision receipt and verifier
   - Acceptance criteria: mock/reference signer rejects DENY, REQUIRE_APPROVAL,
     expired, tampered, and wrong-request artifacts.
   - Why not now: verifier infrastructure must come first.

7. Wallet / chain transaction integration
   - Priority: P3
   - Dependency: signer enforcement and Founder approval
   - Acceptance criteria: integration uses signer directive and never exposes
     private keys to agents.
   - Why not now: explicitly out of v0.1 scope.

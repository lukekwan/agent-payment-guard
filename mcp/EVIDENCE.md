# SignGate MCP Evidence Report

Date: 2026-07-16

Production deployment:

- Worker version: `1bd6dfed-947c-422a-8248-c292f2e2e4e0`
- Deployment timestamp: `2026-07-16T10:26:20.118Z`
- URL: `https://base-agent-preflight.bytoken2023.workers.dev`
- Rollback target: `fcae0894-818c-4e40-9942-de96ae25e827`

Repository evidence:

- Base commit before MCP working-tree changes:
  `dbf2b9703a94d03ca08b517e9f3c03fc7e7e018e`
- Final closeout commit: recorded by `git rev-parse HEAD` after commit. This
  file cannot contain the hash of the commit that contains it without changing
  that hash.
- Modified tracked files:
  - `package-lock.json`
  - `package.json`
  - `src/index.js`
  - `test/index.test.js`
- Added files:
  - `mcp/.env.example`
  - `mcp/ARCHITECTURE.md`
  - `mcp/EVIDENCE.md`
  - `mcp/NOT_IMPLEMENTED_TOOLS.md`
  - `mcp/RUNBOOK.md`
  - `mcp/README.md`
  - `mcp/THREAT_MODEL.md`
  - `mcp/examples/claude-desktop-config.json`
  - `mcp/examples/generic-mcp-client.mjs`
  - `mcp/examples/openai-compatible-agent.mjs`
  - `mcp/server.js`
  - `mcp/signgate-client.js`
  - `test/mcp.test.js`

## Existing Capability Inventory

### Agentic Commerce Preflight

- method: `POST`
- path: `/v1/agentic-commerce/preflight`
- source: `src/index.js`
- route evidence: `src/index.js` handles this path and calls
  `buildAgenticCommercePreflight(input)`
- schema evidence: OpenAPI builder documents the same path and request body
- tests: `test/index.test.js` checks the route returns
  `agentic_commerce_preflight_result.v1`, `decision_response`, and
  `signer_directive`
- auth: current route has `security: []` in OpenAPI; MCP server therefore
  requires a service credential locally and sends it as bearer auth, but edge
  enforcement remains a follow-up task
- timeout: MCP client default `SIGNGATE_TIMEOUT_MS=5000`
- rate limit: no route-level rate limit found in repo
- response schema: existing response includes `decision`, `decision_id`,
  `policy_version`, `agent`, `buyer`, `mandate`, `merchant`, `resource`,
  `reason_codes`, `evidence`, `signer_directive`, and `decision_artifact`
- error schema: route returns `{ error, message }` with HTTP 400 on invalid JSON

### Payment Guard Evaluate

- method: `POST`
- path: `/v1/x402/payment-guard/evaluate`
- source: `src/index.js`
- capability: paid x402 Payment Guard evaluation with policy, budget, replay,
  and evidence checks
- not used for MCP v1 because it is an x402-paid endpoint and current MCP v1
  needs a direct pre-signing decision tool, not an endpoint pointer

### Seller Audit

- existing related evidence endpoints: merchant-trust and x402 origin
  due-diligence
- dedicated Seller Decision Packet backend: not found
- v1 status: `NOT_IMPLEMENTED`

### Decision Receipt Verification

- receipt schema: design draft only in `specs/SG-MVP-003-decision-artifact-v0.md`
- signing logic: Payment Guard has HMAC-style decision token tests, but not the
  public signed receipt system requested for `verify_decision_receipt`
- public key discovery: not found
- verification endpoint: not found
- key rotation/revocation: not found
- v1 status: `NOT_IMPLEMENTED`

## Implemented Files

- `mcp/server.js`
- `mcp/signgate-client.js`
- `mcp/.env.example`
- `mcp/README.md`
- `mcp/ARCHITECTURE.md`
- `mcp/THREAT_MODEL.md`
- `mcp/NOT_IMPLEMENTED_TOOLS.md`
- `mcp/RUNBOOK.md`
- `mcp/examples/claude-desktop-config.json`
- `mcp/examples/openai-compatible-agent.mjs`
- `mcp/examples/generic-mcp-client.mjs`
- `test/mcp.test.js`

## Verification Commands

```sh
npm install @modelcontextprotocol/sdk@1.29.0
node --check mcp/server.js
node --check mcp/signgate-client.js
node --check mcp/examples/generic-mcp-client.mjs
node --check mcp/examples/openai-compatible-agent.mjs
npm test
npm run check
npx wrangler deploy --dry-run
npm run deploy
curl -fsS --max-time 10 'https://base-agent-preflight.bytoken2023.workers.dev/.well-known/mcp.json?cb=202607161845' | jq '{name, tools}'
curl -fsS --max-time 10 'https://base-agent-preflight.bytoken2023.workers.dev/mcp?cb=202607161845' -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | map(.name)'
curl -fsS --max-time 10 'https://base-agent-preflight.bytoken2023.workers.dev/.well-known/x402?cb=202607161845' | jq '{resources:(.resources|length), operation_count, paid_operations:(.paid_operations|length)}'
curl -fsS --max-time 10 'https://base-agent-preflight.bytoken2023.workers.dev/catalog.json?cb=closeout-1' | jq '{product_families, paid_operations_observed_on_x402scan}'
curl -fsS --max-time 10 'https://base-agent-preflight.bytoken2023.workers.dev/registry.json?cb=closeout-1' | jq '.counts'
```

## Test Output Summary

`npm run check`:

```text
node --check src/index.js && node --test
tests 51
pass 51
fail 0
```

Notable MCP tests:

- `normal ALLOW returns signer directive and permits only mock continuation`
- `REQUIRE_APPROVAL fail-stops automatic signer continuation`
- `DENY fail-stops automatic signer continuation`
- `timeout returns fail-closed DENY through MCP helper`
- `malformed upstream response returns fail-closed DENY`
- `missing credential rejects before any production call`

## Sample MCP Invocation

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "evaluate_payment",
    "arguments": {
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
  }
}
```

## Sample Production SignGate Response

Production `/mcp?cb=202607161847` returned:

```json
{
  "decision": "REQUIRE_APPROVAL",
  "reason_codes": [
    "ROLE_PRODUCT_CATEGORY_APPROVAL_REQUIRED",
    "PAYMENT_EXECUTION_REQUIRES_APPROVAL",
    "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
  ],
  "signer_directive": {
    "required": true,
    "mode": "human_fido2_or_controlled_signer",
    "agent_may_directly_sign": false,
    "execution_may_be_agent_initiated": true,
    "signer_isolation_required": true,
    "required_signer": {
      "mode": "out_of_agent",
      "allowed_classes": [
        "human_fido2",
        "hsm",
        "kms",
        "custody",
        "smart_account_module"
      ]
    },
    "reason_code": "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER"
  },
  "decision_artifact": {
    "issued": false,
    "status": "not_cryptographically_signed",
    "note": "Decision Artifact is a future signed object with request, policy, mandate, and evidence digests."
  }
}
```

## Acceptance Evidence

- `evaluate_payment` calls a real backend path through `mcp/signgate-client.js`.
- `REQUIRE_APPROVAL` and `DENY` do not allow mock signer continuation.
- Timeout and malformed upstream responses return fail-closed `DENY`.
- Missing credentials reject before any network call.
- Existing Worker MCP discovery now exposes only `evaluate_payment`.
- Production `/.well-known/mcp.json?cb=202607161845` returns
  `tools=["evaluate_payment"]`.
- Production `/mcp?cb=202607161845` `tools/list` returns only
  `evaluate_payment`.
- Production `/mcp?cb=202607161847` `tools/call evaluate_payment` returned
  `response_kind=decision_response`, `decision=REQUIRE_APPROVAL`,
  `signer_directive.agent_may_directly_sign=false`.
- Production counts remained unchanged after deploy:
  `.well-known/x402 resources=73`, `operation_count=75`,
  `paid_operations=75`; `catalog.product_families=73`,
  `catalog.paid_operations_observed_on_x402scan=75`.

## Product Status

### evaluate_payment

- Implementation: `COMPLETE`
- Tests: `PASS`
- Production deployment: `DEPLOYED`
- Functional verification: `VERIFIED`
- MCP discovery: `VERIFIED`
- Fail-closed wrapper: `VERIFIED`
- Edge-enforced backend auth: `NOT_IMPLEMENTED`
- Streamable HTTP SDK server: `NOT_IMPLEMENTED`
- Signer enforcement: `NOT_IMPLEMENTED`

### audit_seller

- Status: `BLOCKED`
- MCP exposure: `NOT_EXPOSED`
- Reason: no dedicated Seller Decision Packet backend contract.

### verify_decision_receipt

- Status: `BLOCKED`
- MCP exposure: `NOT_EXPOSED`
- Reason: signed receipt, key discovery, verification, rotation, revocation,
  and replay protection are not implemented.

Overall classification:

- `DEPLOYED`
- `FUNCTIONALLY_VERIFIED`
- `INTEGRATION_READY`
- `SECURITY_HARDENING_PENDING`
- `NOT_SIGNER_ENFORCED`
- `NOT_PRODUCTION_AUTHORIZATION_READY`

## Rollback Procedure

Rollback target: `fcae0894-818c-4e40-9942-de96ae25e827`.

1. List Worker versions: `npx wrangler versions list --name base-agent-preflight`.
2. Roll back through Wrangler's version rollback/deployment flow, or redeploy
   the previous source state if direct version rollback is unavailable.
3. Verify `/.well-known/mcp.json` no longer exposes unwanted tools, depending
   on desired rollback state.
4. Verify `/.well-known/x402`, `catalog.json`, and `registry.json` still report
   `73/75/75`.
5. Run a live `/mcp tools/list` smoke test and cache-bust the URL.

## Known Limitations

- The final closeout commit hash is recorded in the closeout report rather than
  embedded self-referentially in this file.
- Production `POST /v1/agentic-commerce/preflight` currently documents
  `security: []`; MCP requires `SIGNGATE_API_KEY`, but edge enforcement remains
  a follow-up.
- Production `/mcp` is a Worker JSON-RPC mirror, not yet the official SDK
  Streamable HTTP server.
- `audit_seller` is not mounted because Seller Decision Packet backend is not
  implemented.
- `verify_decision_receipt` is not mounted because signed receipt, public key
  discovery, verification endpoint, rotation, revocation, and replay protection
  are not implemented.
- `/mcp` is intentionally hidden from OpenAPI marketplace paths; discovery is
  through `/.well-known/mcp.json`.

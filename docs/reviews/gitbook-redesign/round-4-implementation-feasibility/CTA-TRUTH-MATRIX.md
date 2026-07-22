# CTA truth matrix

No CTA may imply an available sandbox credential, sandbox Base URL, public SDK release, MCP production authority, or browser-safe paid execution until independently verified.

## Status definitions

- `AVAILABLE_NOW`: a safe public documentation/contact action works today.
- `SAMPLE_ONLY`: opens a deterministic or static sample; it is not sandbox execution.
- `SANDBOX_BLOCKED`: cannot work until sandbox endpoint and credential issuance exist.
- `PRODUCTION_RESTRICTED`: capability exists in code or production context, but public package/auth/safety authority is incomplete.
- `FUTURE`: planned portal action has no approved destination yet.

## Matrix

| Proposed CTA | Classification | Safe destination / behavior | Required copy guardrail |
|---|---|---|---|
| Get started | `AVAILABLE_NOW` | Documentation quickstart that begins with the safe sample. | Render as **Start with a safe sample**; never “get a sandbox key.” |
| View sample | `SAMPLE_ONLY` | `GET /v1/agentic-commerce/preflight/sample` or a clearly labeled captured response. | Display **SAMPLE RESPONSE / NO LIVE REQUEST SENT** and `environment=sample`. |
| Test API | `SANDBOX_BLOCKED` | Disabled control or implementation-gap notice. | No active request button; do not reuse a production x402 operation. |
| Get API key | `SANDBOX_BLOCKED` | Disabled until issuance, scope, expiry, rotation, revocation, and sandbox use are verified. | Do not collect credentials through an improvised form. |
| Request sandbox access | `FUTURE` | No approved request or provisioning workflow exists. | May appear in a roadmap only, not as an active CTA. |
| Run in sandbox | `SANDBOX_BLOCKED` | Disabled. | A sample endpoint must not be called a sandbox. |
| View API Reference | `FUTURE` | Will link to the approved-public-only reference after implementation authorization. | The current candidate-focused public reference is not the target destination. |
| Install SDK | `PRODUCTION_RESTRICTED` | Status/documentation page only. | Do not show an install command until package name, registry, version, supported routes, and auth are approved. |
| Use MCP | `PRODUCTION_RESTRICTED` | Status/documentation page only. | Discovery/tool code is not proof of public production execution authority. |
| Contact support | `AVAILABLE_NOW` | Public SignGate contact surface; no guaranteed SLA. | Ask for request ID, environment, endpoint, HTTP status, and timestamp; prohibit secrets/private keys. |

## Counts

`AVAILABLE_NOW_CTAS=2` — Get started; Contact support
`SAMPLE_ONLY_CTAS=1` — View sample
`SANDBOX_BLOCKED_CTAS=3` — Test API; Get API key; Run in sandbox
`PRODUCTION_RESTRICTED_CTAS=2` — Install SDK; Use MCP
`FUTURE_CTAS=2` — Request sandbox access; View API Reference

The Approval & Signer Control Home card may additionally use **Understand signer directives** as an available documentation link. It is not one of the ten required CTA rows and must not imply an executable approval endpoint.

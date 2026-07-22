# Free-plan navigation map

## One-site hierarchy

- Home
  - Start with a safe sample
  - Explore API services
- Documentation
  - Quickstart
  - Authentication
  - Decision model
  - Mandates and evidence
  - Errors
  - Security
- API Reference
  - Risk Source API
  - Agent Payment Control
  - Agentic Commerce Preflight
  - Approval & Signer Control
  - Merchant & x402 Trust
- Changelog
- Help Center
  - API status
  - Contact support
- Language
  - Traditional Chinese status/landing

## Endpoint allowlist

| Service | First-release endpoints |
|---|---|
| Risk Source API | POST /v1/risk-source/address-risk — candidate, not deployed |
| Agent Payment Control | GET /v1/x402/agent/payment-risk-gateway — current x402 |
| Agentic Commerce Preflight | POST /v1/agentic-commerce/preflight — implemented, readiness unverified |
| Approval & Signer Control | POST /v1/approval-signer/evaluate — candidate, not deployed |
| Merchant & x402 Trust | GET /v1/x402/base/merchant-trust; GET /v1/x402/web/endpoint-preflight — current x402 |

Native top navigation and separate native sidebars are unavailable without Sections. Group headings plus landing cards are the free-plan implementation.

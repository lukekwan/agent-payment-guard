# Agentic Commerce Preflight

Evaluate a purchase before execution and return `ALLOW`, `REQUIRE_APPROVAL`, or `DENY` plus a signer directive.

## First-release endpoint

`POST /v1/agentic-commerce/preflight` — implemented compatibility route, but public production readiness and billing remain unverified.

The credential-free GET sample is the safe onboarding surface; it does not execute a live request.

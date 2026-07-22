# QA-PUBLIC-ENDPOINT-VERIFICATION

TASK_TYPE=QA_HANDOFF

AUTHORIZATION_STATUS=VERIFICATION_PACKAGE_ONLY

## Approved current-contract candidates for verification

- `GET /v1/x402/base/merchant-trust` — catalog value `0.03 USDC`.
- `GET /v1/x402/web/endpoint-preflight` — catalog value `0.005 USDC`.

PM_DECISION=APPROVE_CURRENT_CONTRACT

Publication remains blocked until this package passes. This document does not itself authorize paid production calls; QA must use an approved account, budget, target, and evidence-retention procedure.

## Shared verification matrix

For each endpoint capture:

- request method, complete URL with sensitive query values redacted, timestamp, environment, and client version;
- initial x402 challenge status and headers;
- advertised amount, currency/asset, network, payee, expiry, and payment protocol version;
- successful paid status, response body, request ID, latency, charged amount, and reusable proof masking;
- absent, invalid, expired, underpaid, replayed, and wrong-network payment outcomes;
- current error body/schema for invalid request, payment failure, upstream failure, rate limit, and unavailable evidence;
- rate-limit headers, Retry-After behavior, window/burst observations, and whether paid retries can double-charge;
- documentation wording compared with observed behavior.

Do not commit API keys, wallet/private keys, cookies, authorization headers, payment signatures, transaction credentials, reusable payment proofs, or sensitive target data.

## Merchant Trust-specific checks

- Verify the production challenge and successful charge equal `0.03 USDC`.
- Test valid and malformed Base addresses and document checksum/case behavior.
- Capture actual response fields, evidence timestamps, limitations, and freshness semantics.
- Confirm the response does not claim wallet ownership or identity proof.

## Endpoint Preflight-specific checks

- Verify the production challenge and successful charge equal `0.005 USDC`.
- Test valid HTTP/HTTPS URLs and invalid schemes without targeting internal, private, link-local, metadata, localhost, or unauthorized systems.
- Complete SSRF review for DNS rebinding, redirects to private ranges, encoded/IPv6 hosts, credential-bearing URLs, port restrictions, response size/time limits, and redirect count.
- Document redirect policy and verify blocked targets fail closed without leaking network details.

## Pass criteria

- Production request/response evidence is reproducible and sanitized.
- Both observed prices match the approved catalog values.
- x402 challenge, paid success, error, retry, and replay behavior are documented.
- Rate-limit behavior is observed or explicitly escalated as unavailable; it is not invented.
- Endpoint Preflight security review has no unresolved critical/high SSRF or redirect issue.
- Public wording matches the observed contract and avoids sandbox/Test it claims.

## Failure and escalation

Any price mismatch, undocumented charge, double charge, response-schema drift, missing evidence timestamp, unsafe redirect/SSRF result, credential exposure, or ambiguous rate-limit behavior blocks publication and returns the endpoint to Developer/Security review.

## Return to PM

Provide sanitized evidence paths, exact verification time, target environment, test result per matrix row, unresolved risks, and a release recommendation for each endpoint separately.

# SignGate x402 Pricing Experiment V1 Report

## Status

PRICING_CHANGE_STATUS=LOCAL_COMPLETE
BUNDLE_STATUS=LOCAL_COMPLETE
PURCHASE_ANALYTICS_STATUS=LOCAL_COMPLETE_WITH_MIGRATION
ADMIN_SECURITY_STATUS=LOCAL_COMPLETE_PRODUCTION_SECRET_ROTATION_NOT_DEPLOYED
PUBLIC_SURFACE_SYNC_STATUS=LOCAL_COMPLETE_NOT_PRODUCTION_DEPLOYED
DEPLOYMENT_STATUS=NOT_DEPLOYED

Pricing version: `x402-pricing-v1-20260720`

## Changed Files

- `src/index.js`: pricing version, repriced product catalog, new bundle endpoint, purchase attribution fields, admin purchases security and analytics.
- `migrations/0009_x402_pricing_v1_purchase_analytics.sql`: D1 purchase analytics schema extension.
- `test/index.test.js`: pricing, bundle, discovery, and admin security tests.
- `README.md`: admin auth and public price surface updates.
- `AI_BUYER_CATALOG.md`: public catalog price surface updates.

## Price Diff

| operation_id | old_price | new_price | pricing_version |
| --- | ---: | ---: | --- |
| npm-package-preflight | 0.005 | 0.015 | x402-pricing-v1-20260720 |
| github-repository-health | 0.005 | 0.020 | x402-pricing-v1-20260720 |
| a2a-agent-card-preflight | 0.005 | 0.020 | x402-pricing-v1-20260720 |
| openapi-spec-preflight | 0.005 | 0.015 | x402-pricing-v1-20260720 |
| domain-trust-preflight | 0.005 | 0.015 | x402-pricing-v1-20260720 |
| x402-endpoint-preflight | 0.005 | 0.015 | x402-pricing-v1-20260720 |
| wallet-counterparty | OPERATION_NOT_FOUND | OPERATION_NOT_FOUND | n/a |
| base-wallet-counterparty | 0.005 | 0.020 | x402-pricing-v1-20260720 |
| base-wallet-activity-delta | 0.010 | 0.030 | x402-pricing-v1-20260720 |
| base-payment-proof | 0.010 | 0.030 | x402-pricing-v1-20260720 |
| base-token-preflight | 0.020 | 0.075 | x402-pricing-v1-20260720 |
| base-address-preflight | 0.020 | 0.075 | x402-pricing-v1-20260720 |
| x402-merchant-trust | 0.030 | 0.100 | x402-pricing-v1-20260720 |
| agent-capability-security-preflight | NEW_BUNDLE | 0.100 | x402-pricing-v1-20260720 |

## Operation Inventory

- FOUND/UPDATED: npm-package-preflight, github-repository-health, a2a-agent-card-preflight, openapi-spec-preflight, domain-trust-preflight, x402-endpoint-preflight, base-wallet-counterparty, base-wallet-activity-delta, base-payment-proof, base-token-preflight, base-address-preflight, x402-merchant-trust.
- NOT_FOUND: wallet-counterparty as an operation ID. The existing canonical operation ID for `/v1/x402/base/wallet-counterparty` is `base-wallet-counterparty`.
- NEW_BUNDLE: agent-capability-security-preflight.
- UNCHANGED LOW-PRICE DISCOVERY: gas fee quote, nonce readiness, USDC receipt, balance lookup, contract verification, event log monitor, URL/feed discovery, and other commodity endpoints.

## Test Evidence

- Command: `npm run check`
- Result: 58 tests passed, 0 failed.
- Pricing test verifies exact 6-decimal x402 amounts, including 0.075 -> `75000` and 0.100 -> `100000`.
- Bundle tests cover ALLOW, REVIEW, DENY, unavailable provider handling, stable reason codes, and no secret-bearing evidence.
- Admin security test verifies query token rejection, 401, `Cache-Control: no-store`, CSP, and `X-Robots-Tag: noindex`.
- Catalog/registry/.well-known local sample:
  - catalog product_families: 74
  - registry product_families: 74
  - `.well-known/x402` resources: 74
  - `.well-known/x402` paid operations: 76

## Security Evidence

- Permanent query-string admin token support was removed.
- Admin access now requires `Authorization: Bearer` with `ADMIN_DASHBOARD_TOKEN_V2`.
- Admin responses set `Cache-Control: no-store`, restrictive CSP, `X-Robots-Tag: noindex, nofollow`, and `Referrer-Policy: no-referrer`.
- Public admin credential is not present in source; production secret rotation still requires a Worker secret update outside this local-only change.

## Deployment

LOCAL_ONLY. No production deploy, production D1 migration, production credential rotation, GitBook publication, or x402scan/registry production refresh was performed.

## Blockers To COMPLETE

- Production `ADMIN_DASHBOARD_TOKEN_V2` must be set and the old production admin token retired.
- D1 migration `0009_x402_pricing_v1_purchase_analytics.sql` must be applied before production traffic uses the new purchase analytics columns.
- Production deployment and external public surface refresh are intentionally not performed in this run.

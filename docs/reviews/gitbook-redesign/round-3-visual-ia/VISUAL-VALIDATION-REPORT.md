# Visual Validation Report

**Validation date:** 2026-07-22  
**Target:** local static proposal at `round-3-visual-ia/mockup/`  
**Environment:** localhost only; no GitBook/public deployment  
**Result:** `VISUAL_PROPOSAL_VALIDATION=PASS`

## Corrected evidence set

| View | Evidence | Captured size | Result |
|---|---|---:|---|
| Home desktop | [desktop-home.png](screenshots/desktop-home.png) | 1410×980 | Pass — Hero followed immediately by exactly four service cards; catalog visible in first viewport. |
| Home Traditional Chinese | [traditional-chinese-home.png](screenshots/traditional-chinese-home.png) | 1410×980 | Pass — natural headline with explicit line break; no split “行動.” |
| Home mobile | [mobile-home.png](screenshots/mobile-home.png) | 375×812 | Pass — hero, primary actions, service heading, and part of first card visible; no horizontal overflow. |
| Documentation quickstart | [desktop-documentation.png](screenshots/desktop-documentation.png) | 1410×1578 | Pass — five sample-first steps and cURL/JavaScript/Python tabs; sandbox shown only as later. |
| Full endpoint API Reference | [full-endpoint-api-reference.png](screenshots/full-endpoint-api-reference.png) | 1425×990 | Pass — complete two-column endpoint layout with separate service-family sidebar. |
| Changelog | [changelog.png](screenshots/changelog.png) | 1425×990 | Pass — illustrative external product changes only; no internal documentation events. |
| Help Center | [help-center.png](screenshots/help-center.png) | 1410×1400 | Pass — SignGate decision, signer, evidence, billing, and verification questions are prominent. |
| Contrast / accessibility | [contrast-accessibility.png](screenshots/contrast-accessibility.png) | 1410×1151 | Pass — six corrected token pairs exceed WCAG AA and AAA normal-text thresholds. |

No duplicate English Home screenshot is included in the corrected evidence set. `desktop-home.png` is the English reference.

## Contrast evidence

Ratios use the WCAG relative-luminance formula for the exact foreground/background pairs rendered by the evidence page.

| Use | Pair | Ratio | Result |
|---|---|---:|---|
| Primary text | `#F3F7F7` on `#070A0C` | 18.40:1 | AAA |
| Secondary text | `#AFBEC3` on `#070A0C` | 10.38:1 | AAA |
| Metadata / inactive navigation | `#91A2A8` on `#070A0C` | 7.50:1 | AAA |
| Link / active | `#5EEAD4` on `#070A0C` | 13.42:1 | AAA |
| Warning | `#F4C95D` on `#17150D` | 11.62:1 | AAA |
| Danger | `#FF8EA0` on `#1A1013` | 8.54:1 | AAA |

These mathematical results validate the local tokens, not final GitBook anti-aliasing, font weight, focus treatment, or component rendering. Native GitBook must be retested in a draft.

## Corrected content assertions

- Desktop Home keeps all five top destinations and places exactly four service cards directly below the Hero.
- The safe sample follows the service catalog and visibly states `SAMPLE RESPONSE` and `NO LIVE REQUEST SENT`.
- The sample panel shows endpoint, `environment=sample`, Copy, an HTTP 200 example, and `request_id: not returned`; it does not fabricate a current request ID.
- Response tabs are Response, Request, and cURL. The panel does not resemble a functioning sandbox.
- Quickstart is: choose a safe sample; set the sample Base URL; send the sample request; inspect the response; select the production integration path.
- The endpoint page shows method/path, summary, availability, auth, price, rate-limit status, parameters, request body, response schema, success/error examples, cURL/JavaScript/Python tabs, Copy, retry, security, related guides, and disabled Test it status.
- Changelog examples are explicitly illustrative external product changes and contain date, type, affected product/endpoint, breaking status, customer action, and effective date.
- Help Center exposes seven SignGate-specific questions before generic integration topics.
- Support is secondary; Search docs, Explore API Reference, and Start with a safe sample remain primary.
- English and Traditional Chinese are separate locale URLs and navigation surfaces.

## Responsive checks

The corrected 375×812 mobile screenshot shows part of the first service card within the initial viewport. No horizontal page overflow was observed. Traditional Chinese heading text was inspected at desktop and the mobile stylesheet preserves words under normal wrapping. Tablet and native GitBook rendering still require later draft QA.

## Limitations

This pass certifies only the local visual proposal and token math. It does not certify GitBook plan entitlement, final GitBook rendering, screen-reader behavior, a sandbox, credential issuance, production API/OpenAPI correctness, live Test it, canonical/hreflang, release claims, or publication readiness.

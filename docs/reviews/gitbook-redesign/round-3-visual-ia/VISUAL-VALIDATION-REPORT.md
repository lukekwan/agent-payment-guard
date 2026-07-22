# Visual Validation Report

**Validation date:** 2026-07-22  
**Target:** local static proposal at `round-3-visual-ia/mockup/`  
**Environment:** localhost only; no GitBook/public deployment  
**Result:** `VISUAL_PROPOSAL_VALIDATION=PASS`

## Required screenshots

| View | Evidence | Captured size | Result |
| --- | --- | ---: | --- |
| Desktop Home | [desktop-home.png](screenshots/desktop-home.png) | 1425×990 | Pass — five top destinations, hero, terminal response and service cards visible |
| Desktop Documentation | [desktop-documentation.png](screenshots/desktop-documentation.png) | 1425×990 | Pass — Documentation-specific sidebar, warning and five-step onboarding |
| Desktop API Reference | [desktop-api-reference.png](screenshots/desktop-api-reference.png) | 1425×990 | Pass — separate collapsible service-family sidebar and endpoint grouping |
| Changelog | [changelog.png](screenshots/changelog.png) | 1440×1000 | Pass — dedicated changelog sidebar, timeline, type/breaking/action metadata |
| Help Center | [help-center.png](screenshots/help-center.png) | 1425×990 | Pass — dedicated help sidebar, search and required topic cards |
| Mobile | [mobile-home.png](screenshots/mobile-home.png) | 375×812 | Pass — collapsed navigation, one-column hero/terminal; no horizontal overflow |
| Dark mode | [dark-mode.png](screenshots/dark-mode.png) | 1265×889 | Pass — near-black background, raised cards, consistent teal/amber semantics |
| English | [english-home.png](screenshots/english-home.png) | 1425×990 | Pass — English-only top navigation and content surface |
| Traditional Chinese | [traditional-chinese-home.png](screenshots/traditional-chinese-home.png) | 1425×990 | Pass — 繁中-only top navigation, hero, availability and service framing |

## Automated viewport checks

| Surface | Requested viewport | Browser content width | Document scroll width | Horizontal overflow |
| --- | ---: | ---: | ---: | --- |
| Desktop Home | 1440×1000 | 1440 | 1425 | none |
| Documentation | 1440×1000 | 1440 | 1425 | none |
| API Reference | 1440×1000 | 1440 | 1425 | none |
| Changelog | 1440×1000 | 1440 | 1440 | none |
| Help Center | 1440×1000 | 1440 | 1425 | none |
| English Home | 1440×1000 | 1440 | 1425 | none |
| Traditional Chinese Home | 1440×1000 | 1440 | 1425 | none |
| Mobile Home | 390×844 | 390 | 375 | none |
| Dark Documentation | 1280×900 | 1280 | 1265 | none |

The 15px difference on scrolling pages is the browser scrollbar allocation, not page overflow.

## Content assertions

- All five top navigation labels render on desktop.
- Documentation and API Reference have different sidebar manifests.
- Changelog and Help Center also use their own contextual sidebars.
- Home starts with outcome/value positioning, not atomic consume or fingerprints.
- Service cards appear before the quickstart and carry availability/status metadata.
- Quickstart contains five ordered steps and cURL/JavaScript/Python tabs.
- Sandbox key/Base URL gaps are visible in amber; no live sandbox or production Test it claim appears.
- Response preview labels `environment=sample` and uses fail-closed copy.
- The API Reference mockup says `VERIFIED_PUBLIC` only and displays x402 prices.
- Changelog shows date/type/affected surface/breaking/action fields.
- Help Center exposes the requested adoption, key, environment, decision, limit, pricing, error, troubleshooting and support topics.
- English and Traditional Chinese are rendered by separate locale URLs and never share one sidebar.
- No decorative emoji, generic AI imagery or multicolor accent system is present.

## Benchmark comparison

The detailed comparison is in [BENCHMARK-ACCEPTANCE-MATRIX.md](BENCHMARK-ACCEPTANCE-MATRIX.md). Locally verified behaviors are top navigation, contextual sidebar grouping, service cards, step onboarding, code tabs, semantic callouts, response presentation, Changelog, Help Center, mobile layout, dark visual hierarchy and separate language surfaces.

## Limitations

This pass certifies only the local visual proposal at the captured viewports. It does not certify GitBook rendering, plan entitlement, screen-reader behavior, a real sandbox, credentials, production API correctness, OpenAPI correctness, live Test it, canonical/hreflang, or publication readiness. Those remain gated work.

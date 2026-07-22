# Benchmark and Visual Acceptance Matrix

The benchmark is used for hierarchy and developer experience only. No wording, schema, visual brand, proprietary content or product taxonomy is copied.

| Dimension | Benchmark behavior to match | SignGate proposal | Evidence |
| --- | --- | --- | --- |
| Top navigation | Distinct high-level destinations | Home, Documentation, API Reference, Changelog, Help Center | Home and all desktop screenshots |
| Sidebar grouping | Context-specific grouped navigation | Documentation task/concept sidebar; separate service-family API sidebar | Documentation and API Reference screenshots |
| Service cards | Discoverable products/tasks | Exactly four Home cards with purpose, availability, auth/billing truth and status | Home screenshots |
| Step quickstart | Ordered onboarding | Five sample-first steps; sandbox shown only as a future gap | Home and Documentation screenshots |
| Code tabs | Language switching near the task | cURL, JavaScript, Python in stable order | Home/Documentation screenshots |
| Callout styles | Compact consistent semantics | Neutral info, teal key, amber warning, red danger | Documentation/API Reference screenshots |
| API response presentation | Human context plus structured examples | Exact service response plus separately labeled envelope proposal | Home/API Reference screenshots and response proposal |
| API reference hierarchy | Grouped, scannable operations | Collapsible service families plus complete endpoint-page layout | Full endpoint screenshot/template |
| Changelog | Structured product/API change history | Type, endpoints, breaking flag, migration, effective date | Changelog screenshot/spec |
| Help Center | Searchable adoption/operations support | SignGate-specific decision/signer/evidence/x402 questions plus operational topics | Help Center screenshot/spec |
| Mobile | Usable navigation and no overflow | Collapsed controls, one-column cards/code, 390px evidence | Mobile screenshot |
| Dark visual system | Coherent brand and hierarchy | Near-black, dark-gray cards, white/gray text, one teal accent | All proposal screenshots |
| Language separation | One locale per navigation surface | English and Traditional Chinese variants, equivalent home evidence | English and zh-TW screenshots |

## Screenshot manifest

| Required view | File | Expected state |
| --- | --- | --- |
| Desktop Home | `screenshots/desktop-home.png` | English, 1440px, dark |
| Desktop Documentation | `screenshots/desktop-documentation.png` | Dedicated Documentation sidebar and five steps |
| Full endpoint API Reference | `screenshots/full-endpoint-api-reference.png` | Complete human-readable endpoint page and separate service-family sidebar |
| Changelog | `screenshots/changelog.png` | Structured timeline/metadata |
| Help Center | `screenshots/help-center.png` | Search and topic cards |
| Mobile | `screenshots/mobile-home.png` | 390px, no horizontal overflow |
| Traditional Chinese | `screenshots/traditional-chinese-home.png` | zh-TW-only surface |
| Contrast / accessibility | `screenshots/contrast-accessibility.png` | Measured primary, secondary, metadata, active, warning and danger ratios |

## Acceptance status vocabulary

- **PROPOSED:** rendered in the local non-public mockup.
- **VERIFIED_LOCAL:** screenshot captured and overflow/DOM checks passed.
- **GITBOOK_DRAFT_REQUIRED:** requires later implementation in a GitBook draft/change request.
- **PUBLICATION_BLOCKED:** cannot go live without the existing PM/Founder gates.

The screenshot package can reach `VERIFIED_LOCAL`; it does not prove GitBook plan compatibility, public accessibility, sandbox functionality, or production contract correctness.

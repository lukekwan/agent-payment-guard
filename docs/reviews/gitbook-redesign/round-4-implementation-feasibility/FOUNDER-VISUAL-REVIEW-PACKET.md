# Founder visual review packet

**Scope:** one recommended SignGate portal direction, corrected for readability, CTA truth, safe-sample onboarding, external-only Changelog, and SignGate-specific Help Center. This remains a local proposal.

## Recommended views

The screenshots below are the corrected Round 3 evidence set used by this Round 4 feasibility review. They are not public GitBook pages.

| Review view | Evidence | Founder should verify |
|---|---|---|
| Desktop Home | [Home desktop](../round-3-visual-ia/screenshots/desktop-home.png) | Four cards visible immediately after Hero; safe sample before quickstart; support secondary. |
| Documentation | [Five-minute quickstart](../round-3-visual-ia/screenshots/desktop-documentation.png) | Sample-first five steps; no sandbox-key fiction. |
| API Reference | [Full endpoint page](../round-3-visual-ia/screenshots/full-endpoint-api-reference.png) | Method/path, availability, auth, price, parameters, schema, examples, language tabs, retries, security, related guide, Test status. |
| Changelog | [Changelog](../round-3-visual-ia/screenshots/changelog.png) | External product changes only; every item has impact, breaking status, customer action, and effective date. |
| Help Center | [Help Center](../round-3-visual-ia/screenshots/help-center.png) | Product-specific decision, signer, evidence, x402, and verification questions are visible. |
| Mobile | [Home mobile](../round-3-visual-ia/screenshots/mobile-home.png) | Natural hierarchy, service catalog near the first viewport, readable controls. |
| Traditional Chinese | [Traditional Chinese Home](../round-3-visual-ia/screenshots/traditional-chinese-home.png) | Natural headline and wrapping; “行動” never splits. |
| Contrast / accessibility | [Contrast evidence](../round-3-visual-ia/screenshots/contrast-accessibility.png) | Secondary text, inactive navigation, metadata, warning, and danger meet stated targets. |

No duplicate English Home screenshot is included. The desktop Home is the English reference; the Traditional Chinese view is its locale comparison.

## Recommended headline

**English:** “Decide before agents pay, purchase, or sign.”

This is clearer for developers than “value moves,” names three concrete integration moments, and still covers payment plus delegated authority. It is narrower than “money or authority moves,” but more actionable and less abstract.

**Traditional Chinese:**

> 在價值移動前，
> 先決定 AI Agent 能不能執行。

The mockup must review this line at desktop, tablet, and mobile widths and keep “行動” intact wherever that word appears.

## Exact differences from the current GitBook

| Current GitBook | Recommended portal |
|---|---|
| One long bilingual sidebar and repository-shaped hierarchy | Five first-class destinations; separate Documentation and API Reference sidebars; language surfaces separated. |
| `deploy_change` candidate dominates the public story | Four developer-outcome Home cards; candidate lifecycle content is a labeled preview only. |
| Current public title/identity is generic (`123 Docs`) | SignGate Developer Portal brand direction, pending explicit implementation approval. |
| OpenAPI/Test-it presentation may suggest executable capability | Safe sample is visibly non-live; sandbox and paid production execution remain disabled until verified. |
| API Reference is candidate-focused and incomplete | Approved-public-only service grouping plus a complete human-readable endpoint page. |
| Changelog/Help Center are not first-class product destinations | Structured external product history and SignGate-specific troubleshooting. |
| Decision terminology appears canonical across services | Exact service-local enums, signer directives, expiry, and evidence boundaries are explicit. |
| Lower-contrast secondary metadata | Corrected tokens target WCAG AA for normal text and clearer elevation separation. |

## Exact differences from the benchmark

- SignGate uses its own near-black/teal tokens, geometric gate treatment, compact technical density, and decision-state labels.
- Home cards expose availability, auth/billing, and test truth; they are not general blockchain product marketing.
- The core product narrative is pre-execution control for agent payment, purchase, approval, and signing.
- Safe-sample and implementation-gap labels are unusually prominent to prevent a fake sandbox experience.
- Endpoint pages emphasize evidence freshness, signer isolation, retry safety, and paid-request boundaries.
- No benchmark logo, proprietary copy, schema, product taxonomy, icons, illustrations, or pixel-identical layout is reused.

## Open Founder decisions

1. Approve **Option A** and its listed Ultimate budget, or explicitly select the search/navigation compromise in B or C.
2. Approve the four Home cards and order: Agent Payment Control; Agentic Commerce; Approval & Signer Control; Merchant & x402 Trust.
3. Approve the English and Traditional Chinese headlines.
4. Approve sample-first CTA truth and keep all sandbox CTAs disabled.
5. Approve English as the default locale and `zh-TW` as the paired variant.
6. Approve the five section slugs and ten-Space content topology.
7. Supply/approve the final Nomos/SignGate mark and portal title before any visual implementation.
8. Decide whether the public contact surface can be called “Contact support” and define any SLA wording.
9. Decide whether a separately scoped `/v2` response-envelope contract project should begin; this docs task does not change `/v1`.

## Recommendation

Founder should approve the IA, four Home cards, CTA truth, locale default, and Option A budget in writing. PM may then issue a separate authorization for a **draft-only GitBook implementation**. Publication, merge, plan purchase, production Test it, and production contract changes remain separate gates.

`PUBLIC_GITBOOK_CHANGED=false`
`GITBOOK_PLAN_CHANGED=false`
`PRODUCTION_API_CHANGED=false`
`PRODUCTION_OPENAPI_CHANGED=false`
`GITBOOK_PUBLISHED=false`
`PR_MERGED=false`

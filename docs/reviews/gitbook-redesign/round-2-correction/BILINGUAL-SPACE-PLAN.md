# Bilingual Space Plan

**Workspace verification date:** 2026-07-22  
**Current site:** SignGate Developer Docs (`site_QFkMQ`)  
**Current GitBook plan observed:** Basic; the UI states the former Ultimate site was downgraded to Basic.

## Verified GitBook capabilities

This was checked in the signed-in GitBook workspace rather than inferred from memory:

- **Sections** shows “Upgrade to Ultimate”; therefore multi-section site IA is not currently available on Basic.
- **Variants** shows an active “Add variant” control and describes versions/translations.
- The Add variant dialog accepts a Space and title, starts the variant as draft, and its Space picker offers **Translation**, **Start with blank**, or an existing Space.
- The workspace currently exposes existing spaces named API Reference, Documentation, Help Center, and Changelog in addition to the current site space.

Conclusion: the current plan/UI supports a language variant backed by a separate/new translation Space, while Ultimate-only Sections must not be assumed. This round did not create a space or variant.

## Option A — two GitBook Spaces exposed as language variants (recommended)

| Dimension | Plan |
| --- | --- |
| GitBook plan requirement | Verified available through the current Basic site’s Variants UI; re-check entitlement at implementation time |
| Spaces | `SignGate Developer Docs — English` and `SignGate 開發者文件 — 繁體中文` |
| URL structure | One site with a visible language variant selector; GitBook manages variant URL form |
| Canonical handling | One canonical per locale page; configure/verify GitBook canonical and hreflang output before publication |
| Editing workflow | English source candidate → QA/PM approval → translation PR/space sync → locale parity check |
| Translation workflow | Translate approved semantic blocks and schemas; generated reference shares one approved OA; do not translate field names/enums |
| Navigation | Separate `SUMMARY.md`/navigation per Space; one language per sidebar |
| Maintenance | Medium; two spaces and Git Sync mappings, but clear audience boundaries |
| SEO | Strong if locale links, canonical, and hreflang are verified; draft variants remain unpublished |
| Risks | Git Sync configuration complexity, translation drift, entitlement/UI changes, accidental undraft |

Why recommended: it provides the founder-requested language switch and separate sidebars using a capability directly observed in this workspace, without requiring Ultimate Sections.

## Option B — independent locale trees under one Git-synced Space

| Dimension | Plan |
| --- | --- |
| GitBook plan requirement | Basic content hosting is sufficient, but GitBook must allow route-level landing/navigation behavior needed to avoid a combined sidebar |
| Trees | `/en` and `/zh-tw`, each with a locale landing page and independently generated navigation |
| URL structure | Explicit locale prefixes |
| Canonical handling | Self-canonical locale pages plus reciprocal hreflang; verify output before publication |
| Editing workflow | One repository tree, locale-specific manifests and generated navigation |
| Translation workflow | English candidate → translated sibling file → parity CI |
| Navigation | Must render only the chosen locale; a single combined `SUMMARY.md` is forbidden |
| Maintenance | Low/medium in Git, but custom navigation/redirect behavior may be harder in GitBook Basic |
| SEO | Predictable locale URLs; depends on verified canonical/hreflang support |
| Risks | The current GitBook sync model may still combine both trees; language switching may be manual; higher risk of repeating the current problem |

## Shared parity controls

1. Stable locale-neutral page IDs map English to zh-TW.
2. CI fails for missing counterparts, endpoint-count drift, navigation drift, broken cross-locale links, or translated enum/field names.
3. OpenAPI, JSON Schema, prices, methods and paths come from one approved source and are not manually translated.
4. Translation status is `source_sha`, translator/reviewer, reviewed date, and semantic exceptions.
5. English can be a candidate first; Traditional Chinese is created only after QA/contract review, matching the requested workflow.
6. Language switch links to the equivalent page when available, otherwise the locale landing page with a clear notice.

## Implementation sequence after PM approval

1. Create/identify the English Space and keep it draft.
2. Create a Translation variant Space for Traditional Chinese; keep it draft.
3. Split navigation and Git Sync roots/manifests without changing public canonical/indexing.
4. Run bilingual structural and semantic parity CI.
5. Verify variant selector, direct locale URLs, canonical/hreflang, mobile navigation, and 404 fallback in draft.
6. Request Founder publication approval separately.

No site customization, language variant, canonical, indexing, title, or publication setting was changed in this round.

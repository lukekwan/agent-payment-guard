# SignGate visual differentiation

The benchmark informs portal behavior—clear destinations, task-led onboarding, code tabs, structured reference, Changelog, and Help Center. It does not supply SignGate's brand, layout, copy, icons, illustrations, or component styling.

## Distinctive visual system

| Element | SignGate rule |
|---|---|
| Nomos / SignGate icon treatment | Use an approved geometric gate/decision mark with negative space and a technical construction. Until Brand supplies the final asset, the mockup mark is a labeled placeholder. Never trace the benchmark logo or reuse its icon family. |
| Border radius | Buttons 7px; controls 7–8px; content cards 8px; elevated/code panels 10–12px. Avoid both fully square enterprise tables and oversized consumer-app pills. |
| Line / icon style | 1.5px monoline, consistent optical box, restrained square geometry, no filled multicolor icons, no decorative emoji. Lettered placeholders such as `PC` or `XT` are mockup-only. |
| Card density | Technical and compact: four service cards per desktop row, two on tablet, one on mobile. Prioritize outcome, availability, auth/billing, and CTA over illustration. |
| Decision-state labels | Preserve the exact service enum. Use rectangular monospace labels plus plain-language action text. `ALLOW`, `REQUIRE_APPROVAL`, `DENY`, `BLOCK`, and service-local states must not be flattened into a universal green/amber/red contract. |
| Typography hierarchy | System/Inter-style sans: H1 52–60px desktop, 38–44px tablet, 34–38px mobile; H2 30–34px; body 15–18px; metadata 11–12px. Code uses a system monospace. Traditional Chinese uses natural line breaks and never splits “行動.” |
| Accent usage | Teal/cyan is the single interactive and active accent. Neutral gray is information; teal tint is key/success; amber is warning; red is danger. Status always includes text, never color alone. |
| Background / elevation | Near-black page `#070A0C`; panels progress through `#0D1417`, `#131C20`, and `#1A252A`; restrained borders are visible at normal laptop brightness. |
| Primary actions | Search docs, Explore API Reference, and Start with a safe sample. Contact support is secondary. |

## Readability and contrast targets

The corrected mockup raises secondary text and metadata contrast and increases surface separation. Target token pairs are validated against WCAG contrast math in the local correction evidence:

| Semantic use | Foreground | Background | Minimum target |
|---|---:|---:|---:|
| Primary text | `#F3F7F7` | `#070A0C` | 18.40:1 (AAA) |
| Secondary text | `#AFBEC3` | `#070A0C` | 10.38:1 (AAA) |
| Metadata / inactive navigation | `#91A2A8` | `#070A0C` | 7.50:1 (AAA) |
| Link / active | `#5EEAD4` | `#070A0C` | 13.42:1 (AAA) |
| Warning text | `#F4C95D` | `#17150D` | 11.62:1 (AAA) |
| Danger text | `#FF8EA0` | `#1A1013` | 8.54:1 (AAA) |

Actual measured ratios, method, and screenshots belong in the visual correction report; GitBook implementation must be retested after native rendering because font weight, anti-aliasing, and custom theme limits can change perceived readability.

## SignGate-specific component cues

- Service cards show `availability`, `authentication`, and `billing` truth—not generic marketing claims.
- The safe response panel begins with **SAMPLE RESPONSE / NO LIVE REQUEST SENT**, shows `environment=sample`, and cannot be mistaken for a sandbox console.
- Endpoint pages pair human-readable purpose/security guidance with structured schema and language tabs.
- Evidence freshness, signer directives, expiry, and fail-closed behavior receive explicit visual hierarchy.
- The Home story is “decide before value or authority moves,” not a generic blockchain explorer or AI landing page.

## Prohibited benchmark imitation

Do not copy or closely reproduce:

- benchmark logos, icons, illustrations, decorative motifs, screenshots, or stock imagery;
- exact spacing, card dimensions, navigation styling, code palette, component geometry, or animation;
- proprietary product names, copy, examples, schemas, endpoint taxonomy, or page wording;
- an entire page composition pixel-for-pixel, even if colors and copy are changed;
- generic blockchain/AI imagery, glowing coins, robots, neural brains, or decorative emoji.

Generic developer-portal conventions—top navigation, sidebar groups, code tabs, copy controls, endpoint method badges, and searchable Help Center—may be used only with SignGate's distinct tokens, content hierarchy, safety boundaries, and component details.

`VISUAL_DIRECTION=NEAR_BLACK_TEAL_APPROVED`
`BENCHMARK_BEHAVIOR_USED=true`
`BENCHMARK_BRAND_OR_CONTENT_COPIED=false`

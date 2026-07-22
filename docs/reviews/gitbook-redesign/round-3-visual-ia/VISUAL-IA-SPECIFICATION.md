# SignGate Developer Portal Visual and Information Architecture Specification

**Status:** review proposal only  
**Publication:** not authorized  
**Contract/runtime changes:** none

## 1. Five top-level destinations

The portal must expose five persistent first-level destinations. They are product surfaces, not labels in one long sidebar.

| Destination | Purpose | Primary modules | Sidebar behavior |
| --- | --- | --- | --- |
| Home | Explain SignGate, reveal the four first-release services, start a safe sample, and route users to SDK/MCP/support. | Hero, four service cards, safe sample, five-minute quickstart, outcomes, SDK/MCP, support links. | No long documentation tree; contextual section anchors only. |
| Documentation | Teach integration tasks and cross-service concepts. | Quickstart, auth, environments, response format, errors, rate limits, pricing/billing, pagination, concepts, guides. | Dedicated Documentation sidebar. |
| API Reference | Present approved public operations only. | Collapsible service families, methods/paths, models, OpenAPI download. | Dedicated service-family sidebar; never mirrors Documentation. |
| Changelog | Make contract and environment change visible and actionable. | Added/changed/deprecated/fixed/security entries, endpoint impact, migration, effective date. | Changelog filters/archive only. |
| Help Center | Resolve adoption and operational questions. | Keys, auth, sandbox/production, decisions, limits, billing/x402, errors, troubleshooting, support. | Help topic/sidebar or search-driven categories. |

GitBook plan constraint: the current Basic site shows Sections as Ultimate-only. The observed Variants flow can separate languages, but a literal five-section GitBook site may require Ultimate or separate sites/spaces. IA approval must precede plan purchase or site mutation.

## 2. Separate sidebars

### Documentation

```text
GET STARTED
  Service overview
  Five-minute quickstart
  Authentication & API keys
  Environments & Base URLs

CORE CONCEPTS
  Response format
  Decision model
  Mandate
  Evidence
  Approval
  Signer directive
  Error handling
  Rate limits
  Pricing & usage
  Pagination (only for endpoints that paginate)

INTEGRATION GUIDES
  Agent payment
  API purchase / x402
  Signer execution
  Human approval
  JavaScript & Python SDKs
  MCP integration
  Preview use case: deploy_change
```

### API Reference

```text
Agent Payment Control
Agentic Commerce
Approval & Signer Control
Merchant & x402 Trust
Wallet & Transaction Evidence
Agent / API Supply Chain
System & Audit
Models
Download OpenAPI spec
```

Only `VERIFIED_PUBLIC` operations from a PM-approved allowlist may render below these groups. `deploy_change` remains a candidate preview guide, never a top-level product category.

## 3. Language architecture

English and Traditional Chinese are separate navigation surfaces. Recommended implementation remains two Spaces attached as GitBook language Variants because the current Basic UI visibly supports Translation/new Space variants. Each Space owns its navigation manifest. The shared OpenAPI/model source is language-neutral; descriptions may be translated, but methods, paths, field names, enums, codes, and examples remain contract-accurate.

Required locale controls: reciprocal language switch, equivalent-page mapping, separate search context, parity CI, self-canonical locale pages, verified hreflang, and no combined bilingual `SUMMARY.md`.

## 4. Visual system

### Tokens

| Role | Token | Proposed value | Rule |
| --- | --- | --- | --- |
| Page background | `--bg` | `#070A0C` | Near-black, not pure black |
| Base surface | `--surface` | `#0D1417` | Sidebar, card and low-elevation blocks |
| Elevated card | `--surface-raised` | `#131C20` | Cards/panels only |
| Border | `--border` | `#2B3A40` | Restrained, readable 1px borders |
| Primary text | `--text` | `#F3F7F7` | Headings and important labels |
| Secondary text | `--muted` | `#AFBEC3` | Paragraphs; 10.38:1 on page background |
| Metadata text | `--muted-2` | `#91A2A8` | Inactive navigation and metadata; 7.50:1 on page background |
| Primary accent | `--accent` | `#2DD4BF` | One cyan/teal accent only |
| Accent emphasis | `--accent-strong` | `#5EEAD4` | Active states/links; sparingly |
| Warning | `--warning` | `#FBBF24` | Warnings only |
| Danger | `--danger` | `#FF8EA0` | Destructive/error state only |

Typography uses a neutral UI sans-serif and a monospace family for methods, paths, fields and code. Default body size is 15–16px, line height 1.55–1.7, measure 65–78 characters. Desktop content max width is 1440px; readable article text stays below 800px.

### Component rules

- Cards use dark-gray elevation, 8–12px radius, 1px restrained border, and no glossy effects.
- One consistent geometric line-icon family; two-letter service marks are acceptable placeholders. No decorative emoji.
- Active top navigation uses white text plus a 2px teal underline. Active sidebar uses a subtle teal tint and teal text.
- Buttons: teal primary, elevated dark secondary. No rainbow gradients.
- Code tabs use a single teal active rule and preserve cURL/JavaScript/Python order.
- No generic AI stock imagery, robot art, glowing brains, or unrelated blockchain imagery.
- Motion is optional and limited to 120–200ms hover/focus transitions; screenshots and reduced-motion users see no dependency on animation.

### Callout semantics

| Semantic | Treatment | Allowed content |
| --- | --- | --- |
| Info | Neutral gray tint and gray rail | Context, notes, non-blocking facts |
| Key / success | Teal tint and teal rail | Required safe practice, successful verified state |
| Warning | Amber tint and amber rail | Availability gap, cost/risk, conditional behavior |
| Danger | Red tint and red rail | Do-not-execute, secret loss, destructive or unsafe behavior |

The same semantic cannot change color between pages or locales. Teal does not mean “safe” unless the underlying state is actually verified.

## 5. Home composition — fixed order

1. **Hero:** “Decide before agents pay, purchase, or sign,” concise value proposition, primary developer paths, visible sandbox gap.
2. **Four service cards:** Agent Payment Control, Agentic Commerce, Approval & Signer Control, Merchant & x402 Trust. At least part of this catalog appears in the first desktop viewport.
3. **Safe sample:** visibly states `SAMPLE RESPONSE`, `NO LIVE REQUEST SENT`, endpoint, `environment=sample`, HTTP status example, request-ID availability, Copy, and Response/Request/cURL tabs.
4. **Five-minute quickstart:** sample-first five steps and cURL/JavaScript/Python tabs.
5. **Response / decision explanation:** service-aware ALLOW, review/approval, deny/block patterns; no false universal enum.
6. **SDK/MCP:** package/tool status must be verified before install claims.
7. **Changelog / Help Center / Support:** visible last-mile adoption paths; support remains secondary.

Atomic consume, action fingerprints, preview limitations and detailed enforcement move to Documentation/Core Concepts or the deploy_change preview guide.

## 6. Five-minute onboarding contract

| Step | Required developer experience | Current truth |
| ---: | --- | --- |
| 1 | Choose a safe sample | Free GET sample; no purchase, transfer, signer action, or live provider verification |
| 2 | Set the sample Base URL and keep it distinct from sandbox/production | Current sample origin only; sandbox remains an implementation gap |
| 3 | Send the sample request in cURL, JavaScript or Python | No credential and no live economic action |
| 4 | Inspect the exact current response | Do not invent `request_id`, usage, or normalized envelope fields absent from the source |
| 5 | Select the correct production integration path | Confirm endpoint-specific authority, auth, billing, and fail-closed handling |

No CTA may say “Get sandbox key,” “Run in sandbox,” or “Try live” until the missing environment and credential flow are implemented and QA verified.

## 7. Responsive behavior

- Desktop ≥1200px: five-item top navigation, distinct left sidebar on Documentation/API Reference, optional on-this-page rail.
- Tablet 721–1199px: hide right rail, preserve left sidebar and top destinations where space allows.
- Mobile ≤720px: collapse global and contextual navigation behind separate controls; one-column cards and code; no horizontal overflow; language switch remains accessible.
- Code blocks scroll within their container and never force page-width overflow.
- Focus states use a visible teal outline independent of hover.

## 8. Accessibility and visual QA

Minimum acceptance: WCAG AA contrast for text/controls, logical heading order, keyboard reachability, visible focus, 44px primary touch targets, non-color status labels, reduced-motion support, 200% zoom, code horizontal-scroll check, and English/Traditional Chinese line-wrap review. Corrected local tokens measure 18.40:1 primary, 10.38:1 secondary, 7.50:1 metadata, 13.42:1 link/active, 11.62:1 warning, and 8.54:1 danger on their specified dark backgrounds. Native GitBook rendering must be retested.

## 9. Non-authorized implementation boundary

This specification and its local mockup are evidence only. They do not authorize site plan upgrades, GitBook Sections/Variants creation, public navigation changes, branding changes, canonical/indexing changes, production Test it, API/OpenAPI changes, merge, or publication.

# SignGate GitBook: Current vs Target Audit

**Audit date:** 2026-07-19  
**Current site:** <https://123-87.gitbook.io/signgate-api>  
**Information-architecture benchmark:** <https://docs.blockchainsecurity.asia/>  
**Scope:** Visual presentation, navigation, hierarchy, content density, endpoint presentation, onboarding, and public/private boundary.

This audit uses the benchmark only to evaluate documentation structure and developer experience. It does not reuse the benchmark's wording, product concepts, schemas, brand, or proprietary content.

## Evidence captured

### Current SignGate site

- [Homepage — desktop](screenshots/current/homepage-desktop.png)
- [Left navigation](screenshots/current/left-navigation.png)
- [Conceptual guide — decision lifecycle](screenshots/current/concept-decision-lifecycle.png)
- [Endpoint — create decision](screenshots/current/api-create-decision.png)
- [Authentication](screenshots/current/authentication.png)
- [Code examples](screenshots/current/code-examples.png)

### Benchmark site

- [Homepage — desktop](screenshots/benchmark/homepage-desktop.png)
- [Left navigation](screenshots/benchmark/left-navigation.png)
- [Conceptual guide — response format](screenshots/benchmark/concept-response-format.png)
- [Endpoint page](screenshots/benchmark/api-endpoint.png)
- [Authentication](screenshots/benchmark/authentication.png)
- [Code examples](screenshots/benchmark/code-examples.png)

The public browser surface did not expose viewport resizing, so a narrow-width capture was not available during this initial audit. The final visual review must use GitBook's device preview to capture the redesigned mobile navigation.

## Executive finding

The current site is technically readable but does not yet behave like an enterprise API portal. It presents a repository-derived bilingual document set inside one long sidebar. The benchmark separates discovery, onboarding, concepts, task guides, API reference, and support into predictable journeys, then uses cards, steps, tabs, compact callouts, and endpoint-generated reference blocks to reduce cognitive load.

The redesign must change the information architecture and public/private boundary before visual polish can be considered successful.

## Comparison matrix

| Dimension | Current SignGate | Target experience |
| --- | --- | --- |
| First 30 seconds | Explains preview constraints and internal safety semantics before establishing the product promise. | Lead with the execution-control problem, three decisions, the call path, and obvious CTAs. |
| Homepage | A repository README rendered with cards added around a dense technical narrative. | A concise product landing page with hero, decision cards, four-step flow, endpoint cards, and preview notice. |
| Navigation | Language-first groups mix onboarding, concepts, reference, and examples at one depth. | Workflow-first sections: Get Started, Core Concepts, API Reference, Guides, Security, Examples, Resources. |
| Language model | English and Traditional Chinese pages share one sidebar, duplicating navigation and increasing scan time. | English default plus structurally equivalent Traditional Chinese variant or separately isolated public space. |
| Endpoint reference | Endpoint pages are hand-written and incomplete as reference destinations. | Each endpoint has a fixed sequence, explicit scopes, field tables, state-specific response tabs, errors, retries, and related guides. |
| Code presentation | Examples are mostly links to repository files or one command per language. | Complete, copyable cURL, JavaScript, and Python workflows with fail-closed control flow. |
| Concepts | Important concepts exist but are compressed into a few broad pages. | One concept per page with a concise purpose, when-to-use guidance, and the primary constraint first. |
| Security | Security details are distributed across overview, authentication, lifecycle, and errors. | Dedicated security hierarchy for isolation, scopes, secrets, replay, audit, retention, and preview limitations. |
| Public/private boundary | Public pages mention an internal Founder approval workflow and internal endpoint boundary. | Public docs explain approval behavior without naming internal endpoints, scopes, gates, tables, bindings, or governance artifacts. |
| Branding | Published header remains `123 Docs`; the visual identity is inconsistent with SignGate. | SignGate/Nomos title and existing approved assets, restrained accent color, consistent light/dark presentation. |

## Current homepage weaknesses

1. The primary headline is a product name rather than a user outcome.
2. The value proposition uses internal vocabulary such as `deploy_change`, action fingerprints, and policy versions before explaining the execution-control problem.
3. Preview and non-production warnings have disproportionate visual weight.
4. The homepage mixes positioning, security invariants, endpoint catalog, language selection, source-of-truth links, and internal-boundary commentary.
5. The three decisions are not presented as a balanced, immediately scannable model.
6. There is no direct two-CTA path to Get Started and API Reference.
7. The current flow ends at atomic consume but does not visually distinguish client, SignGate, and executor responsibilities.

## Sidebar and hierarchy weaknesses

- The hierarchy is organized around language rather than developer intent.
- Quickstart, authentication, lifecycle, errors, API reference, and examples appear as peer pages even though they serve different stages of adoption.
- There is no dedicated Core Concepts group.
- There is no Guides section for task-oriented workflows.
- There is no complete Security section.
- Request schemas, response schemas, reason codes, retries, expired decisions, executor integration, and downstream failure are not individually discoverable.
- English and Traditional Chinese duplicates compete for space in the same navigation.
- Endpoint pages are nested below a language group instead of being a first-class API Reference destination.

## Readability and content-density problems

- Several overview sections behave like engineering handoff prose rather than developer guidance.
- Policy details, fingerprinting mechanics, error semantics, internal boundaries, and preview limitations are concentrated on overview pages.
- Paragraphs frequently introduce multiple constraints before answering what the developer should do.
- Long schema examples are not consistently grouped by outcome or language.
- The documentation repeats authorization caveats without providing a single global preview status pattern.
- Repository file links and implementation terminology interrupt the product narrative.

## Missing onboarding flow

The current experience does not provide a complete, linear onboarding journey that a first-time integrator can execute:

1. Understand SignGate's role.
2. Configure `SIGNGATE_BASE_URL` and `SIGNGATE_API_KEY`.
3. Submit a complete decision request.
4. Parse `ALLOW`, `REQUIRE_APPROVAL`, and `DENY` safely.
5. Refuse execution for every non-`ALLOW` state.
6. Verify and atomically consume `ALLOW`.
7. Continue only after a successful consume receipt.

The redesigned Quickstart must show this entire sequence in cURL, JavaScript, and Python.

## Endpoint-page gaps

### `POST /v1/decisions`

- No single page sequence covers purpose through related guides.
- Decision outcomes are not presented as separate `ALLOW`, `REQUIRE_APPROVAL`, `DENY`, and Error tabs.
- Required scope is present but not visually prominent.
- Retry and request-ID semantics are not sufficiently discoverable.
- Security notes and client responsibilities are dispersed.

### `POST /v1/decisions/{decision_id}/consume`

- First consume, same-attempt retry, already-consumed, expired, and fingerprint-mismatch states are not presented as separate tabs.
- The relationship between atomic consume and downstream execution failure needs a dedicated guide.
- The page does not provide a compact decision table for retry safety.

## Missing visual hierarchy

The benchmark consistently uses:

- top-level task destinations;
- short introductory copy;
- cards for non-linear discovery;
- steps for ordered workflows;
- tabs for language and outcome variants;
- strong endpoint grouping;
- compact callouts for global constraints;
- generous whitespace and limited paragraph length.

Current SignGate pages use some cards and steps, but these are layered onto the existing README-oriented structure rather than driven by a deliberate page hierarchy.

## Branding inconsistencies

- The published site title is `123 Docs` while page content says SignGate.
- The URL was improved to `/signgate-api`, but the header still carries a template identity.
- Navigation labels mix English, Traditional Chinese, and internal engineering terms.
- Emoji card icons are decorative and inconsistent with a restrained enterprise appearance.
- No approved SignGate or Nomos asset is currently applied as the site icon or header mark.

## Inappropriate internal information exposed publicly

The live public site or its source pages mention internal concepts that must be removed from the redesigned public tree:

- the internal Founder approval-grant endpoint boundary;
- the internal approval scope;
- the internal production gate phrase;
- implementation-specific credential storage and digest details;
- repository and implementation governance references.

Public documentation should say only that `REQUIRE_APPROVAL` is not executable and that, after authorized approval is obtained, the client submits a fresh decision request.

## Content to move off the homepage

| Current homepage topic | New destination |
| --- | --- |
| Full policy outcome detail | Core Concepts / Decision Model |
| Fingerprint construction | Core Concepts / Action Binding and Guides / Validate Fingerprints |
| Atomic consume constraints | Core Concepts / Atomic Consume and Get Started / Consume an ALLOW |
| Authentication scopes | Get Started / Authentication and Security / Authentication and Scopes |
| Error status catalog | API Reference / Error Responses |
| Internal endpoint boundary | Private internal documentation only |
| Commerce/x402 status | Preview Limitations as future, non-live integration context only |
| Repository/OpenAPI source links | Resources / Versioning |

## Redesign acceptance direction

The redesign may begin only with these requirements treated as blocking:

- English-first public structure with a semantically equivalent Traditional Chinese tree.
- Explicit navigation manifest and generated GitBook navigation.
- One public page per required onboarding, concept, endpoint, guide, security topic, example, and resource.
- Complete fail-closed examples using `SIGNGATE_BASE_URL` and `SIGNGATE_API_KEY`.
- No forbidden internal term or endpoint in any public file, navigation artifact, example, or public OpenAPI document.
- Draft/change-request creation only; no direct publication.

**Audit status: COMPLETE — redesign may proceed.**

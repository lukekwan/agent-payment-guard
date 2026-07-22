# GitBook implementation options

**Task:** SG-DOCS-002 Round 4 implementation feasibility
**Decision boundary:** comparison only; no purchase, plan change, GitBook implementation, or publication is authorized.

## Recommendation

Choose **Option A: one Ultimate site using native Sections and language Variants**, subject to Founder budget approval. It is the only option that preserves the approved five-destination navigation, a different sidebar for each destination, bilingual switching, and cross-section search in one coherent portal.

GitBook currently lists Basic at **$0/site/month**, Premium at **$65/site/month**, and Ultimate at **$249/site/month**, with paid users listed at **$12/user/month** when billed annually. Prices, taxes, currency, and checkout terms must be reconfirmed before any purchase. Sources: [GitBook pricing](https://www.gitbook.com/pricing), [GitBook plans](https://gitbook.com/docs/account-management/plans).

## Option A — Ultimate site with native Sections + Variants

| Dimension | Proposed implementation |
|---|---|
| Exact capability required | Native Site Sections for Home, Documentation, API Reference, Changelog, and Help Center; a language Variant for English and Traditional Chinese within every section; advanced site customization. |
| Current plan support | **Not fully supported.** The current Basic plan supports Variants, but Site Sections are Ultimate-only. [Sections documentation](https://gitbook.com/docs/publishing-documentation/site-structure/site-sections), [Variants documentation](https://gitbook.com/docs/publishing-documentation/site-structure/variants). |
| Estimated additional cost | Listed Ultimate price: **$249/site/month + $12/user/month**, annual billing. Auto-translation is not required because translations will be maintained as reviewed content. |
| Spaces / Sites | **10 Spaces, 1 Site**: five section Spaces × two language variants. |
| Language implementation | English is the default variant; each section has a linked `zh-TW` variant Space. GitBook renders the language picker when a language is assigned. |
| URL structure | One site origin. Default Home is served at the root; section slugs append `/documentation`, `/api-reference`, `/changelog`, and `/help-center`. Locale/variant slug behavior must be verified in a draft before paths are frozen. |
| Top navigation | Native section tabs for the five destinations, with Home as the default section. |
| Separate sidebars | Native: each section is backed by its own Space and therefore owns its own sidebar. Documentation and API Reference remain independent. |
| Search | Site-wide search can span all Sections in the same site; this is the strongest match to the approved experience. [Search documentation](https://gitbook.com/docs/creating-content/searching-your-content). |
| Canonical / hreflang | GitBook manages canonical URLs, sitemap generation, redirects, and SEO-friendly slugs. Official documentation reviewed for this proposal does **not** explicitly confirm automatic `hreflang`; rendered English and `zh-TW` HTML must be inspected in a draft before publication. [SEO behavior](https://gitbook.com/docs/help-center/published-documentation/publishing/how-does-gitbook-handle-seo). |
| Maintenance overhead | Medium. Ten Spaces require bilingual parity checks, but shared site navigation and search reduce operational duplication. |
| Limitations | Requires plan approval and ten-space governance. Section and variant slug changes affect canonical URLs. Native GitBook customization cannot reproduce every mockup detail exactly. |
| Recommendation | **Recommended.** Best fit for the approved IA and lowest long-term navigation/search compromise. |

## Option B — Multiple Sites with a shared navigation pattern

| Dimension | Proposed implementation |
|---|---|
| Exact capability required | Five independently published Sites, each backed by English and Traditional Chinese variant Spaces; duplicated header links establish a shared visual navigation pattern. |
| Current plan support | **Supported on Basic** for separate Basic Sites and Variants. GitBook states that unlimited Basic sites may be published; paid capabilities are charged per linked Site. [Publishing on Basic](https://gitbook.com/docs/help-center/account-management/subscriptions/do-i-have-to-pay-to-publish-a-site). |
| Estimated additional cost | **$0** if all five remain Basic and use GitBook-provided URLs. If Premium branding/custom-domain capabilities are required on every Site, the current list price would be about **5 × $65 = $325/site-month total**, plus paid users. Confirm in checkout; do not purchase under this task. |
| Spaces / Sites | **10 Spaces, 5 Sites**: Home, Documentation, API Reference, Changelog, and Help Center, each with EN + `zh-TW`. |
| Language implementation | Two Variants per Site. Users may need to switch language again after crossing Sites unless every duplicated link preserves locale. |
| URL structure | Five GitBook site origins/slugs, or five custom domains/subdomains on paid plans. A manual routing convention could use `docs`, `api`, `changelog`, and `help` subdomains. |
| Top navigation | Manual links repeated on all Sites; visually consistent but not one native section navigation. Locale-aware links must be maintained twice. |
| Separate sidebars | Native per Site/Space, so Documentation and API Reference can differ. |
| Search | Search is isolated to each Site. GitBook AI/search does not span separately published Sites; a custom external search layer would be a separate project. |
| Canonical / hreflang | Canonical handling is per Site. Cross-site language pairing and `hreflang` remain unverified and would require draft HTML verification or an external SEO solution. |
| Maintenance overhead | High. Navigation, branding, redirects, locale links, analytics, and release state are duplicated across five Sites. |
| Limitations | Fragmented search and browsing history; link drift risk; custom-domain/branding cost can exceed one Ultimate Site; no native shared section state. |
| Recommendation | Viable fallback only when the Founder rejects Ultimate but accepts fragmented search and higher editorial overhead. |

## Option C — Current Basic plan with reduced IA

| Dimension | Proposed implementation |
|---|---|
| Exact capability required | One Basic Site with English and Traditional Chinese Variant Spaces; five landing-page destinations represented as page groups/cards inside one Space per language. |
| Current plan support | **Supported.** Variants are available; native Sections are not. |
| Estimated additional cost | **$0** at the current listed Basic price. |
| Spaces / Sites | **2 Spaces, 1 Site**: EN + `zh-TW`. |
| Language implementation | One language Variant per Space, with a language picker. |
| URL structure | One origin with ordinary page slugs such as `/documentation` and `/api-reference`; exact variant paths must be draft-verified. |
| Top navigation | Reduced approximation using the Home landing page and any Basic-supported header links. The approved persistent five-section navigation is not achievable natively. |
| Separate sidebars | **Not achievable.** Documentation and API Reference would share one long sidebar per language. Page groups can reduce scanning but do not create independent navigation surfaces. |
| Search | Search is limited to the selected Space/Variant; there is no section-aware global result model. |
| Canonical / hreflang | GitBook canonical/sitemap behavior applies. Automatic `hreflang` remains unverified and must not be claimed. |
| Maintenance overhead | Low operational overhead, but higher navigation debt as content grows. |
| Limitations | Fails the approved separate-sidebar requirement, weakens the five-destination IA, and recreates the long-sidebar problem. |
| Recommendation | Temporary holding pattern only. Do not present it as the approved target portal. |

## Decision

`RECOMMENDED_GITBOOK_OPTION=A`
`PLAN_UPGRADE_REQUIRED=true`
`PURCHASE_AUTHORIZED=false`

The next action is a Founder choice and budget approval—not a plan change. If Option A is selected, PM must issue a separate Draft GitBook implementation authorization before any configuration work begins.

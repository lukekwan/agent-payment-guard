# Round 2 Correction Report

## Executive result

The current portal direction is not ready to publish. The audit found **100 primary API/service operations**, including **85 production x402 paid operations**, while the current 97-page GitBook is centered on two candidate deploy_change operations that are not in production. The correction proposes a service-led portal, a three-tier test model, separate GitBook language variants, and a reduction to 55 or fewer hand-authored bilingual pages before adding generated approved reference.

No production API, OpenAPI, runtime, site customization, publication setting, or existing GitBook page was changed.

## Acceptance summary

| Requirement | Result | Evidence |
| --- | --- | --- |
| Public-looking/API routes inventoried | complete within defined 100-operation primary boundary; discovery aliases separately recorded | `PUBLIC-ENDPOINT-INVENTORY.md` |
| x402 operations inventoried | 85 production paid operations | endpoint inventory and runtime snapshots |
| Service families | 11 | `SERVICE-INVENTORY.md` |
| Per-endpoint authority/evidence/status | complete for 100 rows | endpoint inventory |
| Docs/code/catalog conflicts | 28 issues with severity/owner/action/blocker | gap matrix |
| Enum conflicts | five contract families and exactly three strategies | taxonomy matrix |
| Service-led IA | proposed; no pages rewritten | IA proposal |
| Sample/sandbox test plan | Tier A/B/C and option comparison | test console plan |
| Bilingual separation | current Basic plan + Variants capability verified; Option A recommended | bilingual plan |
| 97-page consolidation | every page classified | consolidation plan |
| Publication claims | claim-by-claim allowed/forbidden wording | claims matrix |

## Validation result

`npm test` passed 62/62 on the audited branch. Existing link/structure/syntax/dry-run results remain useful but are correctly scoped as:

`DOCUMENT_STRUCTURE_VALIDATION=PASS`

They are **not** a complete API correctness pass.

### Next-phase correctness validation plan

The next phase must automate and retain evidence for:

1. route inventory against source;
2. route against approved public OpenAPI;
3. public OpenAPI against GitBook;
4. catalog against documentation;
5. x402 discovery against documentation;
6. pricing parity;
7. request examples against JSON Schema;
8. response examples against JSON Schema;
9. cURL syntax;
10. JavaScript syntax;
11. Python syntax;
12. local links;
13. external links;
14. anchors;
15. bilingual page parity;
16. bilingual endpoint parity;
17. banned internal identifiers;
18. banned secrets;
19. candidate endpoint accidentally public;
20. unsafe production host in Test it;
21. noindex on preview;
22. GitBook draft-only state;
23. no implementation-file changes;
24. sandbox runtime smoke tests;
25. real HTTP response evidence;
26. mobile overflow;
27. dark/light readability;
28. site title/icon/branding readiness.

## Required handoff report

```text
TASK_ID=SG-DOCS-002
PHASE=PUBLIC_API_INVENTORY_AND_IA_CORRECTION
STATUS=COMPLETE

PR_NUMBER=1
PR_HEAD_SHA=PENDING_COMMIT
GITBOOK_REVISION=https://123-87.gitbook.io/signgate-api/~/revisions/mTpcAGNIJNMo94AfHwK2/
PUBLICATION_PERFORMED=false
MERGE_PERFORMED=false
PRODUCTION_API_CHANGED=false
PRODUCTION_OPENAPI_CHANGED=false
PRODUCTION_DEPLOYED=false
SITE_CUSTOMIZATION_CHANGED=false

ROUTES_DISCOVERED=100
RUNTIME_VERIFIED_ROUTES=84
VERIFIED_PUBLIC_ENDPOINTS=74
IMPLEMENTED_UNVERIFIED_ENDPOINTS=23
PROPOSED_CANDIDATE_ENDPOINTS=2
INTERNAL_ONLY_ENDPOINTS=1
PLANNED_ENDPOINTS=0
DEPRECATED_ENDPOINTS=0
UNKNOWN_ENDPOINTS=0

SERVICE_FAMILIES_DISCOVERED=11
X402_OPERATIONS_DISCOVERED=85
CATALOG_DOC_CONFLICTS=3
OPENAPI_ROUTE_CONFLICTS=4
DOC_ROUTE_CONFLICTS=5
PRICING_CONFLICTS=2
AUTH_CONFLICTS=2
STATUS_CLAIM_CONFLICTS=3
DECISION_TAXONOMY_CONFLICTS=5

CURRENT_MARKDOWN_PAGES=97
KEEP_PAGES=22
MERGE_PAGES=42
REWRITE_PAGES=33
MOVE_INTERNAL_PAGES=0
DEFER_PAGES=0

RECOMMENDED_SERVICE_LED_IA=Eleven service families with VERIFIED_PUBLIC-only generated reference; deploy_change reduced to one Candidate Preview Use Case
RECOMMENDED_TEST_CONSOLE=Static Tier A sample runner plus downloadable cURL now; allowlisted sandbox proxy for Tier B after security approval; production examples only by default
RECOMMENDED_BILINGUAL_STRUCTURE=Two GitBook Spaces exposed as English and Traditional Chinese language variants with separate navigation and parity CI
RECOMMENDED_CONTENT_REDUCTION=Reduce 97 hand-authored bilingual pages to 55 or fewer before adding generated approved endpoint reference

FILES_CREATED=10
FILES_CHANGED=11
```

`PR_HEAD_SHA` is intentionally populated only after the correction commit succeeds. The existing GitBook revision remains unchanged because the ten audit files are outside the configured public GitBook root and no publication was authorized. The eleventh changed file is the existing validation evidence, updated to label its scope as document structure rather than API correctness.

## Stop condition

This correction phase ends with these ten audit documents. Do not rewrite the public GitBook, enable Test it, create language variants, publish, merge, or change runtime/contracts until Codex PM reviews this packet.

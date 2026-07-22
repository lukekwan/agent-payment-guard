# Content Consolidation Plan

**Scope:** all 97 Markdown files under `docs/gitbook/public` (1 shared `SUMMARY.md`, 48 English, 48 Traditional Chinese).  
**Constraint:** this is a plan; no historical/public page is deleted or moved in this round.

Statuses: **KEEP** retains an independent developer task but still needs truth review; **MERGE** folds the page into a named service/concept/preview destination; **REWRITE** keeps the need but replaces candidate-centric claims; **MOVE_INTERNAL**, **DELETE_CANDIDATE**, and **DEFER** remain available but no whole page was assigned those statuses here. Sensitive fragments inside retained pages still move to internal docs during rewrite.

## Shared navigation

| Page | Status | Target / reason |
| --- | --- | --- |
| `SUMMARY.md` | REWRITE | Replace combined bilingual tree with locale-specific variant navigation |

## English pages

| Page | Status | Target / reason |
| --- | --- | --- |
| `en/README.md` | REWRITE | Service-led homepage and truthful availability |
| `en/api-reference/consume-decision.md` | MERGE | Preview Use Case: deploy_change |
| `en/api-reference/create-decision.md` | MERGE | Preview Use Case: deploy_change |
| `en/api-reference/errors.md` | MERGE | Candidate-specific errors in preview guide; shared errors generated from approved OA |
| `en/api-reference/overview.md` | MERGE | Replace with approved generated service reference landing |
| `en/api-reference/reason-codes.md` | MERGE | Candidate reason codes in preview guide |
| `en/api-reference/request-schemas.md` | MERGE | Candidate schemas in preview guide |
| `en/api-reference/response-schemas.md` | MERGE | Candidate schemas in preview guide |
| `en/api-reference/schemas.md` | MERGE | Remove duplicate schema page; generate approved schemas |
| `en/concepts/action-binding.md` | MERGE | Preview use case until a platform-wide contract exists |
| `en/concepts/atomic-consume.md` | MERGE | Preview use case; endpoint-specific claim |
| `en/concepts/decision-lifecycle.md` | REWRITE | Service-local lifecycle comparison |
| `en/concepts/decision-model.md` | REWRITE | Taxonomy-aware decisions concept |
| `en/concepts/decision-values.md` | REWRITE | Service-local enum table |
| `en/concepts/fail-closed.md` | KEEP | Independent security/control task |
| `en/concepts/idempotency.md` | KEEP | Independent integration task, qualified by service |
| `en/concepts/mandates-and-evidence.md` | REWRITE | Cross-service concept with actual inputs/outputs |
| `en/examples/allow-flow.md` | MERGE | Outcome examples page with service labels |
| `en/examples/approval-flow.md` | MERGE | Outcome examples page with service labels |
| `en/examples/curl.md` | REWRITE | Approved services + safe environment examples |
| `en/examples/errors.md` | MERGE | Shared Errors and request IDs |
| `en/examples/javascript.md` | REWRITE | Approved SDK/HTTP surfaces only |
| `en/examples/python.md` | REWRITE | Approved SDK/HTTP surfaces only |
| `en/getting-started/authentication.md` | REWRITE | Endpoint-level x402/API-key/owner/agent boundary |
| `en/getting-started/consume-allow.md` | MERGE | Preview use case; not universal onboarding |
| `en/getting-started/first-decision.md` | MERGE | First safe request using verified sample/service |
| `en/getting-started/introduction.md` | REWRITE | Choose an API service |
| `en/getting-started/quickstart.md` | REWRITE | Tier A sample then approved sandbox path |
| `en/guides/downstream-failure.md` | MERGE | Preview use case until lifecycle authority is broader |
| `en/guides/executor-integration.md` | MERGE | Preview use case plus generic enforcement boundary |
| `en/guides/expired-decisions.md` | MERGE | Preview use case; service-specific expiry |
| `en/guides/fingerprints.md` | MERGE | Preview use case; no universal fingerprint contract |
| `en/guides/preview-deployment.md` | MERGE | Single Preview Use Case: deploy_change |
| `en/guides/require-approval.md` | REWRITE | Compare service-local approval states |
| `en/guides/retries.md` | REWRITE | Method/service-specific retry matrix |
| `en/guides/safe-execution.md` | REWRITE | Enforcement boundaries across payment/signer/use case |
| `en/resources/api-status.md` | REWRITE | Runtime surfaces, environment, dated authority |
| `en/resources/changelog.md` | KEEP | Independent operational resource |
| `en/resources/support.md` | KEEP | Independent support destination |
| `en/resources/versioning.md` | KEEP | Contract/version authority |
| `en/security/audit.md` | KEEP | Independent operational/security task |
| `en/security/authentication.md` | REWRITE | Actual service auth boundaries |
| `en/security/overview.md` | KEEP | Trust boundary landing |
| `en/security/preview-limitations.md` | MERGE | Preview Use Case limitations |
| `en/security/replay-protection.md` | KEEP | Independent security task, service-qualified |
| `en/security/retention.md` | KEEP | Independent policy/operational task |
| `en/security/secret-handling.md` | KEEP | Independent credential safety task |
| `en/security/tenant-isolation.md` | KEEP | Independent security task |

## Traditional Chinese pages

| Page | Status | Target / reason |
| --- | --- | --- |
| `zh-TW/README.md` | REWRITE | 服務導向首頁與真實 availability |
| `zh-TW/api-reference/consume-decision.md` | MERGE | Preview Use Case：deploy_change |
| `zh-TW/api-reference/create-decision.md` | MERGE | Preview Use Case：deploy_change |
| `zh-TW/api-reference/errors.md` | MERGE | Candidate errors 合併至 preview guide；正式錯誤由核准 OA 產生 |
| `zh-TW/api-reference/overview.md` | MERGE | 改為已核准 service reference landing |
| `zh-TW/api-reference/reason-codes.md` | MERGE | Candidate reason codes 合併至 preview guide |
| `zh-TW/api-reference/request-schemas.md` | MERGE | Candidate schemas 合併至 preview guide |
| `zh-TW/api-reference/response-schemas.md` | MERGE | Candidate schemas 合併至 preview guide |
| `zh-TW/api-reference/schemas.md` | MERGE | 移除重複 schema page；由核准 schema 產生 |
| `zh-TW/concepts/action-binding.md` | MERGE | 未有平台級 contract 前歸入 preview use case |
| `zh-TW/concepts/atomic-consume.md` | MERGE | Endpoint-specific preview claim |
| `zh-TW/concepts/decision-lifecycle.md` | REWRITE | 各服務 lifecycle 比較 |
| `zh-TW/concepts/decision-model.md` | REWRITE | Taxonomy-aware decision concept |
| `zh-TW/concepts/decision-values.md` | REWRITE | 各服務 enum 對照 |
| `zh-TW/concepts/fail-closed.md` | KEEP | 獨立安全與控制任務 |
| `zh-TW/concepts/idempotency.md` | KEEP | 獨立整合任務，按服務限定 |
| `zh-TW/concepts/mandates-and-evidence.md` | REWRITE | 跨服務概念與真實 inputs/outputs |
| `zh-TW/examples/allow-flow.md` | MERGE | 具服務標籤的 outcome examples |
| `zh-TW/examples/approval-flow.md` | MERGE | 具服務標籤的 outcome examples |
| `zh-TW/examples/curl.md` | REWRITE | 僅核准服務與安全環境 |
| `zh-TW/examples/errors.md` | MERGE | 共用 Errors and request IDs |
| `zh-TW/examples/javascript.md` | REWRITE | 僅核准 SDK/HTTP surface |
| `zh-TW/examples/python.md` | REWRITE | 僅核准 SDK/HTTP surface |
| `zh-TW/getting-started/authentication.md` | REWRITE | Endpoint-level x402/API-key/owner/agent boundary |
| `zh-TW/getting-started/consume-allow.md` | MERGE | Preview use case，不作通用 onboarding |
| `zh-TW/getting-started/first-decision.md` | MERGE | 改用 verified sample/service 的第一個安全 request |
| `zh-TW/getting-started/introduction.md` | REWRITE | 選擇 API service |
| `zh-TW/getting-started/quickstart.md` | REWRITE | Tier A sample，再到核准 sandbox |
| `zh-TW/guides/downstream-failure.md` | MERGE | 先歸入 preview use case |
| `zh-TW/guides/executor-integration.md` | MERGE | Preview use case 與一般 enforcement boundary |
| `zh-TW/guides/expired-decisions.md` | MERGE | Preview use case；expiry 依服務而異 |
| `zh-TW/guides/fingerprints.md` | MERGE | Preview use case；無平台級 fingerprint contract |
| `zh-TW/guides/preview-deployment.md` | MERGE | 單一 Preview Use Case：deploy_change |
| `zh-TW/guides/require-approval.md` | REWRITE | 比較各服務 approval state |
| `zh-TW/guides/retries.md` | REWRITE | Method/service-specific retry matrix |
| `zh-TW/guides/safe-execution.md` | REWRITE | 付款、簽章與 preview 的 enforcement boundary |
| `zh-TW/resources/api-status.md` | REWRITE | Runtime surface、environment、dated authority |
| `zh-TW/resources/changelog.md` | KEEP | 獨立營運資源 |
| `zh-TW/resources/support.md` | KEEP | 獨立支援入口 |
| `zh-TW/resources/versioning.md` | KEEP | Contract/version authority |
| `zh-TW/security/audit.md` | KEEP | 獨立營運／安全任務 |
| `zh-TW/security/authentication.md` | REWRITE | 真實 service auth boundaries |
| `zh-TW/security/overview.md` | KEEP | Trust boundary landing |
| `zh-TW/security/preview-limitations.md` | MERGE | Preview Use Case limitations |
| `zh-TW/security/replay-protection.md` | KEEP | 獨立安全任務，按服務限定 |
| `zh-TW/security/retention.md` | KEEP | 獨立政策／營運任務 |
| `zh-TW/security/secret-handling.md` | KEEP | 獨立 credential safety 任務 |
| `zh-TW/security/tenant-isolation.md` | KEEP | 獨立安全任務 |

## Counts and reduction target

| Status | Pages |
| --- | ---: |
| KEEP | 22 |
| MERGE | 42 |
| REWRITE | 33 |
| MOVE_INTERNAL | 0 whole pages |
| DELETE_CANDIDATE | 0 |
| DEFER | 0 |
| **Total** | **97** |

The initial target is **55 or fewer hand-authored pages across both locales** (roughly 27 per locale plus shared generation/config), plus generated approved endpoint reference. That is at least a 43% reduction from 97 hand-authored Markdown pages. It is a planning target, not deletion authorization.

Internal identifiers embedded in any KEEP/REWRITE/MERGE source must be moved to private docs or removed during execution even though no whole current page is classified `MOVE_INTERNAL`.

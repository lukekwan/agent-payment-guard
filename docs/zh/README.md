# SignGate API 文件

狀態：preview。Production deployment 尚未被授權。

SignGate v0.1 是 `deploy_change` action 的 policy decision point。它會評估結構化 action request，並回傳三種 decision value 之一：

- `ALLOW`：只有在 atomic consume 成功後，完全相同的 bound action 才可以繼續。
- `REQUIRE_APPROVAL`：不授權執行。必須取得受信任的 Founder approval grant，並用新的 decision request 重新送審。
- `DENY`：不授權執行。

所有非有效 `ALLOW` 結果都必須 fail closed。只有 decision response 不足以執行。ALLOW is not executable until atomic consume succeeds。`ALLOW` 是 action-bound、time-limited、single-use，而且在 `POST /v1/decisions/{decision_id}/consume` 成功前不可執行。

## Public Preview Endpoints

### `POST /v1/decisions`

為 `deploy_change` request 建立 policy decision。

當已驗證的 agent 要求 SignGate 評估 pending preview deployment 時使用此 endpoint。Request 必須包含：

- `contract_version: "0.1"`
- organization-scoped `request_id`
- 與 API credential 綁定 organization 相同的 `organization_id`
- 已驗證的 agent identity claims
- 完整的 `deploy_change` action target 與 parameters
- 有效 mandate，例如 `deploy:preview`
- 綁定 commit 且 passing 的 test evidence

服務會先完成 strict JSON intake、duplicate-key rejection、schema validation、RFC 8785 canonicalization、SHA-256 fingerprinting、policy evaluation、persistence 與 audit，才會用 HTTP 200 回傳 policy decision。

HTTP 200 不代表已授權執行。只有 response decision 是 `ALLOW`、wrapper 驗證完全相同的 bound action 與 fingerprint，且 atomic consume 成功後，才授權 preview/local 執行。

### `POST /v1/decisions/{decision_id}/consume`

在 executor 開始 irreversible action 前，消耗一個有效的 `ALLOW` decision。

Consume request 必須匹配：

- organization
- decision ID
- action fingerprint
- policy version
- execution attempt ID

Decision 必須仍是 `ALLOW`、`AVAILABLE`、未過期、且未使用。同一個 attempt retry 會回傳原始 receipt。不同 attempt 在 consumption 後會以 conflict semantics 失敗。

## Internal Endpoint Boundary

`POST /internal/dogfood/founder-approval-grants` 僅限內部使用。它不得出現在 public OpenAPI specification 或 public examples。Internal specification 可以為 Founder dogfood workflow 記錄此 endpoint。

## Policy Summary

- 有效 preview deployment、有效 `deploy:preview` mandate、passing tests、沒有 protected-surface flags：`ALLOW`。
- `touches_permissions=true`：其他條件有效時回傳 `REQUIRE_APPROVAL`。
- `touches_dns=true`：其他條件有效時回傳 `REQUIRE_APPROVAL`。
- `touches_credentials=true` 且沒有 raw secrets：其他條件有效時回傳 `REQUIRE_APPROVAL`。
- `touches_secrets=true`：`DENY`。
- secret-like 或 raw credential material：reject 或 deny，且不保留 secret。
- failed tests：`DENY`。
- 缺少 mandatory test evidence：`DENY`。
- invalid 或 expired mandate：`DENY`。
- unknown target 或 environment：`DENY`。
- Founder Gate 4 前的 production intent：永遠不得取得 executable `ALLOW`。

Founder policy approval 不等於 Founder Gate 4。DOC-SG-001 不授權 production deployment。

## Authentication

SignGate preview 使用 bearer API key。Credential 會綁定 organization、principal identity、principal type、scope、status、digest version 與 credential prefix。Raw secrets 不會存入 D1，也不得記錄到 log。

Request `organization_id` 是必填，且必須符合 authenticated credential 的 organization。Cross-tenant failure 不揭露外部資源是否存在。

Required scopes：

- Decision creation：`decision:create`
- Atomic consume：`decision:consume`
- Founder dogfood grant：`approval:founder:deploy_change`，且 identity 必須是 Founder approver

## Fingerprinting

SignGate 會對 RFC 8785 canonical fingerprint envelope 做 SHA-256。Envelope 包含：

- contract version
- authenticated organization
- authenticated/resolved agent identity
- 完整 normalized deploy_change action

`changed_paths` 和 `changed_routes` 使用 set semantics：先驗證每個 string、移除 exact duplicates、deterministic sorting、保留 case-distinct values，並只 fingerprint normalized copy。

未知 execution-relevant fields 會在 fingerprinting 前被拒絕。

## Error Model

只有 HTTP 200 response 會包含 policy decision enum。Error response 不包含 `decision`。

- `400`：malformed JSON 或 invalid UTF-8
- `401`：authentication failure
- `403`：authorization failure、wrong scope 或 tenant mismatch
- `409`：request-ID、grant-reuse 或 consume conflict
- `422`：schema 或 contract validation failure
- `500`：invariant 或 persistence failure
- `503`：policy 或 dependency unavailable

`500` 和 `503` response 不會 mint `ALLOW` artifact，也不得被 audit 成 policy `DENY`。

## Commerce/x402 Status

DOC-SG-001 中 commerce/x402 enforcement 不是 live。既有 commerce preflight surface 保留為 documented non-live compatibility stub。Payment enforcement、x402 purchase execution、signer integration 與獨立 commerce policy engine 都不在本 scope。

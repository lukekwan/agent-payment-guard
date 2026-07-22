# Decision 生命週期

SignGate 將 policy evaluation 與實際 execution 分離。HTTP request 成功本身不代表 deployment 已獲授權。

1. 將完整 action 送至 [`POST /v1/decisions`](api-reference/create-decision.md)。
2. 驗證回傳的 decision 與完整 `bound_action`。
3. 若為 `REQUIRE_APPROVAL` 或 `DENY`，立即停止。
4. 若為 `ALLOW`，驗證 action fingerprint 與 expiry。
5. 在 irreversible action 前立即呼叫 [`POST /v1/decisions/{decision_id}/consume`](api-reference/consume-decision.md)。
6. 只有 atomic consume 回傳有效 receipt 後才可執行。

## Decision 意義

| Decision | Execution directive | 意義 |
| --- | --- | --- |
| `ALLOW` | `EXECUTE`，最多一次 | 只有 atomic consume 成功後才可以繼續。 |
| `REQUIRE_APPROVAL` | `DO_NOT_EXECUTE` | 不授權執行；取得受信任的 approval grant 後，必須送出全新的 decision request。 |
| `DENY` | `DO_NOT_EXECUTE` | 不授權執行。 |

`ALLOW` 是 action-bound、有效時間最多 15 分鐘且 single-use。所有非有效 `ALLOW` 結果都必須 fail closed。

## Fingerprinting

SignGate 對 RFC 8785 canonical envelope 計算 SHA-256。Envelope 包含 contract version、authenticated organization、authenticated 或 resolved agent identity，以及完整 normalized action。

`changed_paths` 與 `changed_routes` 採 set semantics：移除完全相同的重複值、進行 deterministic sorting，並保留大小寫不同的值。未知 execution-relevant field 會在 fingerprinting 前被拒絕。

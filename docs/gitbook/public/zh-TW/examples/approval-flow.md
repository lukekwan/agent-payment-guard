---
description: 安全處理 REQUIRE_APPROVAL，並在核准後重新 evaluation。
---

# 完整 REQUIRE_APPROVAL flow

`REQUIRE_APPROVAL` 會暫停 execution。取得 authorized approval 後，client 必須建立新的 decision request。

{% hint style="warning" %}
原 decision 不可 consume，也不得在 local 轉換成 ALLOW。
{% endhint %}

## Client pattern

{% tabs %}
{% tab title="cURL" %}
```bash
decision="$(jq -r '.decision' <<<"$decision_response")"
if [[ "$decision" == "REQUIRE_APPROVAL" ]]; then
  echo "Execution paused; request authorized approval." >&2
  exit 2
fi
[[ "$decision" == "ALLOW" ]] || exit 1
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
if (result.decision === "REQUIRE_APPROVAL") {
  throw new Error("Execution paused; obtain authorized approval and submit a fresh request");
}
if (result.decision !== "ALLOW") throw new Error("Execution stopped");
```
{% endtab %}

{% tab title="Python" %}
```python
if result.get("decision") == "REQUIRE_APPROVAL":
    raise RuntimeError("Execution paused; obtain authorized approval and submit a fresh request")
if result.get("decision") != "ALLOW":
    raise RuntimeError("Execution stopped")
```
{% endtab %}
{% endtabs %}

## 核准後

1. 取得 authorized approval evidence。
2. 重建目前完整 action 與 fresh evidence。
3. 使用新的 `request_id` 送出 fresh decision request。
4. 只有新的 response 為 verified `ALLOW` 時才 consume。

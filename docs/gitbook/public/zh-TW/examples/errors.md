---
description: 在 cURL、JavaScript 與 Python 中 fail closed。
---

# 常見 error handling

任何 transport、HTTP、parse、schema、decision 或 consume failure 都不得執行。

{% tabs %}
{% tab title="cURL" %}
```bash
response="$(curl --fail-with-body --silent --show-error ... )" || {
  echo "Execution stopped: SignGate unavailable or refused request" >&2
  exit 1
}
jq -e '.decision == "ALLOW"' <<<"$response" >/dev/null || exit 1
```
{% endtab %}

{% tab title="JavaScript" %}
```javascript
const response = await fetch(url, options).catch(() => null);
if (!response?.ok) throw new Error("Execution stopped");
const body = await response.json().catch(() => null);
if (body?.decision !== "ALLOW") throw new Error("Execution stopped");
```
{% endtab %}

{% tab title="Python" %}
```python
try:
    result = call_signgate()
except Exception as exc:
    raise RuntimeError("Execution stopped") from exc
if result.get("decision") != "ALLOW":
    raise RuntimeError("Execution stopped")
```
{% endtab %}
{% endtabs %}

## Safe logging

只記錄 status、request/decision/audit IDs 與 reason codes。不要記錄 authorization header、API key 或 raw sensitive content。

---
description: Fail closed in cURL, JavaScript, and Python.
---

# Common error handling

Transport, HTTP, parsing, schema, decision, and consume failures must all prevent execution.

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

Log only status, request/decision/audit IDs, and reason codes. Do not log authorization headers, API keys, or raw sensitive content.

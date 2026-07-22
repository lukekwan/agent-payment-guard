---
description: Handle REQUIRE_APPROVAL safely and reevaluate after approval.
---

# Complete REQUIRE_APPROVAL flow

`REQUIRE_APPROVAL` pauses execution. After authorized approval is obtained, the client must create a new decision request.

{% hint style="warning" %}
The original decision cannot be consumed or converted to ALLOW locally.
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

## After approval

1. Obtain authorized approval evidence.
2. Rebuild the current complete action and fresh evidence.
3. Submit a fresh decision request with a new `request_id`.
4. Consume only if the new response is a verified `ALLOW`.

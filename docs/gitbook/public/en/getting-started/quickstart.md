---
description: Inspect a credential-free safe sample without calling production.
---

# Start with a safe sample

This onboarding path is available now. It shows request and response syntax but does not issue a key, call a sandbox, make a payment, or execute a production request.

{% hint style="warning" %}
There is no verified sandbox key flow, isolated sandbox Base URL, or authorized production browser Test it. The host below is reserved and cannot be live.
{% endhint %}

## 1. Choose a service

Start with [Agentic Commerce Preflight](../api-reference/services/agentic-commerce.md), whose repository includes a credential-free sample representation.

## 2. View the sample request

```json
{"agent_role":"buyer","product_category":"api","amount_usdc":"0.025"}
```

## 3. Copy request syntax

{% tabs %}
{% tab title="cURL" %}
```bash
curl --fail-with-body -X POST 'https://api.example.invalid/v1/agentic-commerce/preflight' \
  -H 'Content-Type: application/json' \
  --data '{"agent_role":"buyer","product_category":"api","amount_usdc":"0.025"}'
```
{% endtab %}
{% tab title="JavaScript" %}
```javascript
const response = await fetch("https://api.example.invalid/v1/agentic-commerce/preflight", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ agent_role: "buyer", product_category: "api", amount_usdc: "0.025" })
});
console.log(await response.json());
```
{% endtab %}
{% tab title="Python" %}
```python
import json
from urllib.request import Request, urlopen

body = json.dumps({"agent_role": "buyer", "product_category": "api", "amount_usdc": "0.025"}).encode()
request = Request("https://api.example.invalid/v1/agentic-commerce/preflight", data=body, headers={"Content-Type": "application/json"}, method="POST")
with urlopen(request, timeout=10) as response:
    print(response.read().decode("utf-8"))
```
{% endtab %}
{% endtabs %}

## 4. Inspect the sample response

The sample preserves the service vocabulary: `ALLOW`, `REQUIRE_APPROVAL`, or `DENY`. It is a sample presentation, not proof of production availability.

## 5. Stop, approve, or continue

- `ALLOW`: continue only within the exact action and signer directive.
- `REQUIRE_APPROVAL`: pause and obtain an authorized approval through an approved flow.
- `DENY`: stop.

[Explore all five API services](../api-reference/overview.md)

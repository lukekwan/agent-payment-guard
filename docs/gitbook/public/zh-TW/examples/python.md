---
description: 使用 Python 完整執行 fail-closed ALLOW flow。
---

# Python

範例會建立 decision、拒絕所有非 `ALLOW` 結果、驗證 bound action、consume，並檢查 receipt。

{% hint style="info" %}
**Primary constraint:** 請先替換 Preview URL 與 API key；不得將 credential 寫入檔案。
{% endhint %}

## 環境

```bash
export SIGNGATE_BASE_URL="https://preview.example.signgate"
export SIGNGATE_API_KEY="<preview-api-key>"
```

## 完整範例

```python
import json
import os
import urllib.error
import urllib.request

BASE_URL = os.environ["SIGNGATE_BASE_URL"]
API_KEY = os.environ["SIGNGATE_API_KEY"]

with open("docs/gitbook/public/assets/decision-request.json", encoding="utf-8") as source:
    decision_request = json.load(source)

def post(path, body):
    request = urllib.request.Request(
        BASE_URL + path,
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError) as exc:
        raise RuntimeError("Execution stopped: SignGate request failed") from exc

decision = post("/v1/decisions", decision_request)
if decision.get("decision") != "ALLOW":
    raise RuntimeError(f"Execution stopped: {decision.get('decision', 'ERROR')}")
if decision.get("bound_action") != decision_request["action"]:
    raise RuntimeError("Execution stopped: bound action mismatch")

consumed = post(f"/v1/decisions/{decision['decision_id']}/consume", {
    "contract_version": "0.1",
    "organization_id": decision_request["organization_id"],
    "action_fingerprint": decision["action_fingerprint"],
    "policy_version": decision["policy_version"],
    "execution_attempt_id": "exec_preview_001",
})
if not consumed.get("receipt", {}).get("consume_receipt_id"):
    raise RuntimeError("Execution stopped: invalid receipt")
print("Authorized for the exact bound action", consumed["receipt"])
```

## 執行

```bash
python3 docs/gitbook/public/examples/signgate_allow_flow.py
```

## 安全行為

Transport error、non-`ALLOW`、binding mismatch、consume error 或 invalid receipt 都會以 non-zero/exception 停止。

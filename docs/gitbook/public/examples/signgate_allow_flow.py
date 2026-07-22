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

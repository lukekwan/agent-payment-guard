import { readFile } from "node:fs/promises";

const baseUrl = process.env.SIGNGATE_BASE_URL;
const apiKey = process.env.SIGNGATE_API_KEY;
if (!baseUrl || !apiKey) throw new Error("Missing SignGate environment variables");

const request = JSON.parse(await readFile("docs/gitbook/public/assets/decision-request.json", "utf8"));
const post = async (path, body) => {
  const response = await fetch(baseUrl + path, {
    method: "POST",
    headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) throw new Error("SignGate " + response.status);
  return payload;
};

const decision = await post("/v1/decisions", request);
if (decision.decision !== "ALLOW") throw new Error("Execution stopped: " + decision.decision);
if (JSON.stringify(decision.bound_action) !== JSON.stringify(request.action)) {
  throw new Error("Execution stopped: bound action mismatch");
}

const consumed = await post("/v1/decisions/" + decision.decision_id + "/consume", {
  contract_version: "0.1",
  organization_id: request.organization_id,
  action_fingerprint: decision.action_fingerprint,
  policy_version: decision.policy_version,
  execution_attempt_id: "exec_preview_001"
});
if (!consumed.receipt?.consume_receipt_id) throw new Error("Execution stopped: invalid receipt");
console.log("Authorized for the exact bound action", consumed.receipt);

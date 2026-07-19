#!/usr/bin/env bash
set -euo pipefail

: "${SIGNGATE_BASE_URL:?Set SIGNGATE_BASE_URL}"
: "${SIGNGATE_API_KEY:?Set SIGNGATE_API_KEY}"

request_file="docs/gitbook/public/assets/decision-request.json"
decision_response="$(curl --fail-with-body --silent --show-error \
  "$SIGNGATE_BASE_URL/v1/decisions" \
  -H "Authorization: Bearer $SIGNGATE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "@$request_file")"

decision="$(jq -r '.decision // empty' <<<"$decision_response")"
if [[ "$decision" != "ALLOW" ]]; then
  echo "Execution stopped: ${decision:-ERROR}" >&2
  exit 1
fi

decision_id="$(jq -r '.decision_id' <<<"$decision_response")"
fingerprint="$(jq -r '.action_fingerprint' <<<"$decision_response")"
policy_version="$(jq -r '.policy_version' <<<"$decision_response")"

consume_body="$(jq -n \
  --arg organization_id "org_example" \
  --arg action_fingerprint "$fingerprint" \
  --arg policy_version "$policy_version" \
  '{contract_version:"0.1", organization_id:$organization_id, action_fingerprint:$action_fingerprint, policy_version:$policy_version, execution_attempt_id:"exec_preview_001"}')"

consume_response="$(curl --fail-with-body --silent --show-error \
  "$SIGNGATE_BASE_URL/v1/decisions/$decision_id/consume" \
  -H "Authorization: Bearer $SIGNGATE_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary "$consume_body")"

receipt_id="$(jq -r '.receipt.consume_receipt_id // empty' <<<"$consume_response")"
[[ -n "$receipt_id" ]] || { echo "Execution stopped: invalid receipt" >&2; exit 1; }
echo "Authorized for the exact bound action: receipt=$receipt_id"

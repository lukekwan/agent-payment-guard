#!/usr/bin/env sh
set -eu

: "${SIGNGATE_BASE_URL:=https://preview.signgate.local}"
: "${SIGNGATE_EXECUTOR_KEY:?set SIGNGATE_EXECUTOR_KEY to a preview decision:consume credential}"
: "${SIGNGATE_DECISION_ID:?set SIGNGATE_DECISION_ID from a 200 + ALLOW response}"
: "${SIGNGATE_ACTION_FINGERPRINT:?set SIGNGATE_ACTION_FINGERPRINT from the decision response}"
: "${SIGNGATE_POLICY_VERSION:=deploy_policy_2026_07_18_01}"
: "${SIGNGATE_EXECUTION_ATTEMPT_ID:=exec_doc_001}"

curl -sS "$SIGNGATE_BASE_URL/v1/decisions/$SIGNGATE_DECISION_ID/consume" \
  -H "Authorization: Bearer $SIGNGATE_EXECUTOR_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @- <<JSON
{
  "contract_version": "0.1",
  "organization_id": "org_nomos_labs",
  "action_fingerprint": "$SIGNGATE_ACTION_FINGERPRINT",
  "policy_version": "$SIGNGATE_POLICY_VERSION",
  "execution_attempt_id": "$SIGNGATE_EXECUTION_ATTEMPT_ID"
}
JSON

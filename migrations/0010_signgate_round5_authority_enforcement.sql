INSERT OR IGNORE INTO signgate_audit_events
  (audit_id, organization_id, event_type, principal_id, decision_id, request_id, action_fingerprint, policy_version, reason_codes_json, metadata_json, occurred_at, delete_after)
SELECT
  'audit_round5_authority_invalidation_' || decision_id,
  organization_id,
  'decision.authority_invalidated',
  NULL,
  decision_id,
  request_id,
  action_fingerprint,
  policy_version,
  '["AUTHORITY_PROVENANCE_INCOMPLETE"]',
  '{"migration":"0010_signgate_round5_authority_enforcement","redacted":true}',
  created_at,
  delete_after
FROM signgate_decisions
WHERE decision = 'ALLOW'
  AND state = 'AVAILABLE'
  AND (
    authority_snapshot_fingerprint IS NULL
    OR authority_snapshot_fingerprint = ''
    OR length(authority_snapshot_fingerprint) != 71
    OR substr(authority_snapshot_fingerprint, 1, 7) != 'sha256:'
    OR substr(authority_snapshot_fingerprint, 8) != lower(substr(authority_snapshot_fingerprint, 8))
    OR authority_snapshot_json IS NULL
    OR authority_snapshot_json = ''
    OR authority_snapshot_json = '{}'
    OR NOT json_valid(authority_snapshot_json)
    OR credential_id IS NULL
    OR credential_id = ''
    OR mandate_id IS NULL
    OR mandate_id = ''
    OR authorized_target_id IS NULL
    OR authorized_target_id = ''
    OR evidence_ids_json IS NULL
    OR evidence_ids_json = ''
    OR evidence_ids_json = '[]'
    OR NOT json_valid(evidence_ids_json)
    OR CASE
      WHEN json_valid(authority_snapshot_json) AND json_valid(evidence_ids_json) THEN (
        json_extract(authority_snapshot_json, '$.snapshot_version') IS NOT 'signgate_authority_snapshot_v1'
        OR json_extract(authority_snapshot_json, '$.credential.credential_id') IS NOT credential_id
        OR json_extract(authority_snapshot_json, '$.mandate.mandate_id') IS NOT mandate_id
        OR json_extract(authority_snapshot_json, '$.authorized_target.target_id') IS NOT authorized_target_id
        OR json_type(authority_snapshot_json, '$.trusted_evidence') IS NOT 'array'
        OR json_array_length(authority_snapshot_json, '$.trusted_evidence') < 1
        OR json_array_length(evidence_ids_json) != json_array_length(authority_snapshot_json, '$.trusted_evidence')
        OR json_extract(authority_snapshot_json, '$.trusted_evidence[0].evidence_id') IS NOT json_extract(evidence_ids_json, '$[0]')
      )
      ELSE 1
    END
  );

UPDATE signgate_decisions
SET state = 'NON_EXECUTABLE'
WHERE decision = 'ALLOW'
  AND state = 'AVAILABLE'
  AND (
    authority_snapshot_fingerprint IS NULL
    OR authority_snapshot_fingerprint = ''
    OR length(authority_snapshot_fingerprint) != 71
    OR substr(authority_snapshot_fingerprint, 1, 7) != 'sha256:'
    OR substr(authority_snapshot_fingerprint, 8) != lower(substr(authority_snapshot_fingerprint, 8))
    OR authority_snapshot_json IS NULL
    OR authority_snapshot_json = ''
    OR authority_snapshot_json = '{}'
    OR NOT json_valid(authority_snapshot_json)
    OR credential_id IS NULL
    OR credential_id = ''
    OR mandate_id IS NULL
    OR mandate_id = ''
    OR authorized_target_id IS NULL
    OR authorized_target_id = ''
    OR evidence_ids_json IS NULL
    OR evidence_ids_json = ''
    OR evidence_ids_json = '[]'
    OR NOT json_valid(evidence_ids_json)
    OR CASE
      WHEN json_valid(authority_snapshot_json) AND json_valid(evidence_ids_json) THEN (
        json_extract(authority_snapshot_json, '$.snapshot_version') IS NOT 'signgate_authority_snapshot_v1'
        OR json_extract(authority_snapshot_json, '$.credential.credential_id') IS NOT credential_id
        OR json_extract(authority_snapshot_json, '$.mandate.mandate_id') IS NOT mandate_id
        OR json_extract(authority_snapshot_json, '$.authorized_target.target_id') IS NOT authorized_target_id
        OR json_type(authority_snapshot_json, '$.trusted_evidence') IS NOT 'array'
        OR json_array_length(authority_snapshot_json, '$.trusted_evidence') < 1
        OR json_array_length(evidence_ids_json) != json_array_length(authority_snapshot_json, '$.trusted_evidence')
        OR json_extract(authority_snapshot_json, '$.trusted_evidence[0].evidence_id') IS NOT json_extract(evidence_ids_json, '$[0]')
      )
      ELSE 1
    END
  );

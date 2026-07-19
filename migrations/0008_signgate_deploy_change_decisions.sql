CREATE TABLE IF NOT EXISTS signgate_api_credentials (
  credential_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  principal_id TEXT NOT NULL,
  principal_type TEXT NOT NULL CHECK (principal_type IN ('agent', 'executor', 'founder_approver')),
  key_prefix TEXT NOT NULL UNIQUE,
  key_digest TEXT NOT NULL,
  digest_version TEXT NOT NULL DEFAULT 'sg_key_digest_v1',
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'rotating', 'revoked')),
  rotated_from_credential_id TEXT,
  rotation_expires_at TEXT,
  revoked_at TEXT,
  last_used_at TEXT,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signgate_api_credentials_lookup
  ON signgate_api_credentials (key_prefix, status);

CREATE INDEX IF NOT EXISTS idx_signgate_api_credentials_retention
  ON signgate_api_credentials (organization_id, delete_after, principal_id);

CREATE TABLE IF NOT EXISTS signgate_mandates (
  organization_id TEXT NOT NULL,
  mandate_id TEXT NOT NULL,
  issuer TEXT NOT NULL,
  scope_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired')),
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, mandate_id)
);

CREATE INDEX IF NOT EXISTS idx_signgate_mandates_retention
  ON signgate_mandates (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_trusted_evidence (
  organization_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'revoked')),
  commit_sha TEXT NOT NULL,
  action_fingerprint TEXT,
  subject_fingerprint TEXT,
  observed_at TEXT NOT NULL,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS idx_signgate_trusted_evidence_retention
  ON signgate_trusted_evidence (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_decisions (
  decision_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_fingerprint TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'REQUIRE_APPROVAL', 'DENY')),
  state TEXT NOT NULL CHECK (state IN ('AVAILABLE', 'NON_EXECUTABLE', 'CONSUMED', 'EXPIRED')),
  bound_action_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  reason_codes_json TEXT NOT NULL,
  approval_grant_id TEXT,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  expired_at TEXT,
  consumed_at TEXT,
  consume_lock_token TEXT UNIQUE,
  expiry_lock_token TEXT UNIQUE,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signgate_decisions_org_decision
  ON signgate_decisions (organization_id, decision_id);

CREATE INDEX IF NOT EXISTS idx_signgate_decisions_retention
  ON signgate_decisions (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_request_idempotency (
  organization_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (organization_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_signgate_request_idempotency_retention
  ON signgate_request_idempotency (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_approval_grants (
  approval_grant_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  original_decision_id TEXT NOT NULL,
  action_fingerprint TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  approver_principal_id TEXT NOT NULL,
  approver_role TEXT NOT NULL,
  approval_reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE', 'USED', 'REVOKED', 'EXPIRED')),
  used_by_decision_id TEXT,
  used_request_id TEXT,
  approved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  original_decision_expires_at TEXT NOT NULL,
  audit_id TEXT,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_signgate_approval_grants_org_grant
  ON signgate_approval_grants (organization_id, approval_grant_id);

CREATE INDEX IF NOT EXISTS idx_signgate_approval_grants_retention
  ON signgate_approval_grants (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_consume_receipts (
  consume_receipt_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  execution_attempt_id TEXT NOT NULL,
  action_fingerprint TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  executor_principal_id TEXT NOT NULL,
  consumed_at TEXT NOT NULL,
  receipt_json TEXT NOT NULL,
  delete_after TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (organization_id, decision_id),
  UNIQUE (organization_id, decision_id, execution_attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_signgate_consume_receipts_retention
  ON signgate_consume_receipts (organization_id, delete_after);

CREATE TABLE IF NOT EXISTS signgate_audit_events (
  audit_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  principal_id TEXT,
  decision_id TEXT,
  request_id TEXT,
  action_fingerprint TEXT,
  policy_version TEXT,
  reason_codes_json TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL,
  delete_after TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signgate_audit_events_retention
  ON signgate_audit_events (organization_id, delete_after, event_type);

CREATE TABLE IF NOT EXISTS signgate_execution_results (
  execution_result_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  consume_receipt_id TEXT NOT NULL,
  execution_attempt_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_code TEXT,
  occurred_at TEXT NOT NULL,
  delete_after TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signgate_execution_results_retention
  ON signgate_execution_results (organization_id, delete_after);

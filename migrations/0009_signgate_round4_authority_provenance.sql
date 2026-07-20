ALTER TABLE signgate_api_credentials
  ADD COLUMN rotation_started_at TEXT;

ALTER TABLE signgate_decisions
  ADD COLUMN credential_id TEXT;

ALTER TABLE signgate_decisions
  ADD COLUMN mandate_id TEXT;

ALTER TABLE signgate_decisions
  ADD COLUMN authorized_target_id TEXT;

ALTER TABLE signgate_decisions
  ADD COLUMN evidence_ids_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE signgate_decisions
  ADD COLUMN authority_snapshot_json TEXT NOT NULL DEFAULT '{}';

ALTER TABLE signgate_decisions
  ADD COLUMN authority_snapshot_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_signgate_decisions_authority_refs
  ON signgate_decisions (organization_id, credential_id, mandate_id, authorized_target_id);

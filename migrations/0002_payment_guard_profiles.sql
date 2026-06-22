ALTER TABLE payment_guard_evaluations ADD COLUMN profile_id TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN reservation_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE payment_guard_evaluations ADD COLUMN expires_at TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN tx_hash TEXT;

CREATE TABLE IF NOT EXISTS payment_guard_profiles (
  profile_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL,
  agent_token_hash TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  policy_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_guard_profile_status
  ON payment_guard_evaluations(profile_id, reservation_status, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_guard_reservation_expiry
  ON payment_guard_evaluations(reservation_status, expires_at);

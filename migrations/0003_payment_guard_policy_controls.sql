ALTER TABLE payment_guard_profiles ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payment_guard_profiles ADD COLUMN revoked_at TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN decision_token TEXT;

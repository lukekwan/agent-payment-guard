ALTER TABLE payment_guard_evaluations ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE payment_guard_evaluations ADD COLUMN approved_at TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN denied_at TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN approval_note TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'not_reported';
ALTER TABLE payment_guard_evaluations ADD COLUMN delivery_http_status INTEGER;
ALTER TABLE payment_guard_evaluations ADD COLUMN delivery_content_type TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN delivery_latency_ms INTEGER;
ALTER TABLE payment_guard_evaluations ADD COLUMN delivery_hash TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN delivered_at TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN mandate_json TEXT;
ALTER TABLE payment_guard_evaluations ADD COLUMN simulation_json TEXT;

CREATE TABLE IF NOT EXISTS payment_guard_merchant_stats (
  merchant_key TEXT PRIMARY KEY,
  origin TEXT NOT NULL,
  pay_to TEXT,
  evaluation_count INTEGER NOT NULL DEFAULT 0,
  allow_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  block_count INTEGER NOT NULL DEFAULT 0,
  committed_count INTEGER NOT NULL DEFAULT 0,
  delivery_success_count INTEGER NOT NULL DEFAULT 0,
  delivery_failure_count INTEGER NOT NULL DEFAULT 0,
  total_committed_atomic INTEGER NOT NULL DEFAULT 0,
  last_amount_atomic INTEGER,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment_guard_webhooks (
  webhook_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  url TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  event_types TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_guard_webhooks_profile
  ON payment_guard_webhooks(profile_id, active);

CREATE TABLE IF NOT EXISTS payment_guard_webhook_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT NOT NULL,
  last_error TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_guard_webhook_due
  ON payment_guard_webhook_outbox(status, next_attempt_at);

CREATE TABLE IF NOT EXISTS payment_guard_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  target_url TEXT NOT NULL,
  pay_to TEXT,
  amount_atomic INTEGER NOT NULL DEFAULT 0,
  decision TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  reasons_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_guard_session_created
  ON payment_guard_evaluations(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_payment_guard_fingerprint
  ON payment_guard_evaluations(fingerprint);

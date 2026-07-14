CREATE TABLE IF NOT EXISTS x402_legacy_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  origin_id TEXT NOT NULL,
  pay_to TEXT NOT NULL,
  timeframe_days INTEGER NOT NULL,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  total_amount_atomic INTEGER NOT NULL DEFAULT 0,
  total_amount_usdc REAL NOT NULL DEFAULT 0,
  unique_buyers INTEGER NOT NULL DEFAULT 0,
  unique_sellers INTEGER NOT NULL DEFAULT 0,
  latest_block_timestamp TEXT,
  observed_at TEXT NOT NULL,
  UNIQUE(source, origin_id, pay_to, timeframe_days)
);

CREATE INDEX IF NOT EXISTS idx_x402_legacy_aggregates_observed
  ON x402_legacy_aggregates(observed_at);

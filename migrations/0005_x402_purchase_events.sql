CREATE TABLE IF NOT EXISTS x402_purchase_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  price_usdc REAL NOT NULL DEFAULT 0,
  pay_to TEXT NOT NULL,
  payment_header_hash TEXT,
  user_agent TEXT,
  country TEXT,
  status INTEGER,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_x402_purchase_events_created
  ON x402_purchase_events(created_at);

CREATE INDEX IF NOT EXISTS idx_x402_purchase_events_product_created
  ON x402_purchase_events(product_id, created_at);

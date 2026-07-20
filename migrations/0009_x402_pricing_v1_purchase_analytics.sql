ALTER TABLE x402_purchase_events ADD COLUMN purchase_id TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN purchased_at TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN operation_id TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN service_name TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN pricing_version TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN quoted_price TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN paid_amount TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN currency TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN network TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN payment_hash TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN payer_address TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN buyer_id_hash TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN request_id TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN sequence_id TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN user_agent_hash TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN response_status INTEGER;
ALTER TABLE x402_purchase_events ADD COLUMN decision TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN latency_ms INTEGER;
ALTER TABLE x402_purchase_events ADD COLUMN cache_status TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN internal_test TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_x402_purchase_events_purchase_id
  ON x402_purchase_events(purchase_id);

CREATE INDEX IF NOT EXISTS idx_x402_purchase_events_buyer_sequence
  ON x402_purchase_events(buyer_id_hash, purchased_at);

CREATE INDEX IF NOT EXISTS idx_x402_purchase_events_pricing_version
  ON x402_purchase_events(pricing_version, purchased_at);

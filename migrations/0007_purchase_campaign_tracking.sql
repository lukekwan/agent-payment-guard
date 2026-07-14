ALTER TABLE x402_purchase_events ADD COLUMN campaign TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN referrer TEXT;
ALTER TABLE x402_purchase_events ADD COLUMN query_string_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_x402_purchase_events_campaign_created
  ON x402_purchase_events(campaign, created_at);

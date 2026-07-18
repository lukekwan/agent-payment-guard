DROP TABLE IF EXISTS decision_audit_events;
DROP TABLE IF EXISTS consume_receipts;
DROP TABLE IF EXISTS decisions;

CREATE TABLE decisions (
  organization_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('AVAILABLE', 'CONSUMED', 'EXPIRED', 'DENIED')),
  action_fingerprint TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  expired_at INTEGER,
  execution_attempt_id TEXT,
  consume_lock_token TEXT UNIQUE,
  PRIMARY KEY (organization_id, decision_id)
);

CREATE TABLE consume_receipts (
  organization_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  execution_attempt_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  action_fingerprint TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  consumed_at INTEGER NOT NULL,
  consume_lock_token TEXT NOT NULL,
  PRIMARY KEY (organization_id, decision_id),
  UNIQUE (organization_id, decision_id, execution_attempt_id),
  FOREIGN KEY (organization_id, decision_id)
    REFERENCES decisions (organization_id, decision_id)
);

CREATE TABLE decision_audit_events (
  audit_id TEXT NOT NULL PRIMARY KEY,
  organization_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('CONSUME_SUCCESS', 'CONSUME_CONFLICT', 'EXPIRED_OBSERVED')
  ),
  execution_attempt_id TEXT,
  receipt_id TEXT,
  observed_at INTEGER NOT NULL,
  consume_lock_token TEXT,
  FOREIGN KEY (organization_id, decision_id)
    REFERENCES decisions (organization_id, decision_id)
);

CREATE INDEX idx_decisions_org_state_expires
  ON decisions (organization_id, state, expires_at);

CREATE INDEX idx_receipts_attempt
  ON consume_receipts (organization_id, decision_id, execution_attempt_id);

CREATE INDEX idx_audit_decision_type
  ON decision_audit_events (organization_id, decision_id, event_type);

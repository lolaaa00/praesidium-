-- ============================================================
-- Migration 00016: Blockchain sync tables
-- ============================================================

-- Contract events synced from GenLayer
CREATE TABLE contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  block_number BIGINT,
  tx_hash TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contract_events_tx ON contract_events (tx_hash);
CREATE INDEX idx_contract_events_type ON contract_events (event_type);

-- Transaction log for tracking GenLayer transactions
CREATE TABLE transaction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES validation_requests(id),
  tx_hash TEXT NOT NULL UNIQUE,
  status txn_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  gas_used BIGINT,
  error_message TEXT
);

CREATE INDEX idx_transaction_log_request ON transaction_log (request_id);
CREATE INDEX idx_transaction_log_status ON transaction_log (status);

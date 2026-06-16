-- ============================================================
-- Migration 00011: Validation results table
-- ============================================================

CREATE TABLE validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES validation_requests(id) ON DELETE CASCADE,
  verdict validation_verdict NOT NULL,
  compliance_score INT NOT NULL CHECK (compliance_score BETWEEN 0 AND 100),
  risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  reasoning TEXT NOT NULL,
  consensus_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  on_chain_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN validation_results.consensus_data IS 'Structure: { "tx_hash": "", "on_chain_timestamp": 0, "validator_count": 5, "agreement_ratio": 0.8 }';

CREATE INDEX idx_validation_results_request ON validation_results (request_id);
CREATE INDEX idx_validation_results_verdict ON validation_results (verdict);

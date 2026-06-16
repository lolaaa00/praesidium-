-- ============================================================
-- Migration 00012: Validation violations table
-- ============================================================

CREATE TABLE validation_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES validation_results(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES policy_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  severity rule_severity NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_violations_result ON validation_violations (result_id);

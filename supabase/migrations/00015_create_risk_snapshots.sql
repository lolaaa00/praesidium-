-- ============================================================
-- Migration 00015: Risk snapshots table (daily aggregates)
-- ============================================================

CREATE TABLE risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id),
  snapshot_date DATE NOT NULL,
  total_validations INT NOT NULL DEFAULT 0,
  approved_count INT NOT NULL DEFAULT 0,
  rejected_count INT NOT NULL DEFAULT 0,
  escalated_count INT NOT NULL DEFAULT 0,
  avg_compliance_score NUMERIC(5,2),
  avg_risk_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, agent_id, snapshot_date)
);

CREATE INDEX idx_risk_snapshots_org_date ON risk_snapshots (org_id, snapshot_date DESC);

-- ============================================================
-- Migration 00010: Validation requests table
-- ============================================================

CREATE TABLE validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  policy_version INT NOT NULL,
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL,
  status validation_status NOT NULL DEFAULT 'pending',
  genlayer_tx_hash TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ
);

CREATE INDEX idx_validation_requests_org ON validation_requests (org_id);
CREATE INDEX idx_validation_requests_agent ON validation_requests (agent_id);
CREATE INDEX idx_validation_requests_status ON validation_requests (status);
CREATE INDEX idx_validation_requests_org_submitted ON validation_requests (org_id, submitted_at DESC);

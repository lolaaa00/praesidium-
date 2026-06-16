-- ============================================================
-- Migration 00009: Agent permissions table
-- ============================================================

CREATE TABLE agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, action_type)
);

CREATE INDEX idx_agent_permissions_agent ON agent_permissions (agent_id);

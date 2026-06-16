-- ============================================================
-- Migration 00008: Agents table
-- ============================================================

CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  status agent_status NOT NULL DEFAULT 'active',
  api_key_hash TEXT NOT NULL,
  api_key_prefix TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ,
  registered_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

COMMENT ON COLUMN agents.agent_type IS 'One of: chatbot, workflow, autonomous, tool_agent';
COMMENT ON COLUMN agents.api_key_prefix IS 'First 8 chars for display: pra_xxxx...';

CREATE INDEX idx_agents_org ON agents (org_id);
CREATE INDEX idx_agents_api_key_prefix ON agents (api_key_prefix);
CREATE INDEX idx_agents_org_status ON agents (org_id, status);

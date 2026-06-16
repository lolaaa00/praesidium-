-- ============================================================
-- Migration 00006: Policy rules table
-- ============================================================

CREATE TABLE policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  severity rule_severity NOT NULL DEFAULT 'medium',
  rule_definition JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN policy_rules.rule_definition IS 'JSON structure: { "condition": "natural language rule for LLM evaluation", "action_types": ["tool_call", "api_request"], "parameters": {} }';

CREATE INDEX idx_policy_rules_policy ON policy_rules (policy_id);
CREATE INDEX idx_policy_rules_enabled ON policy_rules (policy_id, enabled);

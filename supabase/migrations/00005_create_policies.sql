-- ============================================================
-- Migration 00005: Policies table
-- ============================================================

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status policy_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

CREATE INDEX idx_policies_org ON policies (org_id);
CREATE INDEX idx_policies_org_status ON policies (org_id, status);

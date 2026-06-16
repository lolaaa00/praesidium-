-- ============================================================
-- Migration 00007: Policy versions table (snapshots on publish)
-- ============================================================

CREATE TABLE policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  version INT NOT NULL,
  rules_snapshot JSONB NOT NULL,
  published_by UUID NOT NULL REFERENCES user_profiles(id),
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version)
);

CREATE INDEX idx_policy_versions_policy ON policy_versions (policy_id);

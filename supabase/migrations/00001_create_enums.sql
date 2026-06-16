-- ============================================================
-- Migration 00001: Create all enum types
-- ============================================================

CREATE TYPE org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE policy_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE rule_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE agent_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE validation_status AS ENUM (
  'pending', 'submitting', 'validating', 'finalized', 'failed', 'timeout'
);
CREATE TYPE validation_verdict AS ENUM ('approved', 'rejected', 'escalate');
CREATE TYPE escalation_status AS ENUM ('open', 'approved', 'rejected', 'policy_updated');
CREATE TYPE audit_action AS ENUM (
  'user_login', 'user_logout',
  'org_created', 'org_updated', 'member_invited', 'member_removed', 'member_role_changed',
  'policy_created', 'policy_updated', 'policy_activated', 'policy_archived',
  'rule_created', 'rule_updated', 'rule_deleted',
  'agent_registered', 'agent_updated', 'agent_suspended', 'agent_revoked',
  'validation_requested', 'validation_completed', 'validation_failed',
  'escalation_created', 'escalation_resolved',
  'settings_updated', 'api_key_rotated'
);
CREATE TYPE txn_status AS ENUM (
  'pending', 'proposing', 'committing', 'revealing', 'accepted', 'finalized', 'failed'
);

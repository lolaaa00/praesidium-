-- ============================================================
-- Migration 00018: Row Level Security policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_snapshots ENABLE ROW LEVEL SECURITY;

-- ── USER PROFILES ──
-- Users can see and update their own profile
CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE USING (id = auth.uid());
-- Allow users to see profiles of org co-members (for member lists)
CREATE POLICY user_profiles_select_org_members ON user_profiles
  FOR SELECT USING (
    id IN (
      SELECT om.user_id FROM org_members om
      WHERE om.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- ── ORGANIZATIONS ──
CREATE POLICY organizations_select ON organizations
  FOR SELECT USING (id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY organizations_insert ON organizations
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY organizations_update ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── ORG MEMBERS ──
CREATE POLICY org_members_select ON org_members
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY org_members_insert ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
CREATE POLICY org_members_delete ON org_members
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── POLICIES ──
CREATE POLICY policies_select ON policies
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY policies_insert ON policies
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY policies_update ON policies
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );
CREATE POLICY policies_delete ON policies
  FOR DELETE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── POLICY RULES ──
CREATE POLICY policy_rules_select ON policy_rules
  FOR SELECT USING (
    policy_id IN (SELECT id FROM policies WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );
CREATE POLICY policy_rules_insert ON policy_rules
  FOR INSERT WITH CHECK (
    policy_id IN (SELECT id FROM policies WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );
CREATE POLICY policy_rules_update ON policy_rules
  FOR UPDATE USING (
    policy_id IN (SELECT id FROM policies WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );
CREATE POLICY policy_rules_delete ON policy_rules
  FOR DELETE USING (
    policy_id IN (SELECT id FROM policies WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- ── POLICY VERSIONS ──
CREATE POLICY policy_versions_select ON policy_versions
  FOR SELECT USING (
    policy_id IN (SELECT id FROM policies WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- ── AGENTS ──
CREATE POLICY agents_select ON agents
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY agents_insert ON agents
  FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY agents_update ON agents
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── AGENT PERMISSIONS ──
CREATE POLICY agent_permissions_select ON agent_permissions
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- ── VALIDATION REQUESTS ──
CREATE POLICY validation_requests_select ON validation_requests
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ── VALIDATION RESULTS ──
CREATE POLICY validation_results_select ON validation_results
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM validation_requests
      WHERE org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- ── VALIDATION VIOLATIONS ──
CREATE POLICY validation_violations_select ON validation_violations
  FOR SELECT USING (
    result_id IN (
      SELECT vr.id FROM validation_results vr
      JOIN validation_requests req ON vr.request_id = req.id
      WHERE req.org_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  );

-- ── ESCALATIONS ──
CREATE POLICY escalations_select ON escalations
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
CREATE POLICY escalations_update ON escalations
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── AUDIT LOGS (read-only for authenticated users) ──
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

-- ── RISK SNAPSHOTS (read-only) ──
CREATE POLICY risk_snapshots_select ON risk_snapshots
  FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

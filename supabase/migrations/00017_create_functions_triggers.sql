-- ============================================================
-- Migration 00017: Functions and triggers
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_organizations_updated
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_policies_updated
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_policy_rules_updated
  BEFORE UPDATE ON policy_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_agents_updated
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-set timeout_at on validation request insert (5 min timeout)
CREATE OR REPLACE FUNCTION set_validation_timeout()
RETURNS TRIGGER AS $$
BEGIN
  NEW.timeout_at = NEW.submitted_at + INTERVAL '5 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validation_timeout
  BEFORE INSERT ON validation_requests
  FOR EACH ROW EXECUTE FUNCTION set_validation_timeout();

-- Helper function: get all org IDs for a user
CREATE OR REPLACE FUNCTION get_user_org_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
  SELECT org_id FROM org_members WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

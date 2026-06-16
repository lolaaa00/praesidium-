-- ============================================================
-- Migration 00019: Enable Supabase Realtime for live updates
-- ============================================================

-- Validation requests: live status updates on dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE validation_requests;

-- Validation results: live result appearance
ALTER PUBLICATION supabase_realtime ADD TABLE validation_results;

-- Escalations: live escalation notifications for admins
ALTER PUBLICATION supabase_realtime ADD TABLE escalations;

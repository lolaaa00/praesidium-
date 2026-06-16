-- ============================================================
-- Migration 00013: Escalations table
-- ============================================================

CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES validation_requests(id),
  result_id UUID NOT NULL REFERENCES validation_results(id),
  reason TEXT NOT NULL,
  status escalation_status NOT NULL DEFAULT 'open',
  resolved_by UUID REFERENCES user_profiles(id),
  resolution_note TEXT,
  final_verdict validation_verdict,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_escalations_org ON escalations (org_id);
CREATE INDEX idx_escalations_org_status ON escalations (org_id, status);

-- ============================================================
-- Migration 00023: Fix validation_verdict enum
-- ============================================================
-- The enum was created as ('approved', 'rejected', 'escalate') — missing
-- the 'd' on escalate, and missing 'conditional' entirely. Every actual
-- verdict producer (the GenLayer contract's VALID_VERDICTS, the engine's
-- localEvaluation fallback, and the web UI's VERDICT_BADGE maps) has always
-- used 'approved' | 'conditional' | 'escalated' | 'rejected' — so any real
-- escalated or conditional verdict has been failing to write to
-- validation_results with "invalid input value for enum validation_verdict"
-- since the day this table could receive real data.

ALTER TYPE validation_verdict RENAME VALUE 'escalate' TO 'escalated';
ALTER TYPE validation_verdict ADD VALUE 'conditional';

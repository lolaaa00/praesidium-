-- ============================================================
-- Migration 00024: Fix validation_status enum
-- ============================================================
-- The enum was created as ('pending', 'submitting', 'validating', 'finalized',
-- 'failed', 'timeout'), but the engine (apps/engine/src/services/validation.ts)
-- and every web API route consistently use 'processing' and 'completed'
-- instead of 'submitting'/'validating'/'finalized' — neither of which is
-- ever written anywhere in the codebase.
--
-- Worse, the engine's updateRequestStatus() helper never checked the
-- Supabase response for an error, so every status transition to
-- 'processing' or 'completed' has been silently failing — every
-- validation_request has been stuck reading 'pending' in the database
-- forever, regardless of whether it actually completed, failed, or timed
-- out. Fixed alongside this migration in apps/engine/src/services/
-- validation.ts (now throws if the status update fails).

ALTER TYPE validation_status ADD VALUE 'processing';
ALTER TYPE validation_status ADD VALUE 'completed';

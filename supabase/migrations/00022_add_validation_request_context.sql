-- ============================================================
-- Migration 00022: Add missing context column to validation_requests
-- ============================================================
-- The engine has always written a `context` field on every validation
-- request (apps/engine/src/services/validation.ts) — the column just never
-- existed, so every real validate_action call failed at the very first
-- insert with "Could not find the 'context' column of 'validation_requests'
-- in the schema cache".

ALTER TABLE validation_requests
  ADD COLUMN context JSONB NOT NULL DEFAULT '{}'::jsonb;

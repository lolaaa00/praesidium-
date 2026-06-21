-- ============================================================
-- Migration 00021: Per-agent GenLayer identity
-- ============================================================
-- Agents previously had no on-chain identity of their own — the engine
-- signed every validate_action call with a single shared private key. That
-- meant one compromised key could act as every agent across every org, and
-- there was no way to revoke one agent's on-chain signing ability without
-- rotating a secret shared by all of them.
--
-- Each agent now gets its own GenLayer keypair, generated at registration
-- time (apps/web/src/app/api/agents/route.ts) and used only by the engine
-- to sign that agent's own validate_action calls (apps/engine/src/lib/
-- genlayer.ts). The private key is encrypted at rest with AES-256-GCM
-- (AGENT_KEY_ENCRYPTION_SECRET, set identically in both apps' env) — never
-- returned to the browser, never logged.
--
-- The agent's wallet needs its own GEN balance to pay gas for its
-- validate_action transactions — genlayer_address is shown in the
-- dashboard so an org owner knows what to fund.

ALTER TABLE agents
  ADD COLUMN genlayer_address TEXT,
  ADD COLUMN genlayer_key_ciphertext TEXT;

CREATE UNIQUE INDEX idx_agents_genlayer_address ON agents (genlayer_address) WHERE genlayer_address IS NOT NULL;

# Praesidium

Decentralized compliance validation for AI agent actions, on GenLayer.
Organizations register policies; agents submit the actions they're about to
take; a GenLayer Intelligent Contract runs an LLM-backed leader/validator
consensus check and records a verdict on-chain before the action proceeds.

- **Live app:** https://praesidium-app.vercel.app
- **Validation engine:** https://praesidium-engine.fly.dev
- **Deployed contract (StudioNet):** [`0x6EfCE1EaA68DEd9C09b27DAd88EFA8804c72E600`](https://genlayer-explorer.vercel.app)

## What it does

1. An organization registers a compliance policy (rules text hashed on-chain,
   full text kept in Supabase since it changes more often than is worth a
   transaction per edit).
2. An agent submits an action for validation. The contract's leader runs an
   LLM evaluation against the policy; validators independently re-run the
   same evaluation and must agree with the leader on verdict category, with
   a tolerance band on the numeric compliance/risk scores (two honest LLM
   calls over the same input drift slightly even when they agree in
   substance — see `_verdicts_agree` in the contract for the full reasoning).
3. The verdict (`approved` / `conditional` / `escalated` / `rejected`) is
   recorded on-chain with reasoning and any violations. `escalated` opens a
   human review queue; a reviewer resolves it and can update the policy.
4. Agent reputation accumulates on-chain per organization from validation
   history.

## Architecture

```
apps/web        Next.js App Router dashboard — org/policy/agent/validation
                 management, wallet-signed on-chain writes, consensus
                 lifecycle UI
apps/engine      Express service — receives agent validate_action calls,
                 signs and submits them on the agent's own GenLayer keypair
contracts        PolicyComplianceGate — the GenLayer Intelligent Contract
packages/shared  Types shared between web and engine
supabase         Postgres schema + migrations (org/policy/agent/validation
                 metadata, audit log, off-chain policy rule text)
```

Every user-facing write (org registration, policy changes, agent lifecycle,
escalation resolution) is signed by the user's own wallet — an injected
wallet (MetaMask, OKX, etc.) if present, or a locally generated wallet with
zero setup friction if not. Agents get their own per-agent GenLayer keypair
at registration, encrypted at rest, so `validate_action` calls are signed
by the agent, not a shared engine key.

## Running locally

```bash
pnpm install
pnpm dev          # web on :3000, engine on :3001
```

Env vars: see `apps/web/.env.local.example` and `apps/engine/.env.example`.

## Contract tests

**Direct Mode** — in-memory, LLM calls mocked, no network, no GEN spent.
Requires Python 3.12+ (`genlayer-py` uses `collections.abc.Buffer`, added in
3.12).

```bash
cd contracts
python3.12 -m pip install -r requirements-test.txt
python3.12 -m pytest tests/ -v
```

Current result: **35/35 passing.** Covers ownership/admin guards, org and
policy lifecycle, agent lifecycle (register/suspend/reinstate/revoke),
`validate_action` parsing and storage, reputation accumulation, escalation
open/resolve, and pause/unpause.

**Studio Mode integration tests** — deploy a fresh contract instance to
real StudioNet and drive it through actual multi-validator LLM consensus
(no mocking). Requires a `GENLAYER_PRIVATE_KEY` in `contracts/.env`
(StudioNet is gasless, so any key works — no funding step needed).

```bash
cd contracts
python3.12 -m pytest tests/integration/ -v -s --network studionet
```

These are currently marked `xfail`: deployments reliably reach
`FINALIZED` with real multi-validator agreement (confirmed independently
via `genlayer receipt <tx_hash>` — `status_name: FINALIZED`,
`result_name: MAJORITY_AGREE`, 5/5 validators voting), but StudioNet's
public RPC doesn't reliably serve reads or writes against a contract
address that was *just* deployed in the same session (`Contract not
found` / `contract_not_found_handler`, reproduced independently via the
raw `genlayer` CLI on a separate deployment, well past finalization). The
pre-existing production contract above reads and writes fine, which rules
out a bug in our code. This looks like a StudioNet propagation gap, not
something fixable from the application side — see the module docstring in
`tests/integration/test_studionet_lifecycle.py` for the full trace. Re-run
periodically; remove the `xfail` marks once the gap closes.

## Contract schema verification

Confirms every `functionName` the frontend calls actually exists on the
deployed contract with the right arity, using `client.getContractSchema()`
against the live address.

```bash
cd contracts
pnpm verify-schema
```

Current result: **7/7 functions pass.**

## Deploying

- **Contract:** `cd contracts && pnpm deploy` (spends GEN — deliberate,
  not part of routine CI)
- **Engine → Fly.io:** `cd apps/engine && fly deploy`
- **Web → Vercel:** deploys on push to `main`; see `apps/web/vercel.json`

## Known limitations

- The Supabase Postgres schema is the primary data store for org/policy/
  agent/validation metadata and off-chain policy rule text; the GenLayer
  contract holds the on-chain compliance record (hashes, verdicts,
  reputation) that's the actual source of truth for validation outcomes.
- StudioNet integration coverage is currently limited by the propagation
  gap described above — real consensus behavior is proven at the
  transaction layer (deploy + agreement), but end-to-end read/write
  round-trips against a fresh deployment aren't yet automatable in CI.

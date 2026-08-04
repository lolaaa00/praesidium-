# GenLayer Projects Submission — Alignment Report

## Implemented

### 1. Generated-wallet fallback
- `apps/web/src/lib/wallet/generated-wallet.ts` — creates/persists a viem private key in `localStorage` under `praesidium_generated_wallet`, namespaced (not encrypted at rest — documented as a demo/eval-grade tradeoff).
- `apps/web/src/hooks/use-wallet-account.ts` — unifies wagmi's injected-wallet state with the generated-wallet fallback: injected wins if `window.ethereum` exists, otherwise silently generates/reuses a local wallet. Exposes `mode: 'injected' | 'generated'`.
- `apps/web/src/lib/genlayer/client.ts` — `createUserGenlayerClient` and `writeContractAsUser` now fall back to `createAccount(privateKey)` (genlayer-js) + `createClient` when no injected provider is present, matching the address to the stored generated wallet. Network-switch RPC calls are skipped for generated-wallet writes (no injected provider to switch).
- `apps/web/src/hooks/use-auth.ts`, `connect-button.tsx`, `wallet-status.tsx` — sign-in flow (`buildSignMessage` + `verifyMessage`) works transparently with the generated wallet's `signMessage`; UI shows "Browser wallet (generated)" vs "Connected" and the active address.
- All dashboard write call sites (agents, policies, consensus, admin, onboarding) switched from wagmi's `useAccount` to `useWalletAccount`, so generated-wallet users can actually sign writes end to end.

### 2. Transaction lifecycle UI
- `apps/web/src/components/consensus/tx-lifecycle.tsx` — new shared component: PENDING → PROPOSING → COMMITTING → REVEALING → ACCEPTED/FINALIZED progress bar, live elapsed-seconds timer, explorer link, and dedicated UNDETERMINED/error states with retry.
- `apps/web/src/hooks/use-genlayer-write.ts` — rewritten to expose `status/txHash/error/retry` and drive the visual phase cycle (genlayer-js's `waitForTransactionReceipt` only resolves once with the final status, so intermediate phases are a timed approximation until the real hash/outcome lands).
- `apps/web/src/lib/genlayer/client.ts` — `writeContractAsUser` takes an `onSubmitted` callback (fires with the tx hash before the receipt resolves) and increased `waitForTransactionReceipt` polling (`interval: 3000ms`, `retries: 120`, ~6 min) so slow StudioNet consensus rounds don't time out.
- `getExplorerTxUrl()` added, built from `studionet.blockExplorers.default.url` (genlayer-js chain definition) — avoids hardcoding the explorer host.
- Wired fully into `apps/web/src/app/(dashboard)/consensus/page.tsx` (the flagship flow). Other write sites (agents/new, agents/[id], policies/new, policies/[id], admin/system, onboarding/create-org-form) got explicit UNDETERMINED branches and retry buttons using their existing status-banner pattern rather than the full `<TxLifecycle>` — a lighter but real integration, not a stub.

### 3. UNDETERMINED handling
- `UndeterminedTransactionError` (in `client.ts`) is thrown by `writeContractAsUser` whenever the resolved receipt status is `UNDETERMINED`.
- Every write call site now `catch`es it specifically (not the generic error path) and shows "Validators could not agree — nothing was written. Retry?" with a working retry action that resubmits the same call.

### 4. Contract schema verification script
- `contracts/scripts/verify-schema.ts` — calls `client.getContractSchema(CONTRACT_ADDRESS)` against the live deployed contract, walks `apps/web/src` for `writeContractAsUser(...)` / `readContractPublic(...)` call sites, extracts function names + literal-array arg counts, and prints PASS/FAIL per function (name exists + arity matches).
- Added `"verify-schema": "tsx scripts/verify-schema.ts"` to `contracts/package.json`.
- **Ran it against the live contract at `0x6EfCE1EaA68DEd9C09b27DAd88EFA8804c72E600`: 7/7 PASS** (`get_org`, `is_paused`, `register_agent`, `register_org`, `register_policy`, `resolve_escalation`, `update_policy_rules`).

### 5. Read-only browsing without a wallet
- Landing/marketing pages (`apps/web/src/app/page.tsx` and `(marketing)` routes) were already public — verified, no auth guard present.
- `apps/web/src/app/(dashboard)/overview/page.tsx` — the main dashboard list page now renders for disconnected visitors: org-scoped Supabase queries (`useComplianceAnalytics`, `useRiskAnalytics`, `useValidations`, `usePolicies`, `useAgents`) gained an `enabled` option and are disabled until `useAuth().isAuthenticated`; a `ReadOnlyPreviewBanner` shows a public on-chain read (`readContractPublic('is_paused')`, the same throwaway-account pattern already used elsewhere) plus a connect-wallet CTA.
- Deeper full read-only browsing (org/policy/agent detail pages, per-org public reads) was **not** attempted — those routes require an authenticated `orgId` for Supabase RLS, and opening that up is close to the architectural rewrite explicitly out of scope below.

## Explicitly skipped

- **Making the contract the sole source of truth / removing Supabase.** Per instructions, this is a large, risky data-flow rewrite and was skipped entirely — no changes were made to how Supabase and the contract relate.

## Verification performed

- `pnpm --filter web type-check` — passes, no errors.
- `pnpm --filter web build` — full production build succeeds (39 routes generated, including `/overview` as static).
- `contracts` `verify-schema.ts` — ran live against StudioNet, 7/7 functions PASS.

## YOU STILL NEED TO DO

- [ ] **Deploy the engine to Fly.io.** `flyctl` isn't installed locally. Install it (`brew install flyctl` or https://fly.io/docs/flyctl/install/), then from `apps/engine` run `fly deploy` (or connect the repo via the Fly dashboard).
- [ ] **`fly auth login`** — needs interactive browser auth I can't perform. Do this before the deploy step above.
- [ ] **Update Vercel's `ENGINE_URL` env var** once the engine has a real Fly.io URL, then redeploy the web app.
- [ ] **Update Supabase auth `site_url`** from `localhost` to the production domain (Supabase dashboard → Authentication → URL Configuration).
- [ ] **Disable Vercel Deployment Protection** if you want the app publicly reachable without a Vercel login (Project Settings → Deployment Protection).
- [ ] **Run integration tests against StudioNet**: `gltest tests/integration/ -v -s --network studionet` (from `contracts/`, or wherever the gltest config points).
- [ ] **Write a README with measured results** — actual latency/consensus numbers, screenshots, etc. Nothing here fabricates those.
- [ ] **Record a demo video and public post** for the submission.
- [ ] Optionally: run `contracts/scripts/verify-schema.ts` again after any future contract redeploy, and add it to CI if you want drift caught automatically.

# PolicyComplianceGate — GenLayer Intelligent Contract

## Layout

- `src/policy_compliance_gate.py` — the contract
- `tests/` — Direct Mode test suite (in-memory, no network, no GEN spent)
- `deploy/deploy.ts` — deploys the contract to StudioNet (spends GEN)
- `deploy/verify.ts` — confirms a deployed contract responds to reads (free)

## Running tests

Requires **Python 3.12+** (`genlayer-py`, a dependency of `genlayer-test`,
uses `collections.abc.Buffer` which doesn't exist before 3.12).

```bash
cd contracts
python3.12 -m pip install -r requirements-test.txt
python3.12 -m pytest tests/ -v
```

These mock the LLM calls (`direct_vm.mock_llm`), so they run instantly and
deterministically without hitting a real model or the GenLayer network.

## Deploying to StudioNet

This is a real on-chain action and spends GEN from the deployer account —
do this deliberately, when you're ready, not as part of routine CI.

```bash
cd contracts
cp .env.example .env
# edit .env and set GENLAYER_PRIVATE_KEY to a funded StudioNet account
pnpm install
pnpm deploy
```

`deploy.ts` prints the deployed contract address and writes it to
`deploy/deployed.json`. Copy that address into:

- `apps/engine/.env` → `GENLAYER_CONTRACT_ADDRESS`
- `apps/web/.env.local` → `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS`

Then confirm it's live:

```bash
pnpm verify
```

This calls `get_owner()` and `get_validation_count()` against the deployed
address — read-only, free, safe to re-run any time.

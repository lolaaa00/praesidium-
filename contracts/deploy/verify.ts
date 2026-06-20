/**
 * Verifies a deployed PolicyComplianceGate contract is live and responding
 * by calling its read-only view methods. Safe to re-run — no funds spent.
 *
 * Usage:
 *   cd contracts
 *   pnpm verify                       # uses contracts/deploy/deployed.json
 *   pnpm verify 0xYourContractAddress # or pass an address explicitly
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '../.env');
const DEPLOYED_PATH = join(__dirname, 'deployed.json');

config({ path: ENV_PATH });

function resolveContractAddress(): `0x${string}` {
  const cliArg = process.argv[2];
  if (cliArg) return cliArg as `0x${string}`;

  if (process.env.GENLAYER_CONTRACT_ADDRESS) {
    return process.env.GENLAYER_CONTRACT_ADDRESS as `0x${string}`;
  }

  if (existsSync(DEPLOYED_PATH)) {
    const { contractAddress } = JSON.parse(readFileSync(DEPLOYED_PATH, 'utf-8'));
    if (contractAddress) return contractAddress as `0x${string}`;
  }

  throw new Error(
    'No contract address found. Pass one as an argument, set GENLAYER_CONTRACT_ADDRESS, or run pnpm deploy first.',
  );
}

async function main() {
  const address = resolveContractAddress();

  // No private key needed for read-only calls — createAccount() with no
  // argument generates a throwaway local account, which is enough to
  // satisfy the client's account requirement without spending anything.
  const account = process.env.GENLAYER_PRIVATE_KEY
    ? createAccount(process.env.GENLAYER_PRIVATE_KEY as `0x${string}`)
    : createAccount();

  const client = createClient({
    chain: studionet,
    account,
  });

  console.log(`Verifying contract: ${address}`);
  console.log(`Chain: ${studionet.name}\n`);

  const stats = await client.readContract({
    address,
    functionName: 'get_contract_stats',
    args: [],
  });
  console.log(`✓ get_contract_stats() -> ${JSON.stringify(stats)}`);

  const owner = await client.readContract({
    address,
    functionName: 'get_owner',
    args: [],
  });
  console.log(`✓ get_owner()           -> ${owner}`);

  console.log('\n✅ Contract is deployed and responding to reads.');
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err.message ?? err);
  console.error('This usually means the address is wrong, the contract was not finalized, or the RPC is unreachable.');
  process.exit(1);
});

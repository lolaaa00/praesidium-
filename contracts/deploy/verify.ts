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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '../.env');
const DEPLOYED_PATH = join(__dirname, 'deployed.json');

config({ path: ENV_PATH });

const RPC_URL = process.env.GENLAYER_RPC_URL ?? 'https://studio.genlayer.com/api';

function resolveContractAddress(): string {
  const cliArg = process.argv[2];
  if (cliArg) return cliArg;

  if (process.env.GENLAYER_CONTRACT_ADDRESS) {
    return process.env.GENLAYER_CONTRACT_ADDRESS;
  }

  if (existsSync(DEPLOYED_PATH)) {
    const { contractAddress } = JSON.parse(readFileSync(DEPLOYED_PATH, 'utf-8'));
    if (contractAddress) return contractAddress;
  }

  throw new Error(
    'No contract address found. Pass one as an argument, set GENLAYER_CONTRACT_ADDRESS, or run pnpm deploy first.',
  );
}

async function main() {
  const address = resolveContractAddress() as `0x${string}`;

  const client = createClient({
    chain: {
      id: 0,
      name: 'genlayer-studio',
      nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
  });

  // An unfunded read-only caller works fine for view methods.
  const account = process.env.GENLAYER_PRIVATE_KEY
    ? createAccount(process.env.GENLAYER_PRIVATE_KEY as `0x${string}`)
    : createAccount();

  console.log(`Verifying contract: ${address}`);
  console.log(`RPC: ${RPC_URL}\n`);

  const owner = await client.readContract({
    account,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    address: address as any,
    functionName: 'get_owner',
    args: [],
  });
  console.log(`✓ get_owner()            -> ${owner}`);

  const validationCount = await client.readContract({
    account,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    address: address as any,
    functionName: 'get_validation_count',
    args: [],
  });
  console.log(`✓ get_validation_count() -> ${validationCount}`);

  console.log('\n✅ Contract is deployed and responding to reads.');
}

main().catch((err) => {
  console.error('\n❌ Verification failed:', err.message ?? err);
  console.error('This usually means the address is wrong, the contract was not finalized, or the RPC is unreachable.');
  process.exit(1);
});

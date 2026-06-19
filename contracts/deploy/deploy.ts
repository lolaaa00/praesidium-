/**
 * Deploys PolicyComplianceGate to GenLayer StudioNet.
 *
 * This submits a real on-chain transaction and spends GEN from the
 * deployer account — run it deliberately, not as part of CI.
 *
 * Usage:
 *   cd contracts
 *   cp .env.example .env        # fill in GENLAYER_PRIVATE_KEY
 *   pnpm install
 *   pnpm deploy
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from 'dotenv';
import { createClient, createAccount } from 'genlayer-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT_PATH = join(__dirname, '../src/policy_compliance_gate.py');
const ENV_PATH = join(__dirname, '../.env');
const DEPLOYED_PATH = join(__dirname, 'deployed.json');

config({ path: ENV_PATH });

const PRIVATE_KEY = process.env.GENLAYER_PRIVATE_KEY;
const RPC_URL = process.env.GENLAYER_RPC_URL ?? 'https://studio.genlayer.com/api';

async function main() {
  if (!PRIVATE_KEY) {
    throw new Error(
      'GENLAYER_PRIVATE_KEY is not set. Copy contracts/.env.example to contracts/.env and fill it in before deploying.',
    );
  }
  if (!existsSync(CONTRACT_PATH)) {
    throw new Error(`Contract source not found at ${CONTRACT_PATH}`);
  }

  const code = readFileSync(CONTRACT_PATH, 'utf-8');
  const account = createAccount(PRIVATE_KEY as `0x${string}`);

  console.log(`Deployer address: ${account.address}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log('Submitting deployment transaction...');

  const client = createClient({
    chain: {
      id: 0,
      name: 'genlayer-studio',
      nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    },
    account,
  });

  const txHash = await client.deployContract({
    account,
    code,
    args: [],
  });

  console.log(`Transaction submitted: ${txHash}`);
  console.log('Waiting for consensus (this can take a minute)...');

  const receipt = await client.waitForTransactionReceipt({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hash: txHash as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    status: 'FINALIZED' as any,
  });

  const contractAddress = receipt.to_address ?? receipt.data?.contract_address;

  if (!contractAddress) {
    console.error('Could not determine contract address from receipt. Full receipt:');
    console.error(JSON.stringify(receipt, null, 2));
    throw new Error('Deployment finalized but no contract address was returned — inspect the receipt above.');
  }

  console.log('\n✅ Deployed successfully');
  console.log(`Contract address: ${contractAddress}`);

  writeFileSync(
    DEPLOYED_PATH,
    JSON.stringify(
      {
        contractAddress,
        txHash,
        network: 'studionet',
        deployedAt: new Date().toISOString(),
        deployer: account.address,
      },
      null,
      2,
    ),
  );

  console.log(`\nSaved deployment record to ${DEPLOYED_PATH}`);
  console.log('\nNext steps — set this address in:');
  console.log('  apps/engine/.env       GENLAYER_CONTRACT_ADDRESS=' + contractAddress);
  console.log('  apps/web/.env.local    NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=' + contractAddress);
  console.log('\nThen verify it responds with: pnpm verify');
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message ?? err);
  process.exit(1);
});

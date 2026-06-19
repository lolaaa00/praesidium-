import { createClient, createAccount } from 'genlayer-js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _account: any = null;

/**
 * Get the GenLayer client (singleton).
 */
export function getGenlayerClient() {
  if (!_client) {
    _client = createClient({
      chain: {
        id: 0,
        name: 'genlayer-studio',
        nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
        rpcUrls: { default: { http: [env.GENLAYER_RPC_URL] } },
      },
    });
  }
  return _client;
}

/**
 * Get the GenLayer account (singleton) — holds the private key.
 * NEVER expose this outside the engine.
 */
export function getAccount() {
  if (!_account) {
    _account = createAccount(env.GENLAYER_PRIVATE_KEY as `0x${string}`);
  }
  return _account;
}

/**
 * Call a write method on the Intelligent Contract and wait for consensus.
 */
export async function callContract(
  method: string,
  args: unknown[],
): Promise<{ txHash: string; result: unknown }> {
  const client = getGenlayerClient();
  const account = getAccount();

  logger.info({ method, contractAddress: env.GENLAYER_CONTRACT_ADDRESS }, 'Submitting GenLayer transaction');

  try {
    const txHash = await client.writeContract({
      account,
      address: env.GENLAYER_CONTRACT_ADDRESS,
      functionName: method,
      args,
      value: BigInt(0),
    });

    logger.info({ txHash, method }, 'Transaction submitted, waiting for receipt');

    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    logger.info({ txHash, status: receipt.status }, 'Transaction finalized');

    return {
      txHash: txHash as string,
      result: receipt,
    };
  } catch (error) {
    logger.error({ method, error: (error as Error).message }, 'GenLayer call failed');
    throw error;
  }
}

/**
 * Read a view method on the Intelligent Contract (no consensus needed).
 */
export async function readContract(
  method: string,
  args: unknown[],
): Promise<unknown> {
  const client = getGenlayerClient();

  const result = await client.readContract({
    account: getAccount(),
    address: env.GENLAYER_CONTRACT_ADDRESS,
    functionName: method,
    args,
  });

  return result;
}

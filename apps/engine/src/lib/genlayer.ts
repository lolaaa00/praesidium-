import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _client: any = null;

/**
 * Get the GenLayer client (singleton, no account bound).
 *
 * There's no engine-wide signing account — every agent has its own
 * GenLayer keypair, decrypted per-call in callContract() below. This
 * client is only used for the underlying RPC connection.
 */
export function getGenlayerClient() {
  if (!_client) {
    _client = createClient({ chain: studionet });
  }
  return _client;
}

/**
 * Call a write method on the Intelligent Contract and wait for consensus,
 * signed by the given agent's own private key (already decrypted —
 * see apps/engine/src/lib/agent-key.ts).
 */
export async function callContract(
  method: string,
  args: unknown[],
  agentPrivateKey: `0x${string}`,
): Promise<{ txHash: string; result: unknown }> {
  const client = getGenlayerClient();
  const account = createAccount(agentPrivateKey);

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

    // ACCEPTED (validator quorum reached) rather than FINALIZED (a later,
    // slower step) — sufficient proof of real consensus for recording a
    // verdict. This is a single blocking HTTP call with no bytes sent
    // until it resolves, so the wait budget is kept under Fly's proxy
    // idle-connection timeout (~60s) rather than the much longer windows
    // used for background test tooling.
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.ACCEPTED,
      interval: 3000,
      retries: 15,
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
 * Reads aren't signed, so any throwaway account works.
 */
export async function readContract(
  method: string,
  args: unknown[],
): Promise<unknown> {
  const client = getGenlayerClient();

  const result = await client.readContract({
    account: createAccount(),
    address: env.GENLAYER_CONTRACT_ADDRESS,
    functionName: method,
    args,
  });

  return result;
}

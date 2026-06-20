import { createClient, createAccount } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus, type Address } from 'genlayer-js/types';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as Address | undefined;

/**
 * Creates a GenLayer client that signs through the user's own connected
 * wallet (MetaMask + the GenLayer snap) instead of a private key held by
 * the app. Org/policy/agent/admin actions a person performs in the
 * dashboard use this; the engine's own service key is only for the
 * agent-submitted validate_action path, where there's no human to sign.
 *
 * Must be called from a browser context — `window.ethereum` is required.
 */
export function createUserGenlayerClient(walletAddress: `0x${string}`) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No browser wallet found. Connect a wallet (e.g. MetaMask) first.');
  }

  return createClient({
    chain: studionet,
    account: walletAddress,
    provider: window.ethereum,
  });
}

/**
 * Submits a write transaction to PolicyComplianceGate, signed by the
 * connected wallet, and waits for it to finalize.
 *
 * `client.connect()` prompts the GenLayer MetaMask snap to install/connect
 * and switches the wallet to the right network if needed — call this once
 * per client before the first write.
 */
export async function writeContractAsUser(
  walletAddress: `0x${string}`,
  functionName: string,
  args: unknown[],
): Promise<{ txHash: string; result: unknown }> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured.');
  }

  const client = createUserGenlayerClient(walletAddress);
  await client.connect();

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: args as any,
    value: BigInt(0),
  });

  const receipt = await client.waitForTransactionReceipt({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hash: txHash as any,
    status: TransactionStatus.ACCEPTED,
  });

  return { txHash: txHash as string, result: receipt };
}

/**
 * Reads a view method from PolicyComplianceGate. Doesn't require a connected
 * wallet — view calls aren't signed, so a throwaway local account is enough.
 */
export async function readContractPublic(functionName: string, args: unknown[] = []): Promise<unknown> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured.');
  }

  const client = createClient({ chain: studionet, account: createAccount() });
  return client.readContract({
    address: CONTRACT_ADDRESS,
    functionName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: args as any,
  });
}

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

/**
 * Registers an org on-chain if it isn't already, signed by the connected
 * wallet. Policy/agent registration both require the org to exist on-chain
 * first (validate_action does not — it stays permissive for unregistered
 * agents/orgs so the engine's existing integration keeps working).
 *
 * Safe to call before every policy/agent registration: it's a single read
 * plus, at most, one extra signature the first time a given org is touched.
 */
export async function ensureOrgRegisteredOnChain(
  walletAddress: `0x${string}`,
  orgId: string,
  orgName: string,
): Promise<void> {
  const existing = (await readContractPublic('get_org', [orgId])) as string;
  const parsed = JSON.parse(existing) as { error?: string };
  if (!parsed.error) {
    return;
  }
  await writeContractAsUser(walletAddress, 'register_org', [orgId, orgName]);
}

/**
 * SHA-256 hex digest, used as the on-chain rules_hash so a validation
 * record can later be checked against the exact policy text that was in
 * force when it ran. Not a security boundary — just an integrity fingerprint.
 */
export async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return '0x' + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

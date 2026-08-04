import type { Address } from 'genlayer-js/types';
import { getStoredGeneratedWallet, isGeneratedWalletAddress } from '@/lib/wallet/generated-wallet';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as Address | undefined;

// Consensus rounds on StudioNet (propose -> commit -> reveal) routinely take
// longer than genlayer-js's default poll window, which times out writes
// that are still perfectly healthy. Poll less aggressively but for longer.
const RECEIPT_POLL_INTERVAL_MS = 3000;
const RECEIPT_POLL_RETRIES = 120; // ~6 minutes at the interval above

async function loadGenlayerSdk() {
  const [{ createClient, createAccount }, { studionet }, { TransactionStatus }] = await Promise.all([
    import('genlayer-js'),
    import('genlayer-js/chains'),
    import('genlayer-js/types'),
  ]);

  return { createClient, createAccount, studionet, TransactionStatus };
}

/**
 * Builds a StudioNet explorer link for a transaction hash. genlayer-js's
 * studionet chain definition carries blockExplorers.default.url — we reuse
 * that instead of hardcoding the explorer host so this tracks whatever
 * network the SDK is actually pointed at.
 */
export async function getExplorerTxUrl(txHash: string): Promise<string> {
  const { studionet } = await import('genlayer-js/chains');
  const base = studionet.blockExplorers?.default?.url;
  if (!base) return '';
  return `${base}/tx/${txHash}`;
}

/**
 * Creates a client signed by the locally-generated fallback wallet (see
 * lib/wallet/generated-wallet.ts). Used when the user has no browser
 * extension wallet — createAccount(privateKey) gives back a viem-style
 * local account with its own sign/signMessage/signTransaction, so it slots
 * into createClient exactly like an injected-wallet account does.
 */
async function createGeneratedGenlayerClient(privateKey: `0x${string}`) {
  const { createClient, createAccount, studionet } = await loadGenlayerSdk();
  const account = createAccount(privateKey);
  return createClient({ chain: studionet, account });
}

/**
 * Picks an injected EIP-1193 provider to sign with. If MetaMask is among
 * multiple injected wallets, prefer it (it gets a nicer GenLayer Snap
 * experience), but any wallet works for the actual transaction — see
 * connectAnyWallet() below.
 */
function getInjectedProvider() {
  const eth = window.ethereum;
  if (!eth) return null;

  if (Array.isArray(eth.providers)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metamask = eth.providers.find((p: any) => p.isMetaMask);
    if (metamask) return metamask;
    return eth.providers[0] ?? eth;
  }

  return eth;
}

/**
 * Creates a GenLayer client that signs through the user's own connected
 * wallet instead of a private key held by the app. Org/policy/agent/admin
 * actions a person performs in the dashboard use this; the engine's own
 * service key is only for the agent-submitted validate_action path, where
 * there's no human to sign.
 *
 * Must be called from a browser context — `window.ethereum` is required.
 */
export async function createUserGenlayerClient(walletAddress: `0x${string}`) {
  if (typeof window === 'undefined') {
    throw new Error('createUserGenlayerClient must be called from a browser context.');
  }

  if (!window.ethereum) {
    // No extension wallet — fall back to the locally-generated wallet if
    // its address matches what the caller expects.
    const generated = getStoredGeneratedWallet();
    if (generated && generated.address.toLowerCase() === walletAddress.toLowerCase()) {
      return createGeneratedGenlayerClient(generated.privateKey);
    }
    throw new Error('No browser wallet found. Connect a wallet (e.g. MetaMask, OKX Wallet, Rainbow) first.');
  }

  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No browser wallet found. Connect a wallet first.');
  }

  const { createClient, studionet } = await loadGenlayerSdk();
  return createClient({
    chain: studionet,
    account: walletAddress,
    provider,
  });
}

/**
 * Switches the connected wallet to the GenLayer network, using only
 * standard EIP-3085/3326 RPC methods (wallet_addEthereumChain /
 * wallet_switchEthereumChain) that virtually every wallet supports.
 *
 * This intentionally does NOT call genlayer-js's own client.connect() —
 * that function is hardcoded to talk to `window.ethereum` directly (not
 * the provider passed into createClient) and additionally tries to install
 * a MetaMask-only Snap via wallet_getSnaps, which throws "Method not found"
 * on every non-MetaMask wallet. The Snap is cosmetic — actual transaction
 * submission (writeContract) goes through plain eth_sendTransaction, which
 * works with any wallet — so skipping the Snap step loses nothing.
 */
async function switchToGenlayerNetwork(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chain: any,
) {
  const chainIdHex = `0x${chain.id.toString(16)}`;
  const currentChainId = await provider.request({ method: 'eth_chainId' });
  if (currentChainId === chainIdHex) return;

  const chainParams = {
    chainId: chainIdHex,
    chainName: chain.name,
    rpcUrls: chain.rpcUrls.default.http,
    nativeCurrency: chain.nativeCurrency,
    blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : undefined,
  };

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
  } catch {
    // Most wallets throw 4902 ("unrecognized chain") here if it's not
    // added yet — add it, then switch.
    await provider.request({ method: 'wallet_addEthereumChain', params: [chainParams] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
  }
}

/**
 * Submits a write transaction to PolicyComplianceGate, signed by the
 * connected wallet, and waits for it to finalize. Works with any
 * EIP-1193 wallet — see switchToGenlayerNetwork() for why this doesn't use
 * genlayer-js's own (MetaMask-only) client.connect().
 */
export class UndeterminedTransactionError extends Error {
  constructor(public readonly txHash: string) {
    super('Validators could not agree — nothing was written.');
    this.name = 'UndeterminedTransactionError';
  }
}

export interface WriteContractOptions {
  /** Called as soon as the tx hash is known, before the receipt resolves — lets callers drive a lifecycle UI. */
  onSubmitted?: (txHash: string) => void;
}

export async function writeContractAsUser(
  walletAddress: `0x${string}`,
  functionName: string,
  args: unknown[],
  options?: WriteContractOptions,
): Promise<{ txHash: string; result: unknown }> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not configured.');
  }

  const { TransactionStatus } = await loadGenlayerSdk();
  const client = await createUserGenlayerClient(walletAddress);

  // Network switching is a wallet_* RPC call that only makes sense against
  // an injected provider — the generated wallet has no notion of "network"
  // beyond the chain already baked into its client.
  if (!isGeneratedWalletAddress(walletAddress)) {
    await switchToGenlayerNetwork(getInjectedProvider(), client.chain);
  }

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: args as any,
    value: BigInt(0),
  });

  options?.onSubmitted?.(txHash as string);

  const receipt = await client.waitForTransactionReceipt({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hash: txHash as any,
    status: TransactionStatus.ACCEPTED,
    interval: RECEIPT_POLL_INTERVAL_MS,
    retries: RECEIPT_POLL_RETRIES,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((receipt as any)?.status === TransactionStatus.UNDETERMINED) {
    throw new UndeterminedTransactionError(txHash as string);
  }

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

  const { createClient, createAccount, studionet } = await loadGenlayerSdk();
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

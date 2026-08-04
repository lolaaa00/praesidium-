const STORAGE_KEY = 'praesidium_generated_wallet';

interface StoredGeneratedWallet {
  privateKey: `0x${string}`;
  address: `0x${string}`;
}

/**
 * Fallback signer for users without a browser wallet extension. The key
 * lives only in this browser's localStorage, namespaced so it can never
 * collide with anything else — it is not custodial, not backed up, and
 * lost if the user clears storage. Good enough for zero-friction demo/eval
 * use; real funds should use an injected wallet instead.
 */
export function getStoredGeneratedWallet(): StoredGeneratedWallet | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredGeneratedWallet;
    if (!parsed.privateKey || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function deriveAddressFromPrivateKey(privateKey: `0x${string}`): Promise<`0x${string}`> {
  const { privateKeyToAccount } = await import('viem/accounts');
  return privateKeyToAccount(privateKey).address;
}

/**
 * Returns the existing generated wallet, or creates and persists a new one.
 * Safe to call repeatedly — subsequent calls just return the same wallet.
 */
export async function getOrCreateGeneratedWallet(): Promise<StoredGeneratedWallet> {
  const existing = getStoredGeneratedWallet();
  if (existing) return existing;

  const { generatePrivateKey } = await import('viem/accounts');
  const privateKey = generatePrivateKey();
  const address = await deriveAddressFromPrivateKey(privateKey);
  const wallet: StoredGeneratedWallet = { privateKey, address };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  }

  return wallet;
}

export function clearGeneratedWallet(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isGeneratedWalletAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  const stored = getStoredGeneratedWallet();
  return !!stored && stored.address.toLowerCase() === address.toLowerCase();
}

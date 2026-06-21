/**
 * Normalize a wallet address for storage and lookup.
 * We keep addresses lowercase in the database so equality checks stay stable
 * even if the wallet UI returns a checksum-cased address.
 */
export function normalizeWalletAddress(address: string): string {
  return address.trim().toLowerCase();
}

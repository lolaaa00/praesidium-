/**
 * Extracts a human-readable message from any thrown value.
 *
 * Wallet/provider errors (MetaMask, the GenLayer snap, viem) frequently
 * throw plain objects rather than Error instances — e.g. EIP-1193 errors
 * shaped like { code: 4001, message: 'User rejected the request' }, or
 * viem errors with a `.shortMessage` instead of `.message`. A naive
 * `error instanceof Error` check misses all of these and falls back to a
 * useless "unknown error".
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const shortMessage = typeof obj.shortMessage === 'string' ? obj.shortMessage : null;
    const message = typeof obj.message === 'string' ? obj.message : null;
    const code = obj.code !== undefined ? String(obj.code) : null;

    if (shortMessage) return shortMessage;
    if (message) return code ? `${message} (code ${code})` : message;

    try {
      return JSON.stringify(obj);
    } catch {
      return String(obj);
    }
  }

  return String(err);
}

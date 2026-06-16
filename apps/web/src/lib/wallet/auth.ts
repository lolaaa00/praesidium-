import { SIGN_MESSAGE_PREFIX } from '@/lib/utils/constants';

/**
 * Build the message the user will sign for authentication.
 * Format: "Sign in to Praesidium\nNonce: <nonce>\nIssued At: <iso-timestamp>"
 */
export function buildSignMessage(nonce: string): string {
  return `${SIGN_MESSAGE_PREFIX}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
}

/**
 * Parse the nonce from a signed message.
 */
export function parseNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce: (.+)/);
  return match?.[1]?.trim() ?? null;
}

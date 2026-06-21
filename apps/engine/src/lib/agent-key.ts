import { createDecipheriv, createHash } from 'crypto';
import { env } from '../config/env.js';

/**
 * Decrypts an agent's GenLayer private key, encrypted by
 * apps/web/src/lib/crypto/agent-key.ts at registration time.
 * AGENT_KEY_ENCRYPTION_SECRET must match that app's value exactly.
 */
export function decryptAgentKey(ciphertextPacked: string): string {
  const [ivHex, authTagHex, ciphertextHex] = ciphertextPacked.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Malformed agent key ciphertext.');
  }

  const key = createHash('sha256').update(env.AGENT_KEY_ENCRYPTION_SECRET).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

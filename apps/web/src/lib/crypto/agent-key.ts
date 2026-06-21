import { createCipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM encrypt/decrypt for agent GenLayer private keys at rest.
 *
 * AGENT_KEY_ENCRYPTION_SECRET must be set to the same value in this app and
 * in apps/engine — this app encrypts a new agent's key at registration time,
 * the engine decrypts it later to sign that agent's validate_action calls.
 * The secret is hashed to a fixed 32-byte key so it can be any length.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.AGENT_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('AGENT_KEY_ENCRYPTION_SECRET is not configured.');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptAgentKey(privateKeyHex: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(privateKeyHex, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), ciphertext.toString('hex')].join(':');
}

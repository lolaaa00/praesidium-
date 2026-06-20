import { createHmac, timingSafeEqual } from 'node:crypto';
import { SESSION_COOKIE_NAME } from '@/lib/utils/constants';

export interface WalletSession {
  userId: string;
  walletAddress: string;
  createdAt: number;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(payload: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('Missing session secret');
  }

  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createWalletSessionToken(session: WalletSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function verifyWalletSessionToken(token: string): WalletSession | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return null;
  }

  try {
    const expected = signPayload(payload);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return null;
    }

    const session = JSON.parse(base64UrlDecode(payload)) as WalletSession;
    if (
      !session ||
      typeof session.userId !== 'string' ||
      typeof session.walletAddress !== 'string' ||
      typeof session.createdAt !== 'number'
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// Flat shape — Next's ResponseCookies.set({ name, value, ...attrs }) reads
// httpOnly/secure/sameSite/path/maxAge directly off this object. Nesting
// them under an `options` key (as an earlier version of this did) means
// Next silently ignores all of them and sets a non-httpOnly, non-secure,
// no-SameSite, session-only cookie instead.
export function createWalletSessionCookie(session: WalletSession) {
  return {
    name: SESSION_COOKIE_NAME,
    value: createWalletSessionToken(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearWalletSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: 0,
  };
}

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/nonce
 * Generate a cryptographic nonce for wallet sign-in.
 * The nonce is single-use and stored in a short-lived cookie.
 */
export async function GET() {
  const nonce = randomBytes(32).toString('hex');

  const response = NextResponse.json({ nonce });

  // Store nonce in httpOnly cookie — expires in 5 minutes
  response.cookies.set('auth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  });

  return response;
}

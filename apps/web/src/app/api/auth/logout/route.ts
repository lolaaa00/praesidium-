import { NextResponse } from 'next/server';
import { clearWalletSessionCookie } from '@/lib/auth/session';

/**
 * POST /api/auth/logout
 * Sign out and clear session.
 */
export async function POST() {
  try {
    const response = NextResponse.json({ success: true });
    response.cookies.set(clearWalletSessionCookie());
    return response;
  } catch {
    return NextResponse.json({ success: true });
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/utils/constants';

/**
 * Refreshes the Supabase auth session on every request.
 * Must be called from Next.js middleware to keep sessions alive.
 * Returns { supabase, response } — pass response through.
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  return {
    user: session ? { id: 'wallet-session' } : null,
    supabaseResponse,
  };
}

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Public paths — accessible without authentication.
 * Everything else requires a valid Supabase session.
 */
const PUBLIC_PATHS = ['/', '/connect', '/about', '/docs', '/pricing'];

/**
 * Auth paths — if the user IS authenticated, redirect away from these.
 */
const AUTH_PATHS = ['/connect'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes (API routes handle their own auth)
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Refresh the Supabase session and get current user
  const { user, supabaseResponse } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.includes(pathname);
  const isAuthPath = AUTH_PATHS.includes(pathname);

  // Authenticated user hitting /connect → redirect to dashboard
  if (user && isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/overview';
    return NextResponse.redirect(url);
  }

  // Unauthenticated user hitting a protected route → redirect to /connect
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/connect';
    // Preserve the intended destination so we can redirect back after login
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Pass through with refreshed cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|og-image.png|fonts/).*)',
  ],
};

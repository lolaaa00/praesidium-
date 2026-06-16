import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth middleware — will be fully implemented in Step 5
// For now, allow all requests through

const PUBLIC_PATHS = ['/', '/connect', '/onboarding', '/about', '/docs', '/pricing'];
const AUTH_PATHS = ['/connect', '/onboarding'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and API routes
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/')
  ) {
    return NextResponse.next();
  }

  // TODO: Check for session cookie and redirect to /connect if missing
  // Will be implemented in Step 5 with Supabase auth

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.svg|og-image.png|fonts/).*)'],
};

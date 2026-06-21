import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/utils/constants';
import { verifyWalletSessionToken } from '@/lib/auth/session';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthResult {
  user: {
    id: string;
    walletAddress: string;
  };
  supabase: SupabaseClient;
  orgId: string;
  role: string;
}

/**
 * Shared auth check for API routes.
 * Validates:
 * 1. User is authenticated (Supabase session)
 * 2. User belongs to the org specified in the x-org-id header
 * Returns { user, supabase, orgId, role } or a NextResponse error.
 */
export async function requireAuth(
  headers: Headers,
): Promise<AuthResult | NextResponse> {
  const admin = createAdminClient();
  const cookieHeader = headers.get('cookie') ?? '';
  const sessionMatch = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const sessionToken = sessionMatch?.[1] ? decodeURIComponent(sessionMatch[1]) : null;
  const session = sessionToken ? verifyWalletSessionToken(sessionToken) : null;
  const walletAddress = headers.get('x-wallet-address')?.trim().toLowerCase() ?? null;

  let userId = session?.userId ?? null;

  if (!userId && walletAddress) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    userId = profile?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = headers.get('x-org-id');
  if (!orgId) {
    return NextResponse.json(
      { error: 'Missing x-org-id header' },
      { status: 400 },
    );
  }

  // Verify membership
  const { data: membership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    user: {
      id: userId,
      walletAddress: session?.walletAddress ?? walletAddress ?? '',
    },
    supabase: admin,
    orgId,
    role: membership.role,
  };
}

/**
 * Check if the auth result is an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

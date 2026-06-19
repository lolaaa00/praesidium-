import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface AuthResult {
  user: User;
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
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user, supabase, orgId, role: membership.role };
}

/**
 * Check if the auth result is an error response.
 */
export function isAuthError(
  result: AuthResult | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

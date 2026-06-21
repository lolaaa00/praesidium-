import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { SESSION_COOKIE_NAME } from '@/lib/utils/constants';
import { verifyWalletSessionToken } from '@/lib/auth/session';

/**
 * GET /api/auth/session
 * Get the current user session including profile and org data.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? verifyWalletSessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const adminClient = createAdminClient();
    const profileLookup = session.userId;

    const [profileResult, membershipResult] = await Promise.all([
      adminClient.from('user_profiles').select('*').eq('id', profileLookup).single(),
      adminClient
        .from('org_members')
        .select('org_id, role, organizations ( id, name, slug, settings )')
        .eq('user_id', profileLookup),
    ]);

    return NextResponse.json({
      user: {
        id: profileLookup,
        walletAddress: session.walletAddress,
        displayName: profileResult.data?.display_name,
        avatarUrl: profileResult.data?.avatar_url,
        memberships:
          membershipResult.data?.map((m) => ({
            orgId: m.org_id,
            role: m.role,
            organization: m.organizations,
          })) ?? [],
      },
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ user: null });
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/auth/session
 * Get the current user session including profile and org data.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const walletAddress = user.user_metadata?.wallet_address;
    const userProfileId = user.user_metadata?.user_profile_id;

    if (!walletAddress || !userProfileId) {
      return NextResponse.json({ user: null });
    }

    const adminClient = createAdminClient();

    const [profileResult, membershipResult] = await Promise.all([
      adminClient.from('user_profiles').select('*').eq('id', userProfileId).single(),
      adminClient
        .from('org_members')
        .select('org_id, role, organizations ( id, name, slug, settings )')
        .eq('user_id', userProfileId),
    ]);

    return NextResponse.json({
      user: {
        id: userProfileId,
        walletAddress,
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

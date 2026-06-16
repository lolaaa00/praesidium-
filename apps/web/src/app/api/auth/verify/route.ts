import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGN_MESSAGE_PREFIX } from '@/lib/utils/constants';

/**
 * POST /api/auth/verify
 * Verify a wallet signature and create/find the user + Supabase session.
 *
 * Body: { message: string, signature: string, address: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { message, signature, address } = await request.json();

    if (!message || !signature || !address) {
      return NextResponse.json(
        { error: 'Missing required fields: message, signature, address' },
        { status: 400 },
      );
    }

    // 1. Verify the nonce matches what we issued
    const storedNonce = request.cookies.get('auth_nonce')?.value;
    if (!storedNonce) {
      return NextResponse.json(
        { error: 'Nonce expired or missing. Please request a new nonce.' },
        { status: 401 },
      );
    }

    if (!message.startsWith(SIGN_MESSAGE_PREFIX) || !message.includes(storedNonce)) {
      return NextResponse.json(
        { error: 'Invalid message format or nonce mismatch' },
        { status: 401 },
      );
    }

    // 2. Verify the signature cryptographically
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Normalize the address
    const normalizedAddress = address.toLowerCase();
    const adminClient = createAdminClient();

    // 4. Find or create user_profile
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .single();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newProfile, error: profileError } = await adminClient
        .from('user_profiles')
        .insert({ wallet_address: normalizedAddress })
        .select('id')
        .single();

      if (profileError || !newProfile) {
        console.error('Failed to create user profile:', profileError);
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
      }
      userId = newProfile.id;
      isNewUser = true;
    }

    // 5. Find or create Supabase auth user
    const fakeEmail = `${normalizedAddress}@wallet.praesidium.app`;

    const { data: authList } = await adminClient.auth.admin.listUsers();
    let authUser = authList?.users?.find((u) => u.email === fakeEmail);

    if (!authUser) {
      const { data: created, error: authError } = await adminClient.auth.admin.createUser({
        email: fakeEmail,
        password: `wallet_${normalizedAddress}_${Date.now()}_${Math.random()}`,
        email_confirm: true,
        user_metadata: {
          wallet_address: normalizedAddress,
          user_profile_id: userId,
        },
      });

      if (authError || !created.user) {
        console.error('Failed to create auth user:', authError);
        return NextResponse.json({ error: 'Failed to create auth session' }, { status: 500 });
      }
      authUser = created.user;
    }

    // 6. Generate session link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    // 7. Check org membership
    const { data: memberships } = await adminClient
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId);

    const hasOrg = memberships != null && memberships.length > 0;

    // 8. Respond with token hash for client-side OTP verification
    const response = NextResponse.json({
      success: true,
      userId,
      walletAddress: normalizedAddress,
      isNewUser,
      hasOrg,
      email: fakeEmail,
      tokenHash: linkData.properties?.hashed_token,
    });

    // Clear nonce (single-use)
    response.cookies.set('auth_nonce', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

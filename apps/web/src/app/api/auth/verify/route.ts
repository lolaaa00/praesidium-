import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { createAdminClient } from '@/lib/supabase/admin';
import { SIGN_MESSAGE_PREFIX } from '@/lib/utils/constants';
import { normalizeWalletAddress } from '@/lib/utils/wallet';
import { createWalletSessionCookie } from '@/lib/auth/session';

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
    const normalizedAddress = normalizeWalletAddress(address);
    const adminClient = createAdminClient();

    // 4. Find or create user_profile
    // Use a case-insensitive lookup so older mixed-case records still match.
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id, wallet_address')
      .ilike('wallet_address', normalizedAddress)
      .limit(1)
      .maybeSingle();

    let userId: string;
    let isNewUser = false;

    if (existingProfile) {
      userId = existingProfile.id;
      if (existingProfile.wallet_address !== normalizedAddress) {
        await adminClient
          .from('user_profiles')
          .update({ wallet_address: normalizedAddress })
          .eq('id', userId);
      }
    } else {
      const { data: newProfile, error: profileError } = await adminClient
        .from('user_profiles')
        .insert({ wallet_address: normalizedAddress })
        .select('id')
        .maybeSingle();

      if (profileError || !newProfile) {
        // A concurrent login or a legacy mixed-case record can still leave a
        // matching profile in the database. Re-read before failing hard.
        const { data: fallbackProfile } = await adminClient
          .from('user_profiles')
          .select('id')
          .ilike('wallet_address', normalizedAddress)
          .limit(1)
          .maybeSingle();

        if (!fallbackProfile) {
          console.error('Failed to create user profile:', profileError);
          return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
        }

        userId = fallbackProfile.id;
      } else {
        userId = newProfile.id;
        isNewUser = true;
      }
    }

    // 5. Generate a magic link session and let Supabase create/reuse the auth user.
    // The extra metadata keeps our session route aligned with the wallet profile.
    const fakeEmail = `${normalizedAddress}@wallet.praesidium.app`;

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: fakeEmail,
      options: {
        data: {
          wallet_address: normalizedAddress,
          user_profile_id: userId,
        },
      },
    });

    if (linkError || !linkData) {
      console.error('Failed to generate link:', linkError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    if (linkData.user?.id) {
      const { error: updateError } = await adminClient.auth.admin.updateUserById(linkData.user.id, {
        user_metadata: {
          wallet_address: normalizedAddress,
          user_profile_id: userId,
        },
      });

      if (updateError) {
        console.error('Failed to refresh auth user metadata:', updateError);
      }
    }

    // 6. Check org membership
    const { data: memberships } = await adminClient
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId);

    const hasOrg = memberships != null && memberships.length > 0;

    // 7. Respond with token hash for client-side OTP verification
    const response = NextResponse.json({
      success: true,
      userId,
      walletAddress: normalizedAddress,
      isNewUser,
      hasOrg,
      email: fakeEmail,
      tokenHash: linkData.properties?.hashed_token,
    });

    response.cookies.set(
      createWalletSessionCookie({
        userId,
        walletAddress: normalizedAddress,
        createdAt: Date.now(),
      }),
    );

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

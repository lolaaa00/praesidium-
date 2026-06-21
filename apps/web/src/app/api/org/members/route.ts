import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeWalletAddress } from '@/lib/utils/wallet';

// ──────────────────────────────────────────
// GET /api/org/members — List org members
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const { data: members, error } = await supabase
    .from('org_members')
    .select('*, user_profile:user_profiles(wallet_address, display_name, avatar_url)')
    .eq('org_id', orgId)
    .order('joined_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members });
}

// ──────────────────────────────────────────
// POST /api/org/members — Invite a member by wallet address
// ──────────────────────────────────────────

const inviteMemberSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, orgId, role } = auth;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof inviteMemberSchema>;
  try {
    body = inviteMemberSchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Cannot assign owner role via invite
  if (body.role === 'admin' && role !== 'owner') {
    return NextResponse.json(
      { error: 'Only owners can assign admin role' },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const normalizedWalletAddress = normalizeWalletAddress(body.walletAddress);

  // Find user by wallet address
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id')
    .ilike('wallet_address', normalizedWalletAddress)
    .limit(1)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: 'No user found with that wallet address. They must connect their wallet first.' },
      { status: 404 },
    );
  }

  // Check if already a member
  const { data: existing } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'User is already a member of this organization' },
      { status: 409 },
    );
  }

  // Add member
  const { data: member, error: memberError } = await admin
    .from('org_members')
    .insert({
      org_id: orgId,
      user_id: profile.id,
      role: body.role,
      invited_by: user.id,
    })
    .select('*, user_profile:user_profiles(wallet_address, display_name, avatar_url)')
    .single();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // Audit log
  await admin.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'member_invited',
    resource_type: 'org_member',
    resource_id: profile.id,
    details: { walletAddress: body.walletAddress, role: body.role },
  });

  return NextResponse.json({ member }, { status: 201 });
}

// ──────────────────────────────────────────
// DELETE /api/org/members — Remove a member
// ──────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;

  const url = new URL(request.url);
  const memberId = url.searchParams.get('userId');

  if (!memberId) {
    return NextResponse.json({ error: 'Missing userId query parameter' }, { status: 400 });
  }

  // Only owner/admin can remove members
  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Cannot remove yourself if you're the only owner
  if (memberId === user.id) {
    const { count } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('role', 'owner');

    if ((count || 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last owner' },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'member_removed',
    resource_type: 'org_member',
    resource_id: memberId,
    details: {},
  });

  return NextResponse.json({ success: true });
}

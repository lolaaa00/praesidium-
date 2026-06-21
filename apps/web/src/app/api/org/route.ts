import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/utils/constants';
import { verifyWalletSessionToken } from '@/lib/auth/session';

async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? verifyWalletSessionToken(token) : null;
  if (session) {
    return { id: session.userId, walletAddress: session.walletAddress };
  }

  // Fallback for local development when the client already knows the wallet
  // address but the cookie session is unavailable.
  return null;
}

// ──────────────────────────────────────────
// GET /api/org — Get current user's organization
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const walletAddress = request.headers.get('x-wallet-address')?.trim().toLowerCase() ?? null;
  const admin = createAdminClient();

  let resolvedUser = user;
  if (!resolvedUser && walletAddress) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (profile) {
      resolvedUser = { id: profile.id, walletAddress: profile.wallet_address };
    }
  }

  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Get user's org memberships with org details
  const { data: memberships, error } = await admin
    .from('org_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', resolvedUser.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memberships });
}

// ──────────────────────────────────────────
// POST /api/org — Create a new organization
// ──────────────────────────────────────────

const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters'),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  const walletAddress = request.headers.get('x-wallet-address')?.trim().toLowerCase() ?? null;
  const admin = createAdminClient();

  let resolvedUser = user;
  if (!resolvedUser && walletAddress) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (profile) {
      resolvedUser = { id: profile.id, walletAddress: profile.wallet_address };
    }
  }

  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse & validate body
  let body: z.infer<typeof createOrgSchema>;
  try {
    const raw = await request.json();
    body = createOrgSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Generate slug from name
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

  // Use admin client to bypass RLS for org creation
  // Check slug uniqueness
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'An organization with a similar name already exists' },
      { status: 409 },
    );
  }

  // Create org
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: body.name,
      slug,
      description: body.description || null,
      created_by: resolvedUser.id,
      settings: {},
    })
    .select()
    .single();

  if (orgError) {
    console.error('Failed to create org:', orgError);
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  // Add creator as owner
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: resolvedUser.id,
    role: 'owner',
    invited_by: null,
  });

  if (memberError) {
    // Rollback org creation
    await admin.from('organizations').delete().eq('id', org.id);
    console.error('Failed to add owner:', memberError);
    return NextResponse.json({ error: 'Failed to set up organization' }, { status: 500 });
  }

  // Write audit log
  await admin.from('audit_logs').insert({
    org_id: org.id,
    user_id: resolvedUser.id,
    action: 'org_created',
    resource_type: 'organization',
    resource_id: org.id,
    details: { name: body.name, slug },
  });

  return NextResponse.json(
    {
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
      },
    },
    { status: 201 },
  );
}

// ──────────────────────────────────────────
// PUT /api/org — Update organization
// ──────────────────────────────────────────

const updateOrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();
  const walletAddress = request.headers.get('x-wallet-address')?.trim().toLowerCase() ?? null;
  const admin = createAdminClient();

  let resolvedUser = user;
  if (!resolvedUser && walletAddress) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id, wallet_address')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (profile) {
      resolvedUser = { id: profile.id, walletAddress: profile.wallet_address };
    }
  }

  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof updateOrgSchema>;
  try {
    const raw = await request.json();
    body = updateOrgSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Check user is admin/owner of this org
  const { data: membership } = await admin
    .from('org_members')
    .select('role')
    .eq('org_id', body.orgId)
    .eq('user_id', resolvedUser.id)
    .maybeSingle();

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.name) updates.name = body.name;
  if (body.description !== undefined) updates.description = body.description;

  const { data: org, error } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', body.orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ organization: org });
}

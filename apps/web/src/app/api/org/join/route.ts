import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ──────────────────────────────────────────
// POST /api/org/join — Join an organization by slug
// ──────────────────────────────────────────

const joinOrgSchema = z.object({
  slug: z
    .string()
    .min(1, 'Organization slug is required')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Invalid organization identifier'),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof joinOrgSchema>;
  try {
    const raw = await request.json();
    body = joinOrgSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find org by slug
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', body.slug)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Check if user is already a member
  const { data: existing } = await admin
    .from('org_members')
    .select('id')
    .eq('org_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'You are already a member of this organization' },
      { status: 409 },
    );
  }

  // Add user as member
  const { error: memberError } = await admin.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'member',
    invited_by: null,
  });

  if (memberError) {
    console.error('Failed to join org:', memberError);
    return NextResponse.json({ error: 'Failed to join organization' }, { status: 500 });
  }

  // Audit log
  await admin.from('audit_logs').insert({
    org_id: org.id,
    user_id: user.id,
    action: 'member_invited',
    resource_type: 'org_member',
    resource_id: user.id,
    details: { method: 'self_join', slug: body.slug },
  });

  return NextResponse.json(
    {
      success: true,
      organization: { id: org.id, name: org.name, slug: org.slug },
    },
    { status: 201 },
  );
}

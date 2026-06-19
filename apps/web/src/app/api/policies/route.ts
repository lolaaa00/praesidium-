import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/policies — List policies for the current org
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('policies')
    .select('*, policy_rules(count)', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ['draft', 'active', 'archived'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data: policies, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    policies,
    pagination: { page, limit, total: count || 0 },
  });
}

// ──────────────────────────────────────────
// POST /api/policies — Create a new policy
// ──────────────────────────────────────────

const createPolicySchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;

  // Only owner/admin can create policies
  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof createPolicySchema>;
  try {
    body = createPolicySchema.parse(await request.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data: policy, error } = await supabase
    .from('policies')
    .insert({
      org_id: orgId,
      name: body.name,
      description: body.description || null,
      status: 'draft',
      version: 1,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'policy_created',
    resource_type: 'policy',
    resource_id: policy.id,
    details: { name: body.name },
  });

  return NextResponse.json({ policy }, { status: 201 });
}

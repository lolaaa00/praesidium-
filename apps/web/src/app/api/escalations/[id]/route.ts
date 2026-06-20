import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

type RouteContext = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────
// GET /api/escalations/[id] — Escalation detail
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id } = await context.params;

  const { data: escalation, error } = await supabase
    .from('escalations')
    .select(
      `*,
       validation_request:validation_requests(id, action_type, agent_id, policy_id)`,
    )
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!escalation) {
    return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
  }

  return NextResponse.json({ escalation });
}

// ──────────────────────────────────────────
// PUT /api/escalations/[id] — Resolve or reject an escalation
// ──────────────────────────────────────────

const resolveEscalationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'policy_updated']),
  resolutionNote: z.string().min(1).max(2000),
  finalVerdict: z.enum(['approved', 'conditional', 'escalated', 'rejected']).optional(),
});

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { user, supabase, orgId, role } = auth;
  const { id } = await context.params;

  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let body: z.infer<typeof resolveEscalationSchema>;
  try {
    body = resolveEscalationSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('escalations')
    .select('id, status, request_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Escalation not found' }, { status: 404 });
  }
  if (existing.status !== 'open') {
    return NextResponse.json({ error: 'Escalation is already resolved' }, { status: 409 });
  }

  const { data: escalation, error } = await supabase
    .from('escalations')
    .update({
      status: body.status,
      resolution_note: body.resolutionNote,
      final_verdict: body.finalVerdict,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    org_id: orgId,
    user_id: user.id,
    action: 'escalation_resolved',
    resource_type: 'escalation',
    resource_id: id,
    details: { status: body.status, requestId: existing.request_id },
  });

  return NextResponse.json({ escalation });
}

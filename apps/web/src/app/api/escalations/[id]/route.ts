import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';
import { readContractPublic } from '@/lib/genlayer/client';

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

  // The contract derives its escalation_id as f"esc-{request_id}" (see
  // _open_escalation in contracts/src/policy_compliance_gate.py) — it is
  // NOT the Supabase escalations.id, it's built from the validation
  // request's id. NOTE: on-chain status uses 'open' | 'resolved' |
  // 'dismissed' while Supabase escalations.status uses
  // 'open' | 'approved' | 'rejected' | 'policy_updated' — these vocabularies
  // don't map onto each other, and on-chain resolved_by is a hex address
  // (not the Supabase user_profiles UUID resolution_note.resolved_by
  // expects). Overwriting `status`/`resolved_by` with the raw on-chain
  // values would silently corrupt fields the UI depends on having specific
  // enum/FK values, so we only merge resolution_notes (safe, free text) and
  // otherwise just surface on-chain read success via _onChainVerified so
  // the frontend can show a badge. Flagged for review — see task notes.
  let mergedEscalation: Record<string, unknown> = { ...escalation };
  const onChainEscalationId = `esc-${escalation.request_id}`;
  try {
    const raw = (await readContractPublic('get_escalation', [onChainEscalationId])) as string;
    const parsed = JSON.parse(raw) as {
      error?: string;
      resolution_notes?: string;
    };
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    mergedEscalation = {
      ...mergedEscalation,
      resolution_note: parsed.resolution_notes || mergedEscalation.resolution_note,
      _onChainVerified: true,
    };
  } catch (err) {
    console.warn(`On-chain get_escalation read failed for escalation ${id} (chain id ${onChainEscalationId}):`, err);
    mergedEscalation = { ...mergedEscalation, _onChainVerified: false };
  }

  return NextResponse.json({ escalation: mergedEscalation });
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

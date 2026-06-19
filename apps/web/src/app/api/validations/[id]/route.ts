import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

type RouteContext = { params: Promise<{ id: string }> };

// ──────────────────────────────────────────
// GET /api/validations/[id] — Full validation detail
// ──────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;
  const { id } = await context.params;

  const { data: validation, error } = await supabase
    .from('validation_requests')
    .select(
      `*,
       agent:agents(id, name, agent_type, status),
       policy:policies(id, name, status, version),
       validation_results(
         *,
         validation_violations(*)
       ),
       escalations(*)`,
    )
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!validation) {
    return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
  }

  return NextResponse.json({ validation });
}

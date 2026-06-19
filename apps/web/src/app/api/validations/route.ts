import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/validations — List validation requests with results
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const verdict = url.searchParams.get('verdict');
  const agentId = url.searchParams.get('agentId');
  const policyId = url.searchParams.get('policyId');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('validation_requests')
    .select(
      '*, agent:agents(id, name, agent_type), policy:policies(id, name), validation_results(*)',
      { count: 'exact' },
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && ['pending', 'processing', 'completed', 'failed', 'timeout'].includes(status)) {
    query = query.eq('status', status);
  }
  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  if (policyId) {
    query = query.eq('policy_id', policyId);
  }
  if (verdict && ['approved', 'rejected', 'escalated', 'conditional'].includes(verdict)) {
    query = query.eq('validation_results.verdict', verdict);
  }

  const { data: validations, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    validations,
    pagination: { page, limit, total: count || 0 },
  });
}

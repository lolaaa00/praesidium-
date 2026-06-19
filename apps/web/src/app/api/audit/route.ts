import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/audit — List audit logs
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  const resourceType = url.searchParams.get('resourceType');
  const userId = url.searchParams.get('userId');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('audit_logs')
    .select('*, user:user_profiles(wallet_address, display_name)', { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (action) query = query.eq('action', action);
  if (resourceType) query = query.eq('resource_type', resourceType);
  if (userId) query = query.eq('user_id', userId);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: logs, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    logs,
    pagination: { page, limit, total: count || 0 },
  });
}

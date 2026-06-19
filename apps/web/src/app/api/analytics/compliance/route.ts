import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/analytics/compliance — Compliance trend data
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get validation results within the period
  const { data: results, error } = await supabase
    .from('validation_results')
    .select('verdict, compliance_score, created_at, validation_request:validation_requests!inner(org_id)')
    .eq('validation_request.org_id', orgId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate by day
  const dailyMap = new Map<
    string,
    { date: string; total: number; approved: number; rejected: number; escalated: number; avgScore: number; scores: number[] }
  >();

  for (const r of results || []) {
    const date = r.created_at.split('T')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, { date, total: 0, approved: 0, rejected: 0, escalated: 0, avgScore: 0, scores: [] });
    }
    const day = dailyMap.get(date)!;
    day.total++;
    if (r.verdict === 'approved') day.approved++;
    if (r.verdict === 'rejected') day.rejected++;
    if (r.verdict === 'escalated') day.escalated++;
    if (r.compliance_score != null) day.scores.push(r.compliance_score);
  }

  const trend = Array.from(dailyMap.values()).map(({ scores, ...day }) => ({
    ...day,
    avgScore: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0,
  }));

  // Summary stats
  const total = results?.length || 0;
  const approved = results?.filter((r) => r.verdict === 'approved').length || 0;
  const scores = results?.filter((r) => r.compliance_score != null).map((r) => r.compliance_score) || [];
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100) / 100 : 0;

  return NextResponse.json({
    summary: {
      total,
      approved,
      rejected: results?.filter((r) => r.verdict === 'rejected').length || 0,
      escalated: results?.filter((r) => r.verdict === 'escalated').length || 0,
      approvalRate: total > 0 ? Math.round((approved / total) * 10000) / 100 : 0,
      avgComplianceScore: avgScore,
    },
    trend,
    period: { days, since },
  });
}

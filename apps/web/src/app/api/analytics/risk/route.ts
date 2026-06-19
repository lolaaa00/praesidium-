import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/analytics/risk — Risk analytics and snapshots
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const { supabase, orgId } = auth;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '30', 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get risk snapshots
  const { data: snapshots, error: snapError } = await supabase
    .from('risk_snapshots')
    .select('*')
    .eq('org_id', orgId)
    .gte('created_at', since)
    .order('created_at', { ascending: true });

  if (snapError) {
    return NextResponse.json({ error: snapError.message }, { status: 500 });
  }

  // Get violation breakdown
  const { data: violations } = await supabase
    .from('validation_violations')
    .select('severity, rule_name, validation_result:validation_results!inner(validation_request:validation_requests!inner(org_id))')
    .eq('validation_result.validation_request.org_id', orgId)
    .gte('created_at', since);

  // Aggregate violations by severity
  const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const ruleViolationCounts: Record<string, number> = {};
  const violationList = violations ?? [];

  for (const v of violationList) {
    const sev = v.severity as string;
    if (Object.prototype.hasOwnProperty.call(severityCounts, sev)) {
      severityCounts[sev] = (severityCounts[sev] ?? 0) + 1;
    }
    const ruleName = v.rule_name as string;
    ruleViolationCounts[ruleName] = (ruleViolationCounts[ruleName] ?? 0) + 1;
  }

  // Top violated rules
  const topViolatedRules = Object.entries(ruleViolationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([rule, count]) => ({ rule, count }));

  // Latest risk score
  const latestSnapshot = snapshots && snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return NextResponse.json({
    currentRiskScore: latestSnapshot?.overall_score ?? null,
    riskLevel: latestSnapshot
      ? latestSnapshot.overall_score >= 80
        ? 'critical'
        : latestSnapshot.overall_score >= 60
          ? 'high'
          : latestSnapshot.overall_score >= 40
            ? 'medium'
            : 'low'
      : null,
    severityCounts,
    topViolatedRules,
    snapshots: snapshots?.map((s) => ({
      date: s.created_at,
      overallScore: s.overall_score,
      details: s.details,
    })),
    period: { days, since },
  });
}

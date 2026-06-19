'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, BarChart3, Activity } from 'lucide-react';
import { useComplianceAnalytics, useRiskAnalytics } from '@/hooks/queries/use-analytics';

const PERIOD_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const SEVERITY_CONFIG: Record<string, { label: string; bar: string; text: string }> = {
  critical: { label: 'Critical', bar: 'bg-fail', text: 'text-fail' },
  high: { label: 'High', bar: 'bg-warn', text: 'text-warn' },
  medium: { label: 'Medium', bar: 'bg-warn', text: 'text-warn' },
  low: { label: 'Low', bar: 'bg-cornflower', text: 'text-maxblue-2' },
};

const RISK_LEVEL_CONFIG: Record<string, { badge: string; icon: React.ElementType }> = {
  low: { badge: 'bg-pass/15 text-pass', icon: ShieldCheck },
  medium: { badge: 'bg-warn/15 text-warn', icon: AlertTriangle },
  high: { badge: 'bg-warn/15 text-warn', icon: AlertTriangle },
  critical: { badge: 'bg-fail/15 text-fail', icon: AlertTriangle },
};

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full bg-muted h-2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-mono text-sm">{value}</span>
    </div>
  );
}

interface TrendPoint {
  date: string;
  approved: number;
  rejected: number;
  escalated: number;
  avgScore: number;
}

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No trend data available
      </div>
    );
  }

  const maxTotal = Math.max(...trend.map((t) => t.approved + t.rejected + t.escalated), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-1 h-40">
        {trend.map((t) => {
          const total = t.approved + t.rejected + t.escalated;
          const heightPct = total > 0 ? (total / maxTotal) * 100 : 0;
          const approvedPct = total > 0 ? (t.approved / total) * 100 : 0;
          const rejectedPct = total > 0 ? (t.rejected / total) * 100 : 0;
          const escalatedPct = total > 0 ? (t.escalated / total) * 100 : 0;
          return (
            <div
              key={t.date}
              className="flex-1 flex flex-col justify-end rounded-sm overflow-hidden"
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`${t.date}: ${total} — ${t.approved} approved, ${t.rejected} rejected, ${t.escalated} escalated`}
            >
              <div className="bg-pass" style={{ height: `${approvedPct}%` }} />
              <div className="bg-warn" style={{ height: `${escalatedPct}%` }} />
              <div className="bg-fail" style={{ height: `${rejectedPct}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pass inline-block" /> Approved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-warn inline-block" /> Escalated
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-fail inline-block" /> Rejected
        </span>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const angle = (clampedScore / 100) * 180 - 90;
  const rad = ((angle - 90) * Math.PI) / 180;
  const needleX = 60 + 35 * Math.cos(rad);
  const needleY = 65 + 35 * Math.sin(rad);
  const color = clampedScore >= 80 ? '#16a34a' : clampedScore >= 60 ? '#d97706' : '#dc2626';
  const arcLength = (clampedScore / 100) * 157;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-40">
        <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 10 65 A 50 50 0 0 1 110 65"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} 157`}
        />
        <line x1="60" y1="65" x2={needleX} y2={needleY} stroke="#374151" strokeWidth="2" strokeLinecap="round" />
        <circle cx="60" cy="65" r="4" fill="#374151" />
        <text x="60" y="58" textAnchor="middle" fontSize="16" fontWeight="bold" fill={color}>
          {clampedScore}
        </text>
      </svg>
      <p className="text-sm text-muted-foreground">Overall Risk Score</p>
    </div>
  );
}

export default function RiskAnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data: compData, isLoading: compLoading } = useComplianceAnalytics(days);
  const { data: riskData, isLoading: riskLoading } = useRiskAnalytics(days);

  const isLoading = compLoading || riskLoading;
  const summary = compData?.summary;
  const trend = compData?.trend ?? [];
  const riskScore = riskData?.currentRiskScore ?? 0;
  const riskLevel = riskData?.riskLevel ?? 'unknown';
  const severityCounts = riskData?.severityCounts ?? {};
  const topRules = riskData?.topViolatedRules ?? [];

  const severityMax = Math.max(...Object.values(severityCounts), 1);
  const riskCfg = RISK_LEVEL_CONFIG[riskLevel];
  const RiskIcon = riskCfg?.icon ?? AlertTriangle;
  const riskBadge = riskCfg?.badge ?? 'bg-muted text-muted-foreground';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Analytics</h1>
          <p className="text-muted-foreground">Compliance trends, violation breakdown, and risk scoring.</p>
        </div>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setDays(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                days === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Top stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Approval Rate',
                value: summary ? `${summary.approvalRate.toFixed(1)}%` : '—',
                sub: `${summary?.approved ?? 0} of ${summary?.total ?? 0} validated`,
                icon: ShieldCheck,
                iconColor: 'text-pass',
              },
              {
                label: 'Avg Compliance Score',
                value: summary ? `${summary.avgComplianceScore.toFixed(0)}%` : '—',
                sub: 'Across all validations',
                icon: BarChart3,
                iconColor: 'text-maxblue-2',
              },
              {
                label: 'Rejected',
                value: String(summary?.rejected ?? '—'),
                sub: 'Actions blocked',
                icon: TrendingDown,
                iconColor: 'text-fail',
              },
              {
                label: 'Escalated',
                value: String(summary?.escalated ?? '—'),
                sub: 'Awaiting human review',
                icon: TrendingUp,
                iconColor: 'text-warn',
              },
            ].map(({ label, value, sub, icon: Icon, iconColor }) => (
              <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-bold">{value}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className={`rounded-lg bg-muted p-2 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Trend chart */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Validation Trend</h2>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  Last {days} days
                </div>
              </div>
              <TrendChart trend={trend} />
            </div>

            {/* Risk score gauge */}
            <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col items-center justify-center gap-4">
              <h2 className="self-start font-semibold">Risk Assessment</h2>
              {riskData?.currentRiskScore != null ? (
                <>
                  <ScoreGauge score={Math.round(riskScore)} />
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium capitalize ${riskBadge}`}>
                    <RiskIcon className="h-4 w-4" />
                    {riskLevel} Risk
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 opacity-30" />
                  <p className="text-sm">No risk data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Violation severity breakdown */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">Violations by Severity</h2>
              {Object.keys(severityCounts).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 opacity-30" />
                  <p className="mt-2 text-sm">No violations recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                    const count = severityCounts[sev] ?? 0;
                    const cfg = SEVERITY_CONFIG[sev];
                    if (!cfg) return null;
                    return (
                      <div key={sev}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        <MiniBar value={count} max={severityMax} color={cfg.bar} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top violated rules */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-4 font-semibold">Most Violated Rules</h2>
              {topRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 opacity-30" />
                  <p className="mt-2 text-sm">No violations recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topRules.slice(0, 8).map((r, i) => (
                    <div key={r.rule} className="flex items-center gap-3">
                      <span className="w-5 text-right text-xs text-muted-foreground font-mono">
                        {i + 1}.
                      </span>
                      <p className="flex-1 truncate text-sm" title={r.rule}>
                        {r.rule}
                      </p>
                      <span className="shrink-0 rounded-full bg-fail/15 px-2 py-0.5 text-xs font-medium text-fail">
                        {r.count}×
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

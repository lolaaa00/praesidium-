'use client';

import {
  Shield,
  Bot,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Clock,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { useComplianceAnalytics, useRiskAnalytics } from '@/hooks/queries/use-analytics';
import { useValidations } from '@/hooks/queries/use-validations';
import { usePolicies } from '@/hooks/queries/use-policies';
import { useAgents } from '@/hooks/queries/use-agents';

function StatCard({
  label,
  value,
  icon: Icon,
  description,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {href && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function OverviewPage() {
  const { data: compliance } = useComplianceAnalytics(30);
  const { data: risk } = useRiskAnalytics(30);
  const { data: validationsData } = useValidations({ limit: 5 });
  const { data: policiesData } = usePolicies({ status: 'active' });
  const { data: agentsData } = useAgents({ status: 'active' });

  const summary = compliance?.summary;
  const recentValidations = validationsData?.validations ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Compliance dashboard with key metrics and recent activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Policies"
          value={policiesData?.pagination.total ?? '—'}
          icon={Shield}
          href="/policies"
          description="Enforced compliance rules"
        />
        <StatCard
          label="Active Agents"
          value={agentsData?.pagination.total ?? '—'}
          icon={Bot}
          href="/agents"
          description="Registered AI agents"
        />
        <StatCard
          label="Validations (30d)"
          value={summary?.total ?? '—'}
          icon={CheckCircle}
          href="/validations"
          description={summary ? `${summary.approvalRate}% approval rate` : undefined}
        />
        <StatCard
          label="Risk Score"
          value={risk?.currentRiskScore ?? '—'}
          icon={risk?.riskLevel === 'critical' || risk?.riskLevel === 'high' ? AlertTriangle : TrendingUp}
          href="/risk"
          description={risk?.riskLevel ? `Level: ${risk.riskLevel}` : undefined}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compliance Summary */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Compliance Summary</h2>
            <Link href="/validations" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {summary ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-sm font-medium text-green-600">{summary.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rejected</span>
                <span className="text-sm font-medium text-red-600">{summary.rejected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Escalated</span>
                <span className="text-sm font-medium text-amber-600">{summary.escalated}</span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-sm font-medium">Avg Compliance Score</span>
                <span className="text-sm font-bold">{summary.avgComplianceScore}%</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading compliance data...</p>
          )}
        </div>

        {/* Recent Validations */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Validations</h2>
            <Link href="/validations" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          {recentValidations.length > 0 ? (
            <div className="space-y-3">
              {(recentValidations as Array<Record<string, unknown>>).map((v) => (
                <Link
                  key={v.id as string}
                  href={`/validations/${v.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {v.status === 'completed' ? (
                      <Activity className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {(v.action_type as string) || 'Unknown action'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(v.agent as Record<string, unknown>)?.name as string || 'Unknown agent'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    v.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : v.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {v.status as string}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No validations yet.</p>
          )}
        </div>
      </div>

      {/* Risk Violations */}
      {risk && risk.topViolatedRules.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Policy Violations (30d)</h2>
            <Link href="/risk" className="text-sm text-primary hover:underline">
              Risk details
            </Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {risk.topViolatedRules.slice(0, 6).map((rule) => (
              <div
                key={rule.rule}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm truncate mr-2">{rule.rule}</span>
                <span className="text-sm font-bold text-red-600 shrink-0">{rule.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

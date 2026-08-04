'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Clock,
  Shield,
  Bot,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useValidation } from '@/hooks/queries/use-validations';

const VERDICT_CONFIG: Record<
  string,
  { icon: React.ElementType; badge: string; label: string; color: string }
> = {
  approved: {
    icon: CheckCircle,
    badge: 'bg-pass/15 text-pass',
    label: 'Approved',
    color: 'text-pass',
  },
  rejected: {
    icon: XCircle,
    badge: 'bg-fail/15 text-fail',
    label: 'Rejected',
    color: 'text-fail',
  },
  escalated: {
    icon: AlertTriangle,
    badge: 'bg-warn/15 text-warn',
    label: 'Escalated',
    color: 'text-warn',
  },
  conditional: {
    icon: Filter,
    badge: 'bg-cornflower/15 text-maxblue-2',
    label: 'Conditional',
    color: 'text-maxblue-2',
  },
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-cornflower/15 text-maxblue-2',
  completed: 'bg-pass/15 text-pass',
  failed: 'bg-fail/15 text-fail',
  timeout: 'bg-warn/15 text-warn',
};

const SEVERITY_BADGE: Record<string, string> = {
  low: 'bg-cornflower/15 text-maxblue-2',
  medium: 'bg-warn/15 text-warn',
  high: 'bg-warn/15 text-warn',
  critical: 'bg-fail/15 text-fail',
};

function ScoreRing({ score }: { score: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color =
    score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="40" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="bold" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

export default function ValidationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useValidation(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data?.validation) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Validation not found</p>
        <Link href="/validations" className="mt-2 text-sm text-primary hover:underline">
          Back to validations
        </Link>
      </div>
    );
  }

  const v = data.validation as Record<string, unknown>;
  const agent = v.agent as Record<string, unknown> | null;
  const policy = v.policy as Record<string, unknown> | null;
  const results = (v.validation_results as Array<Record<string, unknown>>) ?? [];
  const result = results[0] as Record<string, unknown> | undefined;
  const verdict = result?.verdict as string | undefined;
  const vConfig = verdict ? VERDICT_CONFIG[verdict] : undefined;
  const VerdictIcon = vConfig?.icon ?? Clock;
  const violations = (result?.violations as Array<Record<string, unknown>>) ?? [];
  const escalations = (v.escalations as Array<Record<string, unknown>>) ?? [];
  const actionData = v.action_data as Record<string, unknown> | null;
  const complianceScore = result?.compliance_score as number | null;
  const reasoning = result?.reasoning as string | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/validations"
          className="mt-1 rounded-md p-1.5 hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight font-mono">
              {v.action_type as string}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[v.status as string] || ''}`}
            >
              {v.status as string}
            </span>
            {verdict && vConfig && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${vConfig.badge}`}
              >
                <VerdictIcon className="h-3 w-3" />
                {vConfig.label}
              </span>
            )}
            {v._onChainVerified ? (
              <span className="inline-flex rounded-full bg-pass/15 px-2 py-0.5 text-xs font-medium text-pass">
                Verified on-chain
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">
                Cached (on-chain read failed)
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{v.id as string}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Score ring */}
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 shadow-sm">
          {complianceScore != null ? (
            <>
              <ScoreRing score={complianceScore} />
              <p className="mt-1 text-xs text-muted-foreground">Compliance Score</p>
            </>
          ) : (
            <>
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-muted text-muted-foreground">
                <Clock className="h-8 w-8" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Pending</p>
            </>
          )}
        </div>

        {/* Agent */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Bot className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Agent</span>
          </div>
          {agent ? (
            <Link
              href={`/agents/${agent.id as string}`}
              className="flex items-center gap-1 font-medium hover:underline"
            >
              {agent.name as string}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">Unknown</p>
          )}
          {agent?.agent_type != null && (
            <p className="mt-0.5 text-xs text-muted-foreground capitalize">
              {String(agent.agent_type).replace('_', ' ')}
            </p>
          )}
        </div>

        {/* Policy */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Policy</span>
          </div>
          {policy ? (
            <Link
              href={`/policies/${policy.id as string}`}
              className="flex items-center gap-1 font-medium hover:underline"
            >
              {policy.name as string}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ) : (
            <p className="text-muted-foreground text-sm">No policy</p>
          )}
          {policy?.version != null && (
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">v{policy.version as number}</p>
          )}
        </div>

        {/* Timing */}
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Processing</span>
          </div>
          {result?.processing_time_ms != null ? (
            <p className="font-mono font-medium">{result.processing_time_ms as number}ms</p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
          <p className="mt-0.5 text-xs text-muted-foreground">
            {new Date(v.created_at as string).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Consensus result */}
      {result && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h2 className="font-semibold">Consensus Result</h2>
            {verdict && vConfig && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${vConfig.badge}`}>
                <VerdictIcon className="h-4 w-4" />
                {vConfig.label}
              </span>
            )}
          </div>
          <div className="p-6 space-y-4">
            {reasoning && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Reasoning</p>
                <p className="rounded-lg bg-muted px-4 py-3 text-sm leading-relaxed">{reasoning}</p>
              </div>
            )}
            {Array.isArray(result.conditions) && (result.conditions as string[]).length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Conditions</p>
                <ul className="space-y-1">
                  {(result.conditions as string[]).map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Filter className="mt-0.5 h-4 w-4 shrink-0 text-maxblue-2" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.consensus_data != null && (
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">On-chain Consensus</p>
                <pre className="overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-xs">
                  {JSON.stringify(result.consensus_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Violations */}
      {violations.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">
              Policy Violations{' '}
              <span className="ml-1 rounded-full bg-fail/15 px-2 py-0.5 text-xs font-medium text-fail">
                {violations.length}
              </span>
            </h2>
          </div>
          <div className="divide-y">
            {violations.map((viol) => (
              <div key={viol.id as string} className="px-6 py-4 space-y-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-fail shrink-0" />
                  <p className="font-medium text-sm">
                    {(viol.policy_rule as Record<string, unknown>)?.name as string ??
                      `Rule ${viol.rule_id as string}`}
                  </p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[(viol.severity as string) ?? 'medium'] || ''}`}
                  >
                    {viol.severity as string}
                  </span>
                </div>
                {viol.description != null && (
                  <p className="pl-6 text-sm text-muted-foreground">{viol.description as string}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalations */}
      {escalations.length > 0 && (
        <div className="rounded-xl border border-warn/30 bg-warn/10 shadow-sm overflow-hidden">
          <div className="border-b border-warn/30 px-6 py-4">
            <h2 className="font-semibold text-warn">Escalation Required</h2>
          </div>
          <div className="divide-y divide-amber-200">
            {escalations.map((esc) => (
              <div key={esc.id as string} className="px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-warn" />
                  <p className="font-medium text-warn text-sm capitalize">
                    {(esc.escalation_type as string)?.replace('_', ' ')}
                  </p>
                  <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn capitalize">
                    {esc.status as string}
                  </span>
                </div>
                {esc.reason != null && (
                  <p className="pl-6 text-sm text-warn">{esc.reason as string}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action data */}
      {actionData && Object.keys(actionData).length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold">Action Payload</h2>
          </div>
          <div className="p-6">
            <pre className="overflow-auto rounded-lg bg-muted px-4 py-3 font-mono text-xs">
              {JSON.stringify(actionData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

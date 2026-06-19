'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  Users,
  Zap,
  Shield,
  Bot,
} from 'lucide-react';
import { useValidations } from '@/hooks/queries/use-validations';
import { useContractStatus } from '@/hooks/queries/use-contract';

const ESCALATION_TYPE_LABEL: Record<string, string> = {
  human_review: 'Human Review',
  policy_exception: 'Policy Exception',
  high_risk: 'High Risk',
  ambiguous: 'Ambiguous',
};

const VERDICT_BADGE: Record<string, string> = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  escalated: 'bg-amber-100 text-amber-700',
  conditional: 'bg-blue-100 text-blue-700',
};

export default function ConsensusPage() {
  const [tab, setTab] = useState<'escalated' | 'recent'>('escalated');
  const router = useRouter();

  const { data: escalatedData, isLoading: escalatedLoading } = useValidations({
    verdict: 'escalated',
    limit: 20,
  });
  const { data: recentData, isLoading: recentLoading } = useValidations({
    status: 'completed',
    limit: 20,
  });
  const { data: contractStatus } = useContractStatus();

  const isLoading = tab === 'escalated' ? escalatedLoading : recentLoading;
  const validations = (
    tab === 'escalated'
      ? escalatedData?.validations
      : recentData?.validations
  ) as Array<Record<string, unknown>> ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consensus</h1>
          <p className="text-muted-foreground">
            GenLayer on-chain consensus results and escalation queue.
          </p>
        </div>

        {/* Contract status chip */}
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm shadow-sm">
          <div
            className={`h-2 w-2 rounded-full ${
              contractStatus?.status === 'healthy' ? 'bg-green-500' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium">
            {contractStatus?.status === 'healthy' ? 'Contract Online' : 'Contract Offline'}
          </span>
          {contractStatus?.network && (
            <span className="text-muted-foreground">{contractStatus.network}</span>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Escalated',
            value: String(escalatedData?.pagination?.total ?? '—'),
            icon: AlertTriangle,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
          },
          {
            label: 'Completed',
            value: String(recentData?.pagination?.total ?? '—'),
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
          {
            label: 'Validators',
            value: contractStatus?.validators != null ? String(contractStatus.validators) : '—',
            icon: Users,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Avg Latency',
            value: contractStatus?.avgLatencyMs != null ? `${contractStatus.avgLatencyMs}ms` : '—',
            icon: Zap,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl border p-4 ${bg}`}>
            <div className={`rounded-lg bg-white p-2 shadow-sm ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-mono font-semibold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(
          [
            { key: 'escalated', label: 'Escalation Queue' },
            { key: 'recent', label: 'Recent Consensus' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : validations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16">
          {tab === 'escalated' ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500/50" />
              <p className="mt-4 text-lg font-medium">No pending escalations</p>
              <p className="text-sm text-muted-foreground">All validations resolved by consensus.</p>
            </>
          ) : (
            <>
              <Clock className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">No completed validations</p>
              <p className="text-sm text-muted-foreground">
                Validations will appear once agents submit actions.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {validations.map((v) => {
            const results = (v.validation_results as Array<Record<string, unknown>>) ?? [];
            const result = results[0] as Record<string, unknown> | undefined;
            const verdict = result?.verdict as string | undefined;
            const agent = v.agent as Record<string, unknown> | null;
            const policy = v.policy as Record<string, unknown> | null;
            const escalations = (v.escalations as Array<Record<string, unknown>>) ?? [];
            const consensusData = result?.consensus_data as Record<string, unknown> | null;
            const score = result?.compliance_score as number | null;

            return (
              <div
                key={v.id as string}
                className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/validations/${v.id as string}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Left: icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      verdict === 'escalated'
                        ? 'bg-amber-100'
                        : verdict === 'approved'
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {verdict === 'escalated' ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : verdict === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Shield className="h-5 w-5 text-red-600" />
                    )}
                  </div>

                  {/* Middle: details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-mono font-medium">{v.action_type as string}</p>
                      {verdict && (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_BADGE[verdict] || ''}`}
                        >
                          {verdict}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      {agent && (
                        <span className="flex items-center gap-1">
                          <Bot className="h-3.5 w-3.5" />
                          {agent.name as string}
                        </span>
                      )}
                      {policy && (
                        <span className="flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5" />
                          {policy.name as string}
                        </span>
                      )}
                      {score != null && (
                        <span className="font-mono">{score}% compliance</span>
                      )}
                    </div>

                    {/* Escalation tags */}
                    {escalations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {escalations.map((esc) => (
                          <span
                            key={esc.id as string}
                            className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                          >
                            {ESCALATION_TYPE_LABEL[esc.escalation_type as string] ??
                              (esc.escalation_type as string)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Consensus summary */}
                    {consensusData != null && (
                      <div className="mt-2 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground truncate">
                        {JSON.stringify(consensusData)}
                      </div>
                    )}
                  </div>

                  {/* Right: time + link */}
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at as string).toLocaleString()}
                    </p>
                    <Link
                      href={`/validations/${v.id as string}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

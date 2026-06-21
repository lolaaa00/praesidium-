'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
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
import { useResolveEscalation } from '@/hooks/queries/use-escalations';
import { ensureOrgRegisteredOnChain, writeContractAsUser } from '@/lib/genlayer/client';
import { useOrgStore } from '@/stores/org-store';
import { getErrorMessage } from '@/lib/utils/errors';

const RESOLUTION_OPTIONS = [
  { value: 'approved' as const, label: 'Approve action' },
  { value: 'rejected' as const, label: 'Reject action' },
  { value: 'policy_updated' as const, label: 'Approve & update policy' },
];

const VERDICT_BADGE: Record<string, string> = {
  approved: 'bg-pass/15 text-pass',
  rejected: 'bg-fail/15 text-fail',
  escalated: 'bg-warn/15 text-warn',
  conditional: 'bg-cornflower/15 text-maxblue-2',
};

export default function ConsensusPage() {
  const [tab, setTab] = useState<'escalated' | 'recent'>('escalated');
  const router = useRouter();
  const { address } = useAccount();
  const { currentOrgName } = useOrgStore();
  const resolveEscalation = useResolveEscalation();

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'approved' | 'rejected' | 'policy_updated'>('approved');
  const [resolutionNote, setResolutionNote] = useState('');
  const [chainStatus, setChainStatus] = useState<string | null>(null);

  const { data: escalatedData, isLoading: escalatedLoading } = useValidations({
    verdict: 'escalated',
    limit: 20,
  });
  const { data: recentData, isLoading: recentLoading } = useValidations({
    status: 'completed',
    limit: 20,
  });
  const { data: contractStatus } = useContractStatus();

  function startResolving(escalationId: string) {
    setResolvingId(escalationId);
    setResolutionStatus('approved');
    setResolutionNote('');
  }

  async function submitResolution(escalationId: string, requestId: string, orgId: string) {
    if (!resolutionNote.trim()) return;

    await resolveEscalation.mutateAsync({
      id: escalationId,
      status: resolutionStatus,
      resolutionNote: resolutionNote.trim(),
    });
    setResolvingId(null);

    // Mirror the resolution on-chain, signed by the resolving admin. Best
    // effort — the Supabase record is the source of truth and is already
    // updated regardless of whether this succeeds.
    if (address) {
      try {
        setChainStatus('Confirm in your wallet to record the resolution on-chain...');
        const onChainStatus = resolutionStatus === 'rejected' ? 'dismissed' : 'resolved';
        await ensureOrgRegisteredOnChain(address, orgId, currentOrgName ?? orgId);
        await writeContractAsUser(address, 'resolve_escalation', [
          `esc-${requestId}`,
          onChainStatus,
          resolutionNote.trim(),
        ]);
        setChainStatus(null);
      } catch (chainErr) {
        console.warn('On-chain escalation resolution failed:', chainErr);
        setChainStatus(
          `On-chain escalation resolution failed: ${getErrorMessage(chainErr)}`,
        );
      }
    }
  }

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
              contractStatus?.status === 'healthy' ? 'bg-pass' : 'bg-warn'
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

      {chainStatus && (
        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{chainStatus}</div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: 'Escalated',
            value: String(escalatedData?.pagination?.total ?? '—'),
            icon: AlertTriangle,
            color: 'text-warn',
            bg: 'bg-warn/10',
          },
          {
            label: 'Completed',
            value: String(recentData?.pagination?.total ?? '—'),
            icon: CheckCircle,
            color: 'text-pass',
            bg: 'bg-pass/10',
          },
          {
            label: 'Validators',
            value: contractStatus?.validators != null ? String(contractStatus.validators) : '—',
            icon: Users,
            color: 'text-maxblue-2',
            bg: 'bg-maxblue/10',
          },
          {
            label: 'Avg Latency',
            value: contractStatus?.avgLatencyMs != null ? `${contractStatus.avgLatencyMs}ms` : '—',
            icon: Zap,
            color: 'text-cornflower-2',
            bg: 'bg-cornflower/10',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 rounded-xl border border-border p-4 ${bg}`}>
            <div className={`rounded-lg bg-card p-2 shadow-sm ${color}`}>
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
              <CheckCircle className="h-12 w-12 text-pass/50" />
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
                        ? 'bg-warn/15'
                        : verdict === 'approved'
                        ? 'bg-pass/15'
                        : 'bg-fail/15'
                    }`}
                  >
                    {verdict === 'escalated' ? (
                      <AlertTriangle className="h-5 w-5 text-warn" />
                    ) : verdict === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-pass" />
                    ) : (
                      <Shield className="h-5 w-5 text-fail" />
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

                    {/* Escalations */}
                    {escalations.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {escalations.map((esc) => {
                          const escId = esc.id as string;
                          const escStatus = esc.status as string;
                          const isOpen = escStatus === 'open';
                          const isResolving = resolvingId === escId;

                          return (
                            <div key={escId} onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                    isOpen ? 'bg-warn/15 text-warn' : 'bg-pass/15 text-pass'
                                  }`}
                                >
                                  {isOpen ? 'Open escalation' : `Resolved: ${escStatus}`}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-md">
                                  {esc.reason as string}
                                </span>
                                {isOpen && !isResolving && (
                                  <button
                                    onClick={() => startResolving(escId)}
                                    className="rounded-md border border-primary/30 px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </div>

                              {isResolving && (
                                <div className="mt-2 rounded-lg border bg-muted/40 p-3 space-y-2">
                                  <select
                                    value={resolutionStatus}
                                    onChange={(e) =>
                                      setResolutionStatus(e.target.value as typeof resolutionStatus)
                                    }
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                                  >
                                    {RESOLUTION_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                  <textarea
                                    value={resolutionNote}
                                    onChange={(e) => setResolutionNote(e.target.value)}
                                    placeholder="Resolution notes (required) — what did you decide and why?"
                                    rows={2}
                                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        submitResolution(
                                          escId,
                                          v.id as string,
                                          v.org_id as string,
                                        )
                                      }
                                      disabled={resolveEscalation.isPending || !resolutionNote.trim()}
                                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                    >
                                      {resolveEscalation.isPending ? 'Resolving…' : 'Submit Resolution'}
                                    </button>
                                    <button
                                      onClick={() => setResolvingId(null)}
                                      className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
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

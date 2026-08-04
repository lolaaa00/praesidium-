'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Shield, Bot } from 'lucide-react';
import { useEscalation, useResolveEscalation } from '@/hooks/queries/use-escalations';

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-warn/15 text-warn',
  approved: 'bg-pass/15 text-pass',
  rejected: 'bg-fail/15 text-fail',
  policy_updated: 'bg-cornflower/15 text-maxblue-2',
};

const RESOLUTION_OPTIONS = [
  { value: 'approved', label: 'Approve action' },
  { value: 'rejected', label: 'Reject action' },
  { value: 'policy_updated', label: 'Update policy and resolve' },
] as const;

export default function EscalationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useEscalation(id);
  const resolveEscalation = useResolveEscalation();

  const [resolutionStatus, setResolutionStatus] = useState<(typeof RESOLUTION_OPTIONS)[number]['value']>('approved');
  const [resolutionNote, setResolutionNote] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data?.escalation) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertTriangle className="h-12 w-12 text-muted-foreground/50" />
        <p className="mt-4 text-lg font-medium">Escalation not found</p>
        <Link href="/consensus" className="mt-2 text-sm text-primary hover:underline">
          Back to consensus
        </Link>
      </div>
    );
  }

  const esc = data.escalation;
  const validationRequest = esc.validation_request as Record<string, unknown> | null;
  const isOpen = esc.status === 'open';

  async function submitResolution() {
    if (!resolutionNote.trim()) return;
    await resolveEscalation.mutateAsync({
      id,
      status: resolutionStatus,
      resolutionNote,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link
        href="/consensus"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to consensus
      </Link>

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warn" />
              <h1 className="text-xl font-semibold">Escalation</h1>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{esc.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE[esc.status] ?? 'bg-muted text-muted-foreground'}`}>
              {isOpen ? 'Open' : esc.status.replace('_', ' ')}
            </span>
            {esc._onChainVerified ? (
              <span className="inline-flex rounded-full bg-pass/15 px-2 py-0.5 text-xs font-medium text-pass">
                Verified on-chain
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn">
                Cached (on-chain read failed)
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Reason</span>
            <p className="mt-1">{esc.reason}</p>
          </div>

          {validationRequest && (
            <div className="flex items-center gap-4 text-muted-foreground">
              {'action_type' in validationRequest && (
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  {String(validationRequest.action_type)}
                </span>
              )}
              {'agent_id' in validationRequest && (
                <span className="flex items-center gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  {String(validationRequest.agent_id)}
                </span>
              )}
              <Link
                href={`/validations/${String(validationRequest.id)}`}
                className="text-primary hover:underline"
              >
                View validation
              </Link>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t pt-3 text-xs">
            <div>
              <span className="text-muted-foreground">Created</span>
              <p>{new Date(esc.created_at).toLocaleString()}</p>
            </div>
            {esc.resolved_at && (
              <div>
                <span className="text-muted-foreground">Resolved</span>
                <p>{new Date(esc.resolved_at).toLocaleString()}</p>
              </div>
            )}
          </div>

          {esc.resolution_note && (
            <div className="border-t pt-3">
              <span className="text-muted-foreground">Resolution notes</span>
              <p className="mt-1">{esc.resolution_note}</p>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="mt-6 space-y-2 rounded-lg border bg-muted/40 p-4">
            <select
              value={resolutionStatus}
              onChange={(e) => setResolutionStatus(e.target.value as typeof resolutionStatus)}
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
              rows={3}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-sm resize-none"
            />
            <button
              onClick={submitResolution}
              disabled={resolveEscalation.isPending || !resolutionNote.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {resolveEscalation.isPending ? 'Resolving…' : 'Submit Resolution'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

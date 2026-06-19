'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle, Clock, Search, Filter } from 'lucide-react';
import { useValidations } from '@/hooks/queries/use-validations';

const VERDICT_CONFIG: Record<string, { icon: React.ElementType; badge: string }> = {
  approved: { icon: CheckCircle, badge: 'bg-pass/15 text-pass' },
  rejected: { icon: XCircle, badge: 'bg-fail/15 text-fail' },
  escalated: { icon: AlertTriangle, badge: 'bg-warn/15 text-warn' },
  conditional: { icon: Filter, badge: 'bg-cornflower/15 text-maxblue-2' },
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  processing: 'bg-cornflower/15 text-maxblue-2',
  completed: 'bg-pass/15 text-pass',
  failed: 'bg-fail/15 text-fail',
  timeout: 'bg-warn/15 text-warn',
};

export default function ValidationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useValidations({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const validations = (data?.validations ?? []) as Array<Record<string, unknown>>;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Validations</h1>
        <p className="text-muted-foreground">View validation history and consensus results.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-2 flex-wrap">
          {['', 'pending', 'processing', 'completed', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : validations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No validations found</p>
          <p className="text-sm text-muted-foreground">
            Validations appear when agents submit actions for compliance review.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {validations.map((v) => {
              const results = (v.validation_results as Array<Record<string, unknown>>) || [];
              const result = results[0];
              const verdict = result?.verdict as string;
              const config = VERDICT_CONFIG[verdict];
              const VerdictIcon = config?.icon || Clock;
              const agent = v.agent as Record<string, unknown> | null;
              const policy = v.policy as Record<string, unknown> | null;

              return (
                <Link
                  key={v.id as string}
                  href={`/validations/${v.id}`}
                  className="block rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <VerdictIcon className={`h-5 w-5 ${verdict === 'approved' ? 'text-pass' : verdict === 'rejected' ? 'text-fail' : 'text-warn'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{v.action_type as string}</p>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[v.status as string] || ''}`}>
                          {v.status as string}
                        </span>
                        {verdict && (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config?.badge || ''}`}>
                            {verdict}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        {agent && <span>Agent: {agent.name as string}</span>}
                        {policy && <span>Policy: {policy.name as string}</span>}
                        {result?.compliance_score != null && (
                          <span>Score: {result.compliance_score as number}%</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(v.created_at as string).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(pagination.total / pagination.limit)}
                  className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

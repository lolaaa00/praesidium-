'use client';

import { useState } from 'react';
import { ScrollText, User, Clock } from 'lucide-react';
import { useAuditLogs } from '@/hooks/queries/use-audit';

const ACTION_COLORS: Record<string, string> = {
  policy_created: 'text-blue-600',
  policy_updated: 'text-blue-600',
  policy_activated: 'text-green-600',
  policy_archived: 'text-red-600',
  agent_registered: 'text-purple-600',
  agent_suspended: 'text-amber-600',
  agent_revoked: 'text-red-600',
  validation_completed: 'text-green-600',
  validation_failed: 'text-red-600',
  escalation_created: 'text-amber-600',
  member_invited: 'text-blue-600',
  member_removed: 'text-red-600',
  org_created: 'text-green-600',
  user_login: 'text-gray-600',
  user_logout: 'text-gray-600',
};

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AuditTrailPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading } = useAuditLogs({
    action: actionFilter || undefined,
    page,
    limit: 50,
  });

  const logs = (data?.logs ?? []) as Array<Record<string, unknown>>;
  const pagination = data?.pagination;

  const actionTypes = [
    '', 'policy_created', 'policy_activated', 'policy_archived',
    'agent_registered', 'agent_revoked',
    'validation_completed', 'validation_failed',
    'escalation_created', 'member_invited', 'member_removed',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground">Chronological log of all system events.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {actionTypes.map((a) => (
          <button
            key={a}
            onClick={() => { setActionFilter(a); setPage(1); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              actionFilter === a
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {a ? formatAction(a) : 'All Events'}
          </button>
        ))}
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12">
          <ScrollText className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No audit logs found</p>
          <p className="text-sm text-muted-foreground">Events will appear as actions are performed.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log, i) => {
            const user = log.user as Record<string, unknown> | null;
            const action = log.action as string;
            const details = log.details as Record<string, unknown> | null;

            return (
              <div
                key={log.id as string}
                className="flex items-start gap-4 rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center mt-1">
                  <div className={`h-2 w-2 rounded-full ${ACTION_COLORS[action] ? 'bg-current' : 'bg-gray-400'} ${ACTION_COLORS[action] || 'text-gray-400'}`} />
                  {i < logs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${ACTION_COLORS[action] || 'text-foreground'}`}>
                      {formatAction(action)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.resource_type as string}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {user && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {(user.display_name as string) || (user.wallet_address as string)?.slice(0, 10) + '...'}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at as string).toLocaleString()}
                    </span>
                  </div>

                  {details && Object.keys(details).length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 truncate max-w-lg">
                      {JSON.stringify(details)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}

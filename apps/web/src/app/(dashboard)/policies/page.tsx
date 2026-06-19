'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Shield, MoreHorizontal, Search } from 'lucide-react';
import { usePolicies, useDeletePolicy, useUpdatePolicy } from '@/hooks/queries/use-policies';

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-pass/15 text-pass',
  archived: 'bg-fail/15 text-fail',
};

export default function PoliciesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = usePolicies({ status: statusFilter || undefined });
  const deletePolicy = useDeletePolicy();
  const updatePolicy = useUpdatePolicy();

  const policies = data?.policies ?? [];
  const filtered = search
    ? policies.filter((p) =>
        (p.name as string).toLowerCase().includes(search.toLowerCase()),
      )
    : policies;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground">Manage compliance policies and rules.</p>
        </div>
        <Link
          href="/policies/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Policy
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search policies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {['', 'draft', 'active', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
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

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-12">
          <Shield className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No policies found</p>
          <p className="text-sm text-muted-foreground">
            {statusFilter ? `No ${statusFilter} policies.` : 'Create your first policy to get started.'}
          </p>
          <Link
            href="/policies/new"
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Rules</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((policy) => {
                const rules = policy.policy_rules;
                const ruleCount = Array.isArray(rules)
                  ? rules.length
                  : 0;

                return (
                  <tr key={policy.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/policies/${policy.id}`} className="hover:underline">
                        <p className="font-medium">{policy.name}</p>
                        {policy.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {policy.description}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[policy.status] || ''}`}>
                        {policy.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">v{policy.version}</td>
                    <td className="px-6 py-4 text-sm">{ruleCount}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(policy.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {policy.status === 'draft' && (
                          <button
                            onClick={() => updatePolicy.mutate({ id: policy.id, status: 'active' })}
                            className="rounded-md px-2 py-1 text-xs font-medium text-pass hover:bg-pass/15 transition-colors"
                          >
                            Activate
                          </button>
                        )}
                        {policy.status !== 'archived' && (
                          <button
                            onClick={() => deletePolicy.mutate(policy.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-fail hover:bg-fail/15 transition-colors"
                          >
                            Archive
                          </button>
                        )}
                        <Link
                          href={`/policies/${policy.id}`}
                          className="rounded-md p-1 hover:bg-accent transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data && data.pagination.total > data.pagination.limit && (
            <div className="border-t px-6 py-3 text-sm text-muted-foreground">
              Showing {filtered.length} of {data.pagination.total} policies
            </div>
          )}
        </div>
      )}
    </div>
  );
}

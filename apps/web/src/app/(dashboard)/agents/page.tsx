'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Bot, Search, Key, MoreHorizontal } from 'lucide-react';
import { useAgents, useRevokeAgent } from '@/hooks/queries/use-agents';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  revoked: 'bg-red-100 text-red-700',
};

const TYPE_LABEL: Record<string, string> = {
  chatbot: 'Chatbot',
  workflow: 'Workflow',
  autonomous: 'Autonomous',
  tool_agent: 'Tool Agent',
};

export default function AgentsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAgents({ status: statusFilter || undefined });
  const revokeAgent = useRevokeAgent();

  const agents = data?.agents ?? [];
  const filtered = search
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()),
      )
    : agents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Register and manage AI agents.</p>
        </div>
        <Link
          href="/agents/new"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register Agent
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {['', 'active', 'suspended', 'revoked'].map((s) => (
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
          <Bot className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No agents found</p>
          <p className="text-sm text-muted-foreground">Register your first agent to start validating.</p>
          <Link
            href="/agents/new"
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Register Agent
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">API Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Seen</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((agent) => (
                <tr key={agent.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/agents/${agent.id}`} className="hover:underline">
                      <p className="font-medium">{agent.name}</p>
                      {agent.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {agent.description}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">{TYPE_LABEL[agent.agent_type] || agent.agent_type}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[agent.status] || ''}`}>
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono">
                      <Key className="h-3 w-3" />
                      {agent.api_key_prefix}...
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {agent.last_seen_at
                      ? new Date(agent.last_seen_at).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {agent.status === 'active' && (
                        <button
                          onClick={() => revokeAgent.mutate(agent.id)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      <Link
                        href={`/agents/${agent.id}`}
                        className="rounded-md p-1 hover:bg-accent transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

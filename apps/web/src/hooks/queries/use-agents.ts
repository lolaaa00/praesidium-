'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface AgentRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  agent_type: 'chatbot' | 'workflow' | 'autonomous' | 'tool_agent';
  status: 'active' | 'suspended' | 'revoked';
  api_key_prefix: string;
  api_key_hash: string;
  metadata: Record<string, unknown>;
  last_seen_at: string | null;
  registered_by: string;
  created_at: string;
  updated_at: string;
  genlayer_address: string | null;
  /** Merged in on read from the deployed contract — see /api/agents/[id]. */
  _onChainVerified?: boolean;
}

interface PermissionRow {
  id: string;
  agent_id: string;
  action_type: string;
  allowed: boolean;
  conditions: Record<string, unknown> | null;
  created_at: string;
}

interface AgentsResponse {
  agents: AgentRow[];
  pagination: { page: number; limit: number; total: number };
}

interface AgentResponse {
  agent: AgentRow & { agent_permissions: PermissionRow[] };
}

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) =>
    [...agentKeys.lists(), filters] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export function useAgents(
  filters: { status?: string; type?: string; page?: number; limit?: number } = {},
  options: { enabled?: boolean } = {},
) {
  const { status, type, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: agentKeys.list({ status: status || '', type: type || '', page, limit }),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await orgFetch(`/api/agents?${params}`);
      return parseResponse<AgentsResponse>(res);
    },
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: async () => {
      const res = await orgFetch(`/api/agents/${id}`);
      return parseResponse<AgentResponse>(res);
    },
    enabled: !!id,
  });
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

export function useRegisterAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      agentType: 'chatbot' | 'workflow' | 'autonomous' | 'tool_agent';
      metadata?: Record<string, unknown>;
    }) => {
      const res = await orgFetch('/api/agents', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return parseResponse<{ agent: AgentRow; apiKey: string }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      description?: string;
      status?: 'active' | 'suspended' | 'revoked';
      metadata?: Record<string, unknown>;
      rotateKey?: boolean;
    }) => {
      const res = await orgFetch(`/api/agents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return parseResponse<{ agent: AgentRow; apiKey?: string }>(res);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: agentKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}

export function useRevokeAgent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await orgFetch(`/api/agents/${id}`, { method: 'DELETE' });
      return parseResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agentKeys.lists() });
    },
  });
}

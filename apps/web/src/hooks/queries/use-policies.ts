'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Types (API response shapes)
// ──────────────────────────────────────────

interface PolicyRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  policy_rules?: RuleRow[] | { count: number }[];
  /** On-chain fields merged in on read — see /api/policies/[id]. */
  rules_hash?: string;
  active?: boolean;
  _onChainVerified?: boolean;
}

interface RuleRow {
  id: string;
  policy_id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rule_definition: {
    condition: string;
    actionTypes: string[];
    parameters?: Record<string, unknown>;
  };
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PoliciesResponse {
  policies: PolicyRow[];
  pagination: { page: number; limit: number; total: number };
}

interface PolicyResponse {
  policy: PolicyRow & { policy_rules: RuleRow[] };
}

interface RulesResponse {
  rules: RuleRow[];
}

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) =>
    [...policyKeys.lists(), filters] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  rules: (policyId: string) => [...policyKeys.detail(policyId), 'rules'] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export function usePolicies(
  filters: { status?: string; page?: number; limit?: number } = {},
  options: { enabled?: boolean } = {},
) {
  const { status, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: policyKeys.list({ status: status || '', page, limit }),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await orgFetch(`/api/policies?${params}`);
      return parseResponse<PoliciesResponse>(res);
    },
  });
}

export function usePolicy(id: string) {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: async () => {
      const res = await orgFetch(`/api/policies/${id}`);
      return parseResponse<PolicyResponse>(res);
    },
    enabled: !!id,
  });
}

export function usePolicyRules(policyId: string) {
  return useQuery({
    queryKey: policyKeys.rules(policyId),
    queryFn: async () => {
      const res = await orgFetch(`/api/policies/${policyId}/rules`);
      return parseResponse<RulesResponse>(res);
    },
    enabled: !!policyId,
  });
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

export function useCreatePolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const res = await orgFetch('/api/policies', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return parseResponse<{ policy: PolicyRow }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.lists() });
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      description?: string;
      status?: 'draft' | 'active' | 'archived';
    }) => {
      const res = await orgFetch(`/api/policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return parseResponse<{ policy: PolicyRow }>(res);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: policyKeys.detail(variables.id) });
      qc.invalidateQueries({ queryKey: policyKeys.lists() });
    },
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await orgFetch(`/api/policies/${id}`, { method: 'DELETE' });
      return parseResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.lists() });
    },
  });
}

export function useCreateRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyId,
      ...input
    }: {
      policyId: string;
      name: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      ruleDefinition: {
        condition: string;
        actionTypes: string[];
        parameters?: Record<string, unknown>;
      };
      enabled?: boolean;
      sortOrder?: number;
    }) => {
      const res = await orgFetch(`/api/policies/${policyId}/rules`, {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return parseResponse<{ rule: RuleRow }>(res);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: policyKeys.rules(variables.policyId) });
      qc.invalidateQueries({ queryKey: policyKeys.detail(variables.policyId) });
    },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyId,
      ...input
    }: {
      policyId: string;
      ruleId: string;
      name?: string;
      description?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      ruleDefinition?: {
        condition: string;
        actionTypes: string[];
        parameters?: Record<string, unknown>;
      };
      enabled?: boolean;
      sortOrder?: number;
    }) => {
      const res = await orgFetch(`/api/policies/${policyId}/rules`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return parseResponse<{ rule: RuleRow }>(res);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: policyKeys.rules(variables.policyId) });
      qc.invalidateQueries({ queryKey: policyKeys.detail(variables.policyId) });
    },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, ruleId }: { policyId: string; ruleId: string }) => {
      const res = await orgFetch(`/api/policies/${policyId}/rules?ruleId=${ruleId}`, {
        method: 'DELETE',
      });
      return parseResponse<{ success: boolean }>(res);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: policyKeys.rules(variables.policyId) });
      qc.invalidateQueries({ queryKey: policyKeys.detail(variables.policyId) });
    },
  });
}

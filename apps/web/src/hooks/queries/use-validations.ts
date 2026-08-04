'use client';

import { useQuery } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const validationKeys = {
  all: ['validations'] as const,
  lists: () => [...validationKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) =>
    [...validationKeys.lists(), filters] as const,
  details: () => [...validationKeys.all, 'detail'] as const,
  detail: (id: string) => [...validationKeys.details(), id] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export function useValidations(
  filters: {
    status?: string;
    verdict?: string;
    agentId?: string;
    policyId?: string;
    page?: number;
    limit?: number;
  } = {},
  options: { enabled?: boolean } = {},
) {
  const { status, verdict, agentId, policyId, page = 1, limit = 20 } = filters;

  return useQuery({
    queryKey: validationKeys.list({
      status: status || '',
      verdict: verdict || '',
      agentId: agentId || '',
      policyId: policyId || '',
      page,
      limit,
    }),
    enabled: options.enabled ?? true,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (verdict) params.set('verdict', verdict);
      if (agentId) params.set('agentId', agentId);
      if (policyId) params.set('policyId', policyId);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await orgFetch(`/api/validations?${params}`);
      return parseResponse<{ validations: unknown[]; pagination: { page: number; limit: number; total: number } }>(res);
    },
  });
}

export function useValidation(id: string) {
  return useQuery({
    queryKey: validationKeys.detail(id),
    queryFn: async () => {
      const res = await orgFetch(`/api/validations/${id}`);
      return parseResponse<{ validation: unknown }>(res);
    },
    enabled: !!id,
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const auditKeys = {
  all: ['audit'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: Record<string, string | number>) =>
    [...auditKeys.lists(), filters] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export function useAuditLogs(
  filters: {
    action?: string;
    resourceType?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  } = {},
) {
  const { action, resourceType, userId, startDate, endDate, page = 1, limit = 50 } = filters;

  return useQuery({
    queryKey: auditKeys.list({
      action: action || '',
      resourceType: resourceType || '',
      userId: userId || '',
      startDate: startDate || '',
      endDate: endDate || '',
      page,
      limit,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (action) params.set('action', action);
      if (resourceType) params.set('resourceType', resourceType);
      if (userId) params.set('userId', userId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', String(page));
      params.set('limit', String(limit));

      const res = await orgFetch(`/api/audit?${params}`);
      return parseResponse<{ logs: unknown[]; pagination: { page: number; limit: number; total: number } }>(res);
    },
  });
}

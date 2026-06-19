'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const orgKeys = {
  all: ['org'] as const,
  members: () => [...orgKeys.all, 'members'] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

export function useOrgMembers() {
  return useQuery({
    queryKey: orgKeys.members(),
    queryFn: async () => {
      const res = await orgFetch('/api/org/members');
      return parseResponse<{ members: unknown[] }>(res);
    },
  });
}

// ──────────────────────────────────────────
// Mutations
// ──────────────────────────────────────────

export function useInviteMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { walletAddress: string; role?: string }) => {
      const res = await orgFetch('/api/org/members', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return parseResponse<{ member: unknown }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members() });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await orgFetch(`/api/org/members?userId=${userId}`, {
        method: 'DELETE',
      });
      return parseResponse<{ success: boolean }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orgKeys.members() });
    },
  });
}

export function useUpdateOrg() {
  return useMutation({
    mutationFn: async (input: { orgId: string; name?: string; description?: string }) => {
      const res = await fetch('/api/org', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<{ organization: unknown }>(res);
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

// ──────────────────────────────────────────
// Query keys
// ──────────────────────────────────────────

export const orgKeys = {
  all: ['org'] as const,
  members: () => [...orgKeys.all, 'members'] as const,
  memberships: () => [...orgKeys.all, 'memberships'] as const,
};

// ──────────────────────────────────────────
// Queries
// ──────────────────────────────────────────

interface OrgMembershipRow {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    /** On-chain field merged in on read — see GET /api/org. */
    active?: boolean;
    _onChainVerified?: boolean;
    [key: string]: unknown;
  } | null;
}

/**
 * Current user's org memberships, with each membership's `organization`
 * merged against the deployed contract's get_org (see GET /api/org).
 * Used for the "Verified on-chain" badge on the organization settings page.
 */
export function useOrgMemberships() {
  return useQuery({
    queryKey: orgKeys.memberships(),
    queryFn: async () => {
      const res = await fetch('/api/org');
      return parseResponse<{ memberships: OrgMembershipRow[] }>(res);
    },
  });
}

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

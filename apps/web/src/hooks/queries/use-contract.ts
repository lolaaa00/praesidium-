'use client';

import { useQuery } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';

interface ContractStatus {
  status: 'healthy' | 'degraded' | 'offline';
  network?: string;
  contractAddress?: string;
  validators?: number;
  avgLatencyMs?: number;
  uptime?: number;
}

export const contractKeys = {
  all: ['contract'] as const,
  status: () => [...contractKeys.all, 'status'] as const,
};

export function useContractStatus() {
  return useQuery({
    queryKey: contractKeys.status(),
    queryFn: async () => {
      const res = await orgFetch('/api/contract/status');
      const raw = await parseResponse<{ status: string; contractAddress?: string }>(res);
      // Normalise engine status values to our UI vocabulary
      const status: ContractStatus['status'] =
        raw.status === 'ok' ? 'healthy' : raw.status === 'degraded' ? 'degraded' : 'offline';
      return { ...raw, status, contractAddress: raw.contractAddress ?? undefined } as ContractStatus;
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

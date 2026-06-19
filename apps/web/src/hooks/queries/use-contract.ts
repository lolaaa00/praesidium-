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
      return parseResponse<ContractStatus>(res);
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

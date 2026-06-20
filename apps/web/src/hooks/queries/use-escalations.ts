'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { orgFetch, parseResponse } from '@/lib/api/fetch';
import { validationKeys } from '@/hooks/queries/use-validations';

interface EscalationRow {
  id: string;
  org_id: string;
  request_id: string;
  result_id: string;
  reason: string;
  status: 'open' | 'approved' | 'rejected' | 'policy_updated';
  resolved_by: string | null;
  resolution_note: string | null;
  final_verdict: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useResolveEscalation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      status: 'approved' | 'rejected' | 'policy_updated';
      resolutionNote: string;
      finalVerdict?: 'approved' | 'conditional' | 'escalated' | 'rejected';
    }) => {
      const res = await orgFetch(`/api/escalations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      });
      return parseResponse<{ escalation: EscalationRow }>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: validationKeys.lists() });
    },
  });
}

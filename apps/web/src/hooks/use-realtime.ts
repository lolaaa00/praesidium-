'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useOrgStore } from '@/stores/org-store';
import { validationKeys } from '@/hooks/queries/use-validations';
import { analyticsKeys } from '@/hooks/queries/use-analytics';
import { auditKeys } from '@/hooks/queries/use-audit';
import { agentKeys } from '@/hooks/queries/use-agents';

/**
 * useRealtimeValidations
 *
 * Subscribes to Supabase Realtime for the current org's validation_requests table.
 * On any INSERT/UPDATE, invalidates React Query caches so the UI refreshes
 * without polling. The subscription is scoped to the org via a Postgres filter.
 */
export function useRealtimeValidations() {
  const qc = useQueryClient();
  const { currentOrgId } = useOrgStore();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!currentOrgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`validations:${currentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'validation_requests',
          filter: `org_id=eq.${currentOrgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: validationKeys.lists() });
          qc.invalidateQueries({ queryKey: analyticsKeys.all });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentOrgId, qc]);
}

/**
 * useRealtimeAudit
 *
 * Subscribes to audit_logs INSERTs. Invalidates audit cache so the audit
 * trail page refreshes automatically.
 */
export function useRealtimeAudit() {
  const qc = useQueryClient();
  const { currentOrgId } = useOrgStore();

  useEffect(() => {
    if (!currentOrgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`audit:${currentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
          filter: `org_id=eq.${currentOrgId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: auditKeys.lists() });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentOrgId, qc]);
}

/**
 * useRealtimeAgents
 *
 * Subscribes to agent status changes (suspended/revoked) so the agents
 * list reflects live state without a page refresh.
 */
export function useRealtimeAgents() {
  const qc = useQueryClient();
  const { currentOrgId } = useOrgStore();

  useEffect(() => {
    if (!currentOrgId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`agents:${currentOrgId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agents',
          filter: `org_id=eq.${currentOrgId}`,
        },
        (payload) => {
          const agentId = (payload.new as Record<string, unknown>)?.id as string | undefined;
          if (agentId) {
            qc.invalidateQueries({ queryKey: agentKeys.detail(agentId) });
          }
          qc.invalidateQueries({ queryKey: agentKeys.lists() });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentOrgId, qc]);
}

/**
 * useDashboardRealtime
 *
 * Convenience hook: mounts all realtime subscriptions for the dashboard.
 * Drop this into the dashboard layout component.
 */
export function useDashboardRealtime() {
  useRealtimeValidations();
  useRealtimeAudit();
  useRealtimeAgents();
}

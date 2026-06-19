'use client';

import { useDashboardRealtime } from '@/hooks/use-realtime';

/**
 * RealtimeProvider
 *
 * Client component that mounts all Supabase Realtime subscriptions for the
 * dashboard. Renders no UI — purely a side-effect component.
 * Place inside the dashboard layout so it's active across all dashboard pages.
 */
export function RealtimeProvider() {
  useDashboardRealtime();
  return null;
}

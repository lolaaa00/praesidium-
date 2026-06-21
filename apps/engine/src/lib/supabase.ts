import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../config/env.js';

let _client: SupabaseClient | null = null;

/**
 * Engine-side Supabase client using service_role key.
 * Bypasses RLS — the engine is a trusted service.
 *
 * supabase-js eagerly constructs a RealtimeClient inside createClient(),
 * which throws ("Node.js 20 detected without native WebSocket support") on
 * Node < 22 unless a WebSocket implementation is supplied — even though the
 * engine never actually uses realtime subscriptions. The `ws` package fills
 * that gap.
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: WebSocket as any,
      },
    });
  }
  return _client;
}

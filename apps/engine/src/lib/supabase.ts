import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let _client: SupabaseClient | null = null;

/**
 * Engine-side Supabase client using service_role key.
 * Bypasses RLS — the engine is a trusted service.
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _client;
}

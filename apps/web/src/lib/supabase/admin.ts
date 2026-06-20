import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client using the service_role key.
 * BYPASSES ROW LEVEL SECURITY — use only in API routes, never on the client.
 * Use this for:
 * - Creating users during wallet auth
 * - Writing audit logs
 * - Cross-org operations
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        // Next.js patches the global fetch in route handlers to add its own
        // request-deduping/caching layer, which has been observed to make
        // supabase-js's admin auth calls (e.g. createUser) fail silently
        // with an empty AuthRetryableFetchError. Forcing cache: 'no-store'
        // opts this client's requests out of that layer.
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    },
  );
}

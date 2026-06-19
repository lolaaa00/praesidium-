import { useOrgStore } from '@/stores/org-store';

/**
 * Org-aware fetch wrapper.
 * Automatically adds x-org-id header from the org store.
 */
export async function orgFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const orgId = useOrgStore.getState().currentOrgId;

  if (!orgId) {
    throw new Error('No organization selected');
  }

  const headers = new Headers(options.headers);
  headers.set('x-org-id', orgId);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

/**
 * Typed JSON response helper.
 */
export async function parseResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

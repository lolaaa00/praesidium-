import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/api/auth-check';

// ──────────────────────────────────────────
// GET /api/contract/read — Read on-chain data via the engine
// Proxies read calls to the validation engine which holds the GenLayer key
// ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request.headers);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const method = url.searchParams.get('method');
  const args = url.searchParams.get('args');

  if (!method) {
    return NextResponse.json({ error: 'Missing method parameter' }, { status: 400 });
  }

  const validMethods = [
    'get_validation',
    'get_agent_reputation',
    'get_validation_count',
    'get_org_validation_count',
    'get_owner',
  ];

  if (!validMethods.includes(method)) {
    return NextResponse.json({ error: 'Invalid contract method' }, { status: 400 });
  }

  // For now, return a mock response until the engine contract-read endpoint is built
  // The engine will expose a /v1/contract/read endpoint in production
  return NextResponse.json({
    method,
    args: args ? JSON.parse(args) : [],
    result: null,
    note: 'Contract read proxy — connect to GenLayer StudioNet for live data',
  });
}

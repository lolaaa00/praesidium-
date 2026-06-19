import { NextResponse } from 'next/server';

// ──────────────────────────────────────────
// GET /api/contract/status — Check GenLayer contract health
// ──────────────────────────────────────────

export async function GET() {
  const engineUrl = process.env.ENGINE_URL || 'http://localhost:3001';

  try {
    const res = await fetch(`${engineUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { status: 'degraded', engine: 'unhealthy' },
        { status: 503 },
      );
    }

    const data = await res.json();

    return NextResponse.json({
      status: 'ok',
      engine: data,
      contractAddress: process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || null,
    });
  } catch {
    return NextResponse.json(
      { status: 'offline', engine: null, error: 'Engine unreachable' },
      { status: 503 },
    );
  }
}

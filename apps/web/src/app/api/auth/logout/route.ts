import { NextRequest, NextResponse } from 'next/server';

// Destroy session



export async function POST(request: NextRequest) {
  // TODO: Implement — Destroy session
  return NextResponse.json({ message: 'POST auth/logout — not yet implemented' }, { status: 501 });
}

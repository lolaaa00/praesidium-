import { NextRequest, NextResponse } from 'next/server';

// Get current session



export async function GET(request: NextRequest) {
  // TODO: Implement — Get current session
  return NextResponse.json({ message: 'GET auth/session — not yet implemented' }, { status: 501 });
}

import { NextRequest, NextResponse } from 'next/server';

// Generate a nonce for wallet sign-in



export async function GET(request: NextRequest) {
  // TODO: Implement — Generate a nonce for wallet sign-in
  return NextResponse.json({ message: 'GET auth/nonce — not yet implemented' }, { status: 501 });
}

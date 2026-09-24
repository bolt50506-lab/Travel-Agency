import { NextResponse } from 'next/server';
import { debugServerActor } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await debugServerActor();
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

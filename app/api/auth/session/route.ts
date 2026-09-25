import { NextResponse } from 'next/server';
import { getServerActor } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getServerActor();

  return NextResponse.json({
    authenticated: Boolean(actor),
    role: actor?.role ?? null,
    userId: actor?.id ?? null,
  });
}

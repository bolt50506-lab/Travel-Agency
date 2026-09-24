export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const cookieStore = cookies();
  cookieStore.set('voyago_access_token', '', {
    httpOnly: true,
    secure: new URL(req.url).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
    maxAge: 0,
  });
  return NextResponse.redirect(new URL('/', req.url), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  return GET(req);
}

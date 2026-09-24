export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

function logout(req: Request) {
  const url = new URL(req.url);
  const secure = url.protocol === 'https:';
  const response = NextResponse.redirect(new URL('/', req.url), {
    headers: { 'Cache-Control': 'no-store, private' },
  });

  const cookie = [
    'voyago_access_token=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (secure) cookie.push('Secure');
  response.headers.set('Set-Cookie', cookie.join('; '));
  return response;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}

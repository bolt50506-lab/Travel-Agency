export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

function logout(req: Request) {
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host')?.split(',')[0]?.trim();
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  const origin = configuredOrigin || (host ? `${forwardedProto === 'http' ? 'http' : 'https'}://${host}` : new URL(req.url).origin);
  const secure = origin.startsWith('https:');
  const response = NextResponse.redirect(`${origin}/`, {
    headers: { 'Cache-Control': 'no-store, private' },
  });

  const cookieAttributes = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', 'Expires=Thu, 01 Jan 1970 00:00:00 GMT'];
  if (secure) cookieAttributes.push('Secure');
  response.headers.append('Set-Cookie', ['voyagoAccessToken=', ...cookieAttributes].join('; '));
  response.headers.append('Set-Cookie', ['voyago_access_token=', ...cookieAttributes].join('; '));
  return response;
}

export async function GET(req: Request) {
  return logout(req);
}

export async function POST(req: Request) {
  return logout(req);
}

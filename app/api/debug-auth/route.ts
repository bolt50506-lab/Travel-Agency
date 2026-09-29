import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookieNames = cookieHeader
    .split(';')
    .map((part) => part.trim().split('=', 1)[0])
    .filter(Boolean);
  const tokenCount = cookieNames.filter((name) => name === 'voyagoAccessToken' || name === 'voyago_access_token').length;

  const secret = process.env.LOCAL_AUTH_SECRET || process.env.POSTGREST_JWT_SECRET || '';

  return NextResponse.json({
    host: req.headers.get('host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
    voyagoAccessTokenEntries: tokenCount,
    canonicalCookieEntries: cookieNames.filter((name) => name === 'voyagoAccessToken').length,
    legacyCookieEntries: cookieNames.filter((name) => name === 'voyago_access_token').length,
    secretFingerprint: secret
      ? crypto.createHash('sha256').update(secret).digest('hex').slice(0, 8)
      : null,
  }, {
    headers: { 'Cache-Control': 'no-store, private' },
  });
}

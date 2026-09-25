export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/auth/server';

function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, encodedHash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !encodedHash) return false;
  const hash = crypto.scryptSync(password, salt, 64, { N: Number(n), r: Number(r), p: Number(p) }).toString('base64url');
  const a = Buffer.from(hash);
  const b = Buffer.from(encodedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionCookie(token: string, secure: boolean) {
  const attributes = [
    `voyago_access_token=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

export async function POST(req: NextRequest) {
  try {
    const validation = validateBody(loginSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const email = validation.data.email.trim().toLowerCase();
    const { data: account, error: accountError } = await supabaseAdmin
      .from('local_users')
      .select('id,email,password_hash')
      .eq('email', email)
      .maybeSingle();

    if (accountError || !account || !verifyPassword(validation.data.password, account.password_hash)) {
      return errorResponse('Invalid email or password', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,phone,role,is_active,email_verified_at')
      .eq('id', account.id)
      .maybeSingle();

    if (profileError || !profile || profile.is_active === false) {
      return errorResponse('This account is inactive or its profile is unavailable. Please contact the agency.', 'AUTH_ACCOUNT_INACTIVE', 403);
    }

    if (!['customer', 'agent', 'admin'].includes(profile.role)) {
      return errorResponse('This account has an invalid access role. Please contact the agency.', 'AUTH_INVALID_ROLE', 403);
    }

    await supabaseAdmin.from('local_users').update({ last_login_at: new Date().toISOString() }).eq('id', account.id);

    const token = createSessionToken({ id: account.id, email: account.email, role: profile.role });
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const isSecureRequest = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';
    const redirectTo = profile.role === 'admin' ? '/admin' : profile.role === 'agent' ? '/agent' : '/';

    const response = successResponse({
      user: { id: account.id, email: account.email, profile },
      redirectTo,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Explicit Set-Cookie avoids framework helper differences and makes the
    // browser session deterministic on both localhost HTTP and HTTPS.
    response.headers.set('Set-Cookie', sessionCookie(token, isSecureRequest));
    response.headers.set('Cache-Control', 'no-store, private');
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Something went wrong during login', 'INTERNAL_ERROR', 500);
  }
}

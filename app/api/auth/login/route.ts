export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { loginSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/auth/server';

function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, encodedHash] = stored.split('$');
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !encodedHash) return false;
  const hash = crypto.scryptSync(password, salt, 64, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  }).toString('base64url');
  const a = Buffer.from(hash);
  const b = Buffer.from(encodedHash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const validation = validateBody(loginSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const email = validation.data.email.trim().toLowerCase();
    const { data: account, error } = await supabaseAdmin
      .from('local_users')
      .select('id,email,password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error || !account || !verifyPassword(validation.data.password, account.password_hash)) {
      return errorResponse('Invalid email or password', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,phone,role,is_active')
      .eq('id', account.id)
      .maybeSingle();

    if (!profile || profile.is_active === false) {
      return errorResponse('This account is inactive. Please contact the agency.', 'AUTH_ACCOUNT_INACTIVE', 403);
    }

    const requestedPortal = validation.data.portal;
    if (requestedPortal && profile.role !== requestedPortal) {
      return errorResponse('This account is not authorized for this portal.', 'AUTH_WRONG_PORTAL', 403);
    }

    await supabaseAdmin.from('local_users').update({ last_login_at: new Date().toISOString() }).eq('id', account.id);

    const token = createSessionToken({
      id: account.id,
      email: account.email,
      role: profile.role,
    });

    // Match the cookie's Secure flag to the actual request protocol.
    // This keeps local production testing on http://localhost working while
    // still using Secure cookies behind HTTPS/Cloudflare in real deployments.
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const isSecureRequest = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';

    cookies().set('voyago_access_token', token, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return successResponse({
      user: { id: account.id, email: account.email, profile },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Something went wrong during login', 'INTERNAL_ERROR', 500);
  }
}

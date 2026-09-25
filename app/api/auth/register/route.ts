export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { createSessionToken } from '@/lib/auth/server';
import { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384;
  const r = 8;
  const p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
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
    const validation = validateBody(registerSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const { email: rawEmail, password, firstName, lastName, phone } = validation.data;
    const email = rawEmail.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const { data: existing } = await supabaseAdmin.from('local_users').select('id').eq('email', email).maybeSingle();
    if (existing) return errorResponse('An account with this email already exists', 'AUTH_EMAIL_EXISTS', 409);

    const { data: account, error: accountError } = await supabaseAdmin
      .from('local_users')
      .insert({ email, password_hash: hashPassword(password) })
      .select('id,email')
      .single();
    if (accountError || !account) return errorResponse('Unable to create account', 'AUTH_CREATE_FAILED', 409);

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: account.id, email, full_name: fullName, phone: phone || null, role: 'customer',
      is_active: true, email_verified_at: new Date().toISOString(),
    });
    if (profileError) {
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw profileError;
    }

    const { error: customerError } = await supabaseAdmin.from('customers').insert({
      user_id: account.id, full_name: fullName, email, phone: phone || null, country: 'PK', nationality: 'Pakistani',
    });
    if (customerError) {
      await supabaseAdmin.from('profiles').delete().eq('id', account.id);
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw customerError;
    }

    const token = createSessionToken({ id: account.id, email, role: 'customer' });
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const isSecureRequest = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';
    const response = successResponse({
      user: { id: account.id, email, fullName },
      requiresEmailVerification: false,
      redirectTo: '/',
      message: 'Account created successfully. You are now signed in.',
    }, 201);
    response.headers.set('Set-Cookie', sessionCookie(token, isSecureRequest));
    response.headers.set('Cache-Control', 'no-store, private');
    return response;
  } catch (err) {
    console.error('Registration error:', err);
    return errorResponse('Unable to create account', 'INTERNAL_ERROR', 500);
  }
}

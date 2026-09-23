export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { registerSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { createSessionToken } from '@/lib/auth/server';

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384;
  const r = 8;
  const p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

export async function POST(req: NextRequest) {
  try {
    const validation = validateBody(registerSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const { email: rawEmail, password, firstName, lastName, phone } = validation.data;
    const email = rawEmail.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const { data: existing } = await supabaseAdmin
      .from('local_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) return errorResponse('An account with this email already exists', 'AUTH_EMAIL_EXISTS', 409);

    const { data: account, error: accountError } = await supabaseAdmin
      .from('local_users')
      .insert({ email, password_hash: hashPassword(password) })
      .select('*')
      .single();

    if (accountError || !account) {
      console.error(accountError);
      return errorResponse('Unable to create account', 'AUTH_CREATE_FAILED', 409);
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: account.id,
      email,
      full_name: fullName,
      phone: phone || null,
      role: 'customer',
      is_active: true,
    });

    if (profileError) {
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw profileError;
    }

    const { error: customerError } = await supabaseAdmin.from('customers').insert({
      user_id: account.id,
      full_name: fullName,
      email,
      phone: phone || null,
      country: 'PK',
      nationality: 'Pakistani',
    });

    if (customerError) {
      await supabaseAdmin.from('profiles').delete().eq('id', account.id);
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw customerError;
    }

    const token = createSessionToken({ id: account.id, email, role: 'customer' });
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    const isSecureRequest = forwardedProto === 'https' || req.nextUrl.protocol === 'https:';
    cookies().set('voyago_access_token', token, {
      httpOnly: true,
      secure: isSecureRequest,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return successResponse({ user: { id: account.id, email, fullName }, requiresLogin: false }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    return errorResponse('Unable to create account', 'INTERNAL_ERROR', 500);
  }
}

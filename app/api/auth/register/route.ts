import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { registerSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const validation = validateBody(registerSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const { email, password, firstName, lastName, phone } = validation.data;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, phone },
    });

    if (error || !data.user) {
      const message = /already|exists|duplicate/i.test(error?.message || '')
        ? 'An account with this email already exists'
        : (error?.message || 'Unable to create account');
      return errorResponse(message, /already|exists|duplicate/i.test(error?.message || '') ? 'AUTH_EMAIL_EXISTS' : 'AUTH_CREATE_FAILED', 409);
    }

    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      phone: phone || null,
      role: 'customer',
      is_active: true,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw profileError;
    }

    const { error: customerError } = await supabaseAdmin.from('customers').insert({
      user_id: data.user.id,
      full_name: fullName,
      email,
      phone: phone || null,
      country: 'PK',
      nationality: 'Pakistani',
    });

    if (customerError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      throw customerError;
    }

    const authClient = (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-placeholder-key',
      { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
    );
    const signedIn = await authClient.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) {
      return successResponse({ user: { id: data.user.id, email }, requiresLogin: true }, 201);
    }

    cookies().set('voyago_access_token', signedIn.data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(60, signedIn.data.session.expires_in || 3600),
    });

    return successResponse({ user: { id: data.user.id, email, fullName }, requiresLogin: false }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    return errorResponse('Unable to create account', 'INTERNAL_ERROR', 500);
  }
}

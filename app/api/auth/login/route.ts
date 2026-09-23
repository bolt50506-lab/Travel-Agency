import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { loginSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
);

export async function POST(req: NextRequest) {
  try {
    const validation = validateBody(loginSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error || !data.session || !data.user) {
      return errorResponse('Invalid email or password', 'AUTH_INVALID_CREDENTIALS', 401);
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id,email,full_name,phone,role,is_active')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profile && profile.is_active === false) {
      return errorResponse('This account is inactive. Please contact the agency.', 'AUTH_ACCOUNT_INACTIVE', 403);
    }

    cookies().set('voyago_access_token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: Math.max(60, data.session.expires_in || 3600),
    });

    return successResponse({
      user: { id: data.user.id, email: data.user.email, profile },
      expiresAt: new Date(Date.now() + (data.session.expires_in || 3600) * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('Something went wrong during login', 'INTERNAL_ERROR', 500);
  }
}

export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { registerSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCustomerVerificationEmail } from '@/lib/services/email-service';

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384;
  const r = 8;
  const p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

function hashVerificationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  let accountId: string | null = null;
  try {
    const validation = validateBody(registerSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const { email: rawEmail, password, firstName, lastName, phone } = validation.data;
    const email = rawEmail.trim().toLowerCase();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    const { data: existing } = await supabaseAdmin.from('local_users').select('id').eq('email', email).maybeSingle();
    if (existing) return errorResponse('An account with this email already exists', 'AUTH_EMAIL_EXISTS', 409);

    const { data: account, error: accountError } = await supabaseAdmin
      .from('local_users').insert({ email, password_hash: hashPassword(password) }).select('*').single();
    if (accountError || !account) return errorResponse('Unable to create account', 'AUTH_CREATE_FAILED', 409);
    accountId = account.id;

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: account.id, email, full_name: fullName, phone: phone || null, role: 'customer',
      is_active: true, email_verified_at: null,
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

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const { error: tokenError } = await supabaseAdmin.from('email_verification_tokens').insert({
      user_id: account.id, token_hash: hashVerificationToken(rawToken),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (tokenError) throw tokenError;

    let verificationEmailSent = false;
    try {
      await sendCustomerVerificationEmail({ email, fullName, token: rawToken });
      verificationEmailSent = true;
    } catch (emailError) {
      console.error('Verification email error:', emailError);

      // Do not destroy a successfully-created customer account just because
      // the local development environment has no email provider configured.
      // The account remains safely blocked from login until verification.
      if (emailError instanceof Error && emailError.message === 'EMAIL_NOT_CONFIGURED' && process.env.NODE_ENV !== 'production') {
        const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        return successResponse({
          user: { id: account.id, email, fullName },
          requiresEmailVerification: true,
          verificationUrl: `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`,
          emailDelivery: 'development_unconfigured',
          message: 'Account created. Email delivery is not configured locally. Use the verification link returned for local testing.',
        }, 201);
      }

      await supabaseAdmin.from('email_verification_tokens').delete().eq('user_id', account.id);
      await supabaseAdmin.from('customers').delete().eq('user_id', account.id);
      await supabaseAdmin.from('profiles').delete().eq('id', account.id);
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);

      if (emailError instanceof Error && emailError.message === 'EMAIL_NOT_CONFIGURED') {
        return errorResponse('Email verification is not configured yet. Please contact the agency administrator.', 'EMAIL_NOT_CONFIGURED', 503);
      }
      return errorResponse('We could not send the verification email. Please try again.', 'EMAIL_SEND_FAILED', 503);
    }

    return successResponse({
      user: { id: account.id, email, fullName },
      requiresEmailVerification: true,
      emailDelivery: verificationEmailSent ? 'sent' : 'unknown',
      message: 'Account created. Please check your email and verify your address before logging in.',
    }, 201);
  } catch (err) {
    if (accountId) await supabaseAdmin.from('email_verification_tokens').delete().eq('user_id', accountId);
    console.error('Registration error:', err);
    return errorResponse('Unable to create account', 'INTERNAL_ERROR', 500);
  }
}

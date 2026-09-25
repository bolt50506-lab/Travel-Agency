export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendCustomerVerificationEmail } from '@/lib/services/email-service';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return errorResponse('Email is required', 'VALIDATION_ERROR', 400);

    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('id,email,full_name,role,email_verified_at')
      .eq('email', email)
      .maybeSingle();

    if (!profile || profile.role !== 'customer') {
      return errorResponse('No customer account was found for this email.', 'ACCOUNT_NOT_FOUND', 404);
    }
    if (profile.email_verified_at) return successResponse({ message: 'Email is already verified.' });

    await supabaseAdmin.from('email_verification_tokens').delete().eq('user_id', profile.id);

    const rawToken = crypto.randomBytes(32).toString('base64url');
    const { error } = await supabaseAdmin.from('email_verification_tokens').insert({
      user_id: profile.id,
      token_hash: hashToken(rawToken),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    if (error) throw error;

    try {
      await sendCustomerVerificationEmail({ email: profile.email, fullName: profile.full_name || '', token: rawToken });
    } catch (emailError) {
      await supabaseAdmin.from('email_verification_tokens').delete().eq('user_id', profile.id);
      if (emailError instanceof Error && emailError.message === 'EMAIL_NOT_CONFIGURED') {
        return errorResponse('Email verification is not configured yet.', 'EMAIL_NOT_CONFIGURED', 503);
      }
      return errorResponse('We could not send the verification email. Please try again.', 'EMAIL_SEND_FAILED', 503);
    }

    return successResponse({ message: 'A new verification email has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse('Unable to resend verification email.', 'INTERNAL_ERROR', 500);
  }
}

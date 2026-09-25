export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  if (!token) return NextResponse.redirect(`${appUrl}/verify-email?status=invalid`);

  try {
    const { data: record, error } = await supabaseAdmin
      .from('email_verification_tokens')
      .select('id,user_id,expires_at,used_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle();

    if (error || !record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.redirect(`${appUrl}/verify-email?status=invalid`);
    }

    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('id,role')
      .eq('id', record.user_id)
      .maybeSingle();

    if (!profile || profile.role !== 'customer') {
      return NextResponse.redirect(`${appUrl}/verify-email?status=invalid`);
    }

    await supabaseAdmin.from('profiles').update({ email_verified_at: new Date().toISOString() }).eq('id', record.user_id);
    await supabaseAdmin.from('email_verification_tokens').update({ used_at: new Date().toISOString() }).eq('id', record.id);
    await supabaseAdmin.from('email_verification_tokens').delete().eq('user_id', record.user_id).is('used_at', null);

    return NextResponse.redirect(`${appUrl}/verify-email?status=success`);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${appUrl}/verify-email?status=invalid`);
  }
}

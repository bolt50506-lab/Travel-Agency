export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const status = new URL(req.url).searchParams.get('status');

    let query = supabaseAdmin
      .from('wallet_topups')
      .select('id,customer_id,amount,currency,method,payment_reference,customer_note,status,review_note,created_at,reviewed_at,customers(full_name,email)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return successResponse({ topups: data || [] });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required', 'FORBIDDEN', 403);
    }
    console.error('Admin wallet top-ups error:', err);
    return errorResponse('Unable to load wallet top-ups', 'INTERNAL_ERROR', 500);
  }
}

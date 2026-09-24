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
      .select('id,customer_id,amount,currency,method,payment_reference,customer_note,status,review_note,created_at,reviewed_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);

    const { data: topups, error } = await query;
    if (error) throw error;

    const customerIds = [...new Set((topups || []).map((topup: any) => topup.customer_id).filter(Boolean))];
    let customers: any[] = [];

    if (customerIds.length) {
      const result = await supabaseAdmin
        .from('customers')
        .select('id,full_name,email')
        .in('id', customerIds);
      if (result.error) throw result.error;
      customers = result.data || [];
    }

    const customersById = new Map(customers.map((customer) => [customer.id, customer]));
    const result = (topups || []).map((topup: any) => ({
      ...topup,
      customers: customersById.get(topup.customer_id) || null,
    }));

    return successResponse({ topups: result });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required', 'FORBIDDEN', 403);
    }
    console.error('Admin wallet top-ups error:', err);
    return errorResponse('Unable to load wallet top-ups', 'INTERNAL_ERROR', 500);
  }
}

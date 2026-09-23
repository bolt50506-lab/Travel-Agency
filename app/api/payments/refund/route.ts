import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

const schema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const validation = validateBody(schema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const input = validation.data;
    const { data: payment, error } = await supabaseAdmin.from('payments').select('*').eq('id', input.paymentId).single();
    if (error || !payment) return errorResponse('Payment not found', 'NOT_FOUND', 404);
    if (!['verified', 'partially_refunded'].includes(payment.status)) {
      return errorResponse('Only verified payments can be refunded', 'PAYMENT_NOT_REFUNDABLE', 409);
    }

    const { data: existingRefunds, error: refundsError } = await supabaseAdmin
      .from('refunds')
      .select('amount,status')
      .eq('payment_id', payment.id);
    if (refundsError) throw refundsError;

    const alreadyRefunded = (existingRefunds || [])
      .filter((refund: any) => ['processing', 'processed', 'completed'].includes(String(refund.status).toLowerCase()))
      .reduce((sum: number, refund: any) => sum + Number(refund.amount || 0), 0);

    const remaining = Math.max(0, Number(payment.amount) - alreadyRefunded);
    if (remaining <= 0) return errorResponse('Payment has already been fully refunded', 'REFUND_LIMIT_REACHED', 409);

    const amount = Math.min(Number(input.amount ?? remaining), remaining);
    if (amount <= 0) return errorResponse('Refund amount must be positive', 'REFUND_AMOUNT_INVALID', 400);

    const reference = `RF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const { data: refund, error: refundError } = await supabaseAdmin.from('refunds').insert({
      payment_id: payment.id,
      booking_id: payment.booking_id,
      customer_id: payment.customer_id,
      reference,
      amount,
      currency: payment.currency,
      status: 'processing',
      reason: input.reason,
      processed_by: actor.id,
    }).select('*').single();
    if (refundError) throw refundError;

    const fullyRefunded = alreadyRefunded + amount >= Number(payment.amount);
    await supabaseAdmin.from('payments').update({
      status: fullyRefunded ? 'refunded' : 'partially_refunded',
      updated_at: now,
    }).eq('id', payment.id);

    await supabaseAdmin.from('refund_transactions').insert({
      refund_id: refund.id,
      provider_name: 'manual',
      amount,
      currency: payment.currency,
      status: 'processing',
    });

    await supabaseAdmin.from('bookings').update({
      status: fullyRefunded ? 'REFUND_PROCESSING' : 'REFUND_PROCESSING',
      updated_at: now,
    }).eq('id', payment.booking_id);

    await supabaseAdmin.from('booking_status_history').insert({
      booking_id: payment.booking_id,
      status: 'REFUND_PROCESSING',
      description: `Refund processing initiated: ${input.reason}`,
      changed_by: actor.id,
      metadata: { refundId: refund.id, amount, remainingAfterRefund: Math.max(0, remaining - amount) },
    });

    return successResponse({ refund, remainingAfterRefund: Math.max(0, remaining - amount) });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required', 'FORBIDDEN', 403);
    }
    console.error('Refund creation error:', err);
    return errorResponse('Unable to create refund', 'REFUND_CREATE_FAILED', 500);
  }
}

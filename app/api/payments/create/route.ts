import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { paymentSchema } from '@/lib/validation/schemas';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';

function paymentReference() {
  return `PAY-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getServerActor();

    const validation = validateBody(paymentSchema, await req.json());
    if (!validation.success) return errorResponse(validation.error, 'VALIDATION_ERROR', 400);

    const input = validation.data;
    const amount = Number(input.amount.amount);
    const currency = String(input.amount.currency).toUpperCase();
    if (currency !== 'PKR' || !Number.isFinite(amount) || amount <= 0) {
      return errorResponse('Payment must be a positive PKR amount', 'PAYMENT_AMOUNT_INVALID', 400);
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id,reference,customer_id,agent_id,customer_price,currency,status')
      .eq('reference', input.bookingReference)
      .maybeSingle();

    if (bookingError || !booking) return errorResponse('Booking not found', 'BOOKING_NOT_FOUND', 404);
    if (String(booking.currency || 'PKR').toUpperCase() !== 'PKR') {
      return errorResponse('Booking currency is not supported', 'CURRENCY_NOT_SUPPORTED', 400);
    }
    if (Math.abs(Number(booking.customer_price) - amount) > 0.01) {
      return errorResponse('Payment amount does not match booking', 'PAYMENT_AMOUNT_MISMATCH', 409);
    }

    if (!actor) {
      // Guest checkout is allowed. Only bookings created as guest bookings
      // can be paid without an authenticated actor.
      if (booking.booked_by_user_id) return errorResponse('Login required for this booking', 'AUTH_REQUIRED', 401);
    } else if (actor.role === 'customer') {
      const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('user_id', actor.id).maybeSingle();
      if (!customer || customer.id !== booking.customer_id) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    } else if (actor.role === 'agent') {
      const agent = await requireAgentRecord(actor.id);
      if (booking.agent_id !== agent.id) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    } else if (actor.role !== 'admin') {
      return errorResponse('Forbidden', 'FORBIDDEN', 403);
    }

    const allowed = ['bank_transfer', 'raast', 'jazzcash', 'easypaisa', 'manual', 'card'];
    if (!allowed.includes(input.method)) return errorResponse('Unsupported payment method', 'PAYMENT_METHOD_INVALID', 400);

    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey) {
      const { data: existingTransaction } = await supabaseAdmin
        .from('payment_transactions')
        .select('payment_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (existingTransaction?.payment_id) {
        const { data: existingPayment } = await supabaseAdmin.from('payments').select('*').eq('id', existingTransaction.payment_id).maybeSingle();
        if (existingPayment) {
          return successResponse({
            paymentId: existingPayment.id,
            reference: existingPayment.reference,
            status: String(existingPayment.status).toUpperCase(),
            bookingReference: booking.reference,
            message: 'Existing payment submission returned for the supplied idempotency key.',
          });
        }
      }
    }

    const status = 'pending_verification';
    const { data: payment, error: paymentError } = await supabaseAdmin.from('payments').insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      reference: paymentReference(),
      method: input.method,
      amount,
      currency: 'PKR',
      status,
      provider_name: input.method === 'card' ? 'manual_card' : 'manual',
      provider_response: {
        mode: 'manual_verification',
        actorId: actor?.id || null,
        paymentReference: input.paymentReference || null,
      },
    }).select('*').single();
    if (paymentError) throw paymentError;

    const { error: transactionError } = await supabaseAdmin.from('payment_transactions').insert({
      payment_id: payment.id,
      idempotency_key: idempotencyKey || null,
      provider_name: 'manual',
      amount,
      currency: 'PKR',
      status: 'pending_verification',
      request_payload: { method: input.method, paymentReference: input.paymentReference || null },
    });
    if (transactionError) throw transactionError;

    const now = new Date().toISOString();
    await supabaseAdmin.from('bookings').update({ status: 'PAYMENT_PENDING', updated_at: now }).eq('id', booking.id);
    await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'PAYMENT_PENDING',
      description: 'Payment submitted and awaiting agency verification',
      changed_by: actor?.id || null,
      metadata: { paymentId: payment.id },
    });
    await supabaseAdmin.from('notifications').insert({
      customer_id: booking.customer_id,
      booking_id: booking.id,
      type: 'PAYMENT_PENDING',
      title: 'Payment submitted for verification',
      body: `Payment for ${booking.reference} has been submitted. The agency will verify it before supplier fulfillment.`,
    });

    return successResponse({
      paymentId: payment.id,
      reference: payment.reference,
      status: 'PENDING_VERIFICATION',
      bookingReference: booking.reference,
      message: 'Payment submitted. It must be verified by the agency before ticketing or voucher issuance.',
    }, 201);
  } catch (err) {
    console.error('Payment creation error:', err);
    return errorResponse('Unable to create payment', 'PAYMENT_CREATE_FAILED', 500);
  }
}

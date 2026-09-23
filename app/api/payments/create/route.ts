import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { paymentSchema } from '@/lib/validation/schemas';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';

function paymentReference(){return `PAY-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;}

export async function POST(req: NextRequest) {
  try {
    const validation=validateBody(paymentSchema,await req.json());
    if(!validation.success)return errorResponse(validation.error,'VALIDATION_ERROR',400);
    const actor=await getServerActor();
    const input=validation.data;
    const {data:booking,error:be}=await supabaseAdmin.from('bookings').select('id,reference,customer_id,customer_price,currency,status').eq('reference',input.bookingReference).maybeSingle();
    if(be||!booking)return errorResponse('Booking not found','BOOKING_NOT_FOUND',404);
    if(Math.abs(Number(booking.customer_price)-Number(input.amount.amount))>0.01)return errorResponse('Payment amount does not match booking','PAYMENT_AMOUNT_MISMATCH',409);
    const allowed=['bank_transfer','raast','jazzcash','easypaisa','manual','card'];
    if(!allowed.includes(input.method))return errorResponse('Unsupported payment method','PAYMENT_METHOD_INVALID',400);

    const status='pending_verification';
    const {data:payment,error}=await supabaseAdmin.from('payments').insert({
      booking_id:booking.id,customer_id:booking.customer_id,reference:paymentReference(),
      method:input.method,amount:Number(input.amount.amount),currency:input.amount.currency,
      status,provider_name:input.method==='card'?'manual_card':'manual',
      provider_response:{mode:'manual_verification',actorId:actor?.id||null},
    }).select('*').single();
    if(error)throw error;

    await supabaseAdmin.from('payment_transactions').insert({
      payment_id:payment.id,idempotency_key:req.headers.get('idempotency-key')||null,
      provider_name:'manual',amount:Number(input.amount.amount),currency:input.amount.currency,
      status:'pending_verification',request_payload:{method:input.method},
    });

    await supabaseAdmin.from('bookings').update({status:'PAYMENT_PENDING',updated_at:new Date().toISOString()}).eq('id',booking.id);
    await supabaseAdmin.from('booking_status_history').insert({
      booking_id:booking.id,status:'PAYMENT_PENDING',
      description:'Payment submitted and awaiting agency verification',changed_by:actor?.id||null
    });
    await supabaseAdmin.from('notifications').insert({
      customer_id:booking.customer_id,booking_id:booking.id,type:'PAYMENT_PENDING',
      title:'Payment submitted for verification',
      body:`Payment for ${booking.reference} has been submitted. The agency will verify it before supplier fulfillment.`
    });

    return successResponse({
      paymentId:payment.id,reference:payment.reference,status:'PENDING_VERIFICATION',
      bookingReference:booking.reference,
      message:'Payment submitted. It must be verified by the agency before ticketing or voucher issuance.'
    },201);
  } catch(err) {
    console.error('Payment creation error:',err);
    return errorResponse('Unable to create payment','PAYMENT_CREATE_FAILED',500);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

const schema=z.object({paymentId:z.string().uuid(),amount:z.number().positive().optional(),reason:z.string().min(1)});

export async function POST(req:NextRequest){
 try{
  const actor=await requireAdmin();const validation=validateBody(schema,await req.json());if(!validation.success)return errorResponse(validation.error,'VALIDATION_ERROR',400);
  const input=validation.data;
  const {data:payment,error}=await supabaseAdmin.from('payments').select('*').eq('id',input.paymentId).single();if(error||!payment)return errorResponse('Payment not found','NOT_FOUND',404);
  if(payment.status!=='verified'&&payment.status!=='partially_refunded')return errorResponse('Only verified payments can be refunded','PAYMENT_NOT_REFUNDABLE',409);
  const amount=Math.min(Number(input.amount||payment.amount),Number(payment.amount));
  const reference='RF-'+new Date().getFullYear()+'-'+Math.random().toString(36).slice(2,8).toUpperCase();
  const {data:refund,error:re}=await supabaseAdmin.from('refunds').insert({payment_id:payment.id,booking_id:payment.booking_id,customer_id:payment.customer_id,reference,amount,currency:payment.currency,status:'processing',reason:input.reason,processed_by:actor.id}).select('*').single();if(re)throw re;
  const fully=amount>=Number(payment.amount);
  await supabaseAdmin.from('payments').update({status:fully?'refunded':'partially_refunded',updated_at:new Date().toISOString()}).eq('id',payment.id);
  await supabaseAdmin.from('refund_transactions').insert({refund_id:refund.id,provider_name:'manual',amount,currency:payment.currency,status:'processing'});
  await supabaseAdmin.from('bookings').update({status:'REFUND_PROCESSING',updated_at:new Date().toISOString()}).eq('id',payment.booking_id);
  await supabaseAdmin.from('booking_status_history').insert({booking_id:payment.booking_id,status:'REFUND_PROCESSING',description:'Refund processing initiated: '+input.reason,changed_by:actor.id});
  return successResponse({refund});
 }catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_ADMIN')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to process refund','INTERNAL_ERROR',500);}
}

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function POST(req:NextRequest){
 try{
  const actor=await requireAdmin(); const body=await req.json();
  if(!body.paymentId)return errorResponse('Payment ID is required','VALIDATION_ERROR',400);
  const status=body.action==='reject'?'rejected':'verified';
  const {data:payment,error}=await supabaseAdmin.from('payments').select('*').eq('id',body.paymentId).maybeSingle();
  if(error||!payment)return errorResponse('Payment not found','NOT_FOUND',404);
  const now=new Date().toISOString();
  const {data:updated,error:ue}=await supabaseAdmin.from('payments').update({
    status,verified_by:actor.id,verified_at:now,rejection_reason:status==='rejected'?(body.reason||'Payment rejected'):null,internal_notes:body.internalNotes||null,updated_at:now
  }).eq('id',body.paymentId).select('*').single();
  if(ue)throw ue;
  const bookingStatus=status==='verified'?'PAYMENT_RECEIVED':'PAYMENT_PENDING';
  await supabaseAdmin.from('payment_transactions').update({status}).eq('payment_id',payment.id);
  await supabaseAdmin.from('bookings').update({status:bookingStatus,updated_at:now}).eq('id',payment.booking_id);
  await supabaseAdmin.from('booking_status_history').insert({booking_id:payment.booking_id,status:bookingStatus,description:status==='verified'?'Payment verified by agency':'Payment rejected by agency',changed_by:actor.id,metadata:{paymentId:payment.id}});
  const {data:booking}=await supabaseAdmin.from('bookings').select('customer_id,reference').eq('id',payment.booking_id).single();
  if(booking)await supabaseAdmin.from('notifications').insert({
    customer_id:booking.customer_id,booking_id:payment.booking_id,type:'PAYMENT_'+status.toUpperCase(),
    title:status==='verified'?'Payment verified':'Payment requires attention',
    body:status==='verified'?'Payment for '+booking.reference+' was verified. The agency can now process your booking.':(body.reason||'Please contact the agency regarding your payment.')
  });
  return successResponse({payment:updated,bookingStatus});
 }catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_ADMIN')return errorResponse('Admin access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to verify payment','INTERNAL_ERROR',500);}
}

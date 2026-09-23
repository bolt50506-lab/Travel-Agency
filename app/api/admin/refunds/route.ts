export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(_req:NextRequest){
 try{await requireAdmin();const {data,error}=await supabaseAdmin.from('refunds').select('*,bookings(reference,contact_email),payments(reference,method)').order('created_at',{ascending:false}).limit(200);if(error)throw error;return successResponse({refunds:data||[]});}
 catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_ADMIN')return errorResponse('Admin access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load refunds','INTERNAL_ERROR',500);}
}


export async function PATCH(req: NextRequest) {
 try {
  const actor = await requireAdmin();
  const body = await req.json();
  if (!body.refundId || !['complete','reject'].includes(body.action)) return errorResponse('Refund ID and action are required','VALIDATION_ERROR',400);
  const { data: refund, error } = await supabaseAdmin.from('refunds').select('*').eq('id',body.refundId).maybeSingle();
  if (error || !refund) return errorResponse('Refund not found','NOT_FOUND',404);
  if (refund.status !== 'processing') return errorResponse('Only processing refunds can be finalized','REFUND_NOT_PROCESSING',409);
  const now = new Date().toISOString();
  if (body.action === 'reject') {
    await supabaseAdmin.from('refunds').update({status:'rejected',processed_by:actor.id,processed_at:now,updated_at:now,provider_reference:body.providerReference||null}).eq('id',refund.id);
    await supabaseAdmin.from('refund_transactions').update({status:'rejected',response_payload:{reason:body.reason||'Refund rejected'}}).eq('refund_id',refund.id);
    await supabaseAdmin.from('payments').update({status:'verified',updated_at:now}).eq('id',refund.payment_id);
    await supabaseAdmin.from('bookings').update({status:'CANCELLED',updated_at:now}).eq('id',refund.booking_id);
    await supabaseAdmin.from('booking_status_history').insert({booking_id:refund.booking_id,status:'CANCELLED',description:'Refund rejected; booking remains cancelled',changed_by:actor.id,metadata:{refundId:refund.id}});
  } else {
    await supabaseAdmin.from('refunds').update({status:'completed',processed_by:actor.id,processed_at:now,updated_at:now,provider_reference:body.providerReference||null}).eq('id',refund.id);
    await supabaseAdmin.from('refund_transactions').update({status:'completed',response_payload:{providerReference:body.providerReference||null}}).eq('refund_id',refund.id);
    const { data: allRefunds } = await supabaseAdmin.from('refunds').select('amount,status').eq('payment_id',refund.payment_id);
    const refunded = (allRefunds||[]).filter((item:any)=>item.status==='completed').reduce((sum:number,item:any)=>sum+Number(item.amount||0),0);
    const { data: payment } = await supabaseAdmin.from('payments').select('amount').eq('id',refund.payment_id).maybeSingle();
    const fully = payment && refunded >= Number(payment.amount);
    await supabaseAdmin.from('payments').update({status:fully?'refunded':'partially_refunded',updated_at:now}).eq('id',refund.payment_id);
    const nextStatus = fully ? 'REFUNDED' : 'REFUND_PROCESSING';
    await supabaseAdmin.from('bookings').update({status:nextStatus,updated_at:now}).eq('id',refund.booking_id);
    await supabaseAdmin.from('booking_status_history').insert({booking_id:refund.booking_id,status:nextStatus,description:fully?'Refund completed':'Partial refund completed',changed_by:actor.id,metadata:{refundId:refund.id,providerReference:body.providerReference||null}});
  }
  const {data: updated}=await supabaseAdmin.from('refunds').select('*').eq('id',refund.id).single();
  return successResponse(updated);
 } catch(err) {
  if(err instanceof Error&&err.message==='UNAUTHORIZED_ADMIN') return errorResponse('Admin access required','FORBIDDEN',403);
  console.error('Admin refund update error:',err); return errorResponse('Unable to update refund','INTERNAL_ERROR',500);
 }
}

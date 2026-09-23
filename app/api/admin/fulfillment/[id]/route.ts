import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth/server';

const transitions: Record<string,{status:any,fulfillment?:any}> = {
  start_processing:{status:'AGENCY_PROCESSING',fulfillment:'in_progress'},
  supplier_booking_in_progress:{status:'SUPPLIER_BOOKING_IN_PROGRESS',fulfillment:'in_progress'},
  supplier_confirmed:{status:'SUPPLIER_CONFIRMED',fulfillment:'in_progress'},
  mark_ticketed:{status:'TICKETED',fulfillment:'completed'},
  mark_voucher_issued:{status:'VOUCHER_ISSUED',fulfillment:'completed'},
  request_customer_action:{status:'CUSTOMER_ACTION_REQUIRED',fulfillment:'in_progress'},
  cancel:{status:'CANCELLED',fulfillment:'cancelled'},
  refund:{status:'REFUND_PROCESSING',fulfillment:'in_progress'},
};

export async function GET(_req:NextRequest,{params}:{params:{id:string}}){
 try{await requireStaff();const {data,error}=await supabaseAdmin.from('bookings').select('*,customers(*),booking_items(*),booking_status_history(*),fulfillment_tasks(*),documents(*),payments(*)').eq('id',params.id).maybeSingle();if(error)throw error;if(!data)return errorResponse('Booking not found','NOT_FOUND',404);return successResponse(data);}
 catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_STAFF')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load booking','INTERNAL_ERROR',500);}
}

export async function POST(req:NextRequest,{params}:{params:{id:string}}){
 try{
  const actor=await requireStaff(); const body=await req.json(); const action=body.action as string; const transition=transitions[action];
  if(!transition)return errorResponse('Unknown action','VALIDATION_ERROR',400);
  const {data:booking,error:be}=await supabaseAdmin.from('bookings').select('*').eq('id',params.id).single(); if(be||!booking)return errorResponse('Booking not found','NOT_FOUND',404);
  const now=new Date().toISOString();
  const bookingPatch:any={updated_at:now,status:transition.status};
  if(body.supplierName!==undefined)bookingPatch.supplier_name=body.supplierName;
  if(body.supplierReference!==undefined)bookingPatch.supplier_reference=body.supplierReference;
  const {error:ue}=await supabaseAdmin.from('bookings').update(bookingPatch).eq('id',params.id); if(ue)throw ue;
  const {data:task}=await supabaseAdmin.from('fulfillment_tasks').select('*').eq('booking_id',params.id).single();
  if(task){
   const patch:any={updated_at:now};
   if(transition.fulfillment)patch.status=transition.fulfillment;
   if(action==='start_processing')patch.started_at=now;
   if(['mark_ticketed','mark_voucher_issued'].includes(action))patch.completed_at=now;
   for(const [k,v] of [['supplier_name',body.supplierName],['supplier_reference',body.supplierReference],['pnr',body.pnr],['ticket_number',body.ticketNumber],['hotel_confirmation_number',body.hotelConfirmationNumber]])if(v!==undefined)patch[k]=v;
   await supabaseAdmin.from('fulfillment_tasks').update(patch).eq('id',task.id);
  }
  await supabaseAdmin.from('booking_status_history').insert({booking_id:params.id,status:transition.status,description:body.message||action,changed_by:actor.id,metadata:body});
  if(action==='add_note'&&body.text){await supabaseAdmin.from('fulfillment_notes').insert({fulfillment_task_id:task?.id,author_id:actor.id,note:body.text});}
  const {data:updated}=await supabaseAdmin.from('bookings').select('*,fulfillment_tasks(*)').eq('id',params.id).single();
  return successResponse(updated);
 }catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_STAFF')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to update fulfillment','INTERNAL_ERROR',500);}
}

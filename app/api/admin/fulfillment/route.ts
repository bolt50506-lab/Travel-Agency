export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const statusFilter=new URL(req.url).searchParams.get('status');
    let q=supabaseAdmin.from('bookings').select('*,customers(full_name,email,phone),fulfillment_tasks(*)').order('created_at',{ascending:true});
    const {data,error}=await q; if(error) throw error;
    let rows=(data||[]).filter((b:any)=>b.fulfillment_tasks?.length);
    if(statusFilter&&statusFilter!=='all') rows=rows.filter((b:any)=>b.fulfillment_tasks?.[0]?.status===statusFilter.toLowerCase());
    const queue=rows.map((b:any)=>{const task=b.fulfillment_tasks[0];return {id:b.id,reference:b.reference,type:b.type,status:b.status,customerEmail:b.contact_email,customerPhone:b.contact_phone,totalAmount:{amount:Number(b.customer_price),currency:b.currency},supplierCost:{amount:Number(b.supplier_cost),currency:b.currency},margin:{amount:Number(b.agency_margin),currency:b.currency},fulfillmentStatus:String(task.status).toUpperCase(),assignedTo:task.assigned_to,supplierName:task.supplier_name,supplierReference:task.supplier_reference,pnr:task.pnr,ticketNumber:task.ticket_number,hotelConfirmationNumber:task.hotel_confirmation_number,createdAt:b.created_at,updatedAt:b.updated_at,summary:b.type==='flight'?'Flight booking':'Hotel booking'}});
    return successResponse({queue});
  }catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_STAFF')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load fulfillment queue','INTERNAL_ERROR',500);}
}

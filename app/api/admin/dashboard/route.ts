import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth/server';

export async function GET(_req: NextRequest) {
  try {
    await requireStaff();
    const { data: bookings, error } = await supabaseAdmin.from('bookings').select('id,type,status,customer_price,agency_margin,currency,created_at').order('created_at',{ascending:false});
    if (error) throw error;
    const rows = bookings || [];
    const today = new Date().toISOString().slice(0,10);
    const active = rows.filter(b => !['CANCELLED','REFUNDED','FAILED'].includes(b.status));
    const cards = {
      totalBookings: rows.length,
      todayBookings: rows.filter(b => b.created_at?.slice(0,10) === today).length,
      flightBookings: rows.filter(b => b.type === 'flight').length,
      hotelBookings: rows.filter(b => b.type === 'hotel').length,
      revenue: active.reduce((s,b)=>s+Number(b.customer_price||0),0),
      grossMargin: active.reduce((s,b)=>s+Number(b.agency_margin||0),0),
      pendingPayments: rows.filter(b=>['BOOKING_REQUESTED','PAYMENT_PENDING'].includes(b.status)).length,
      fulfillmentPending: rows.filter(b=>['BOOKING_REQUESTED','PAYMENT_RECEIVED','AGENCY_PROCESSING','SUPPLIER_BOOKING_IN_PROGRESS','DOCUMENT_PENDING','TICKET_PENDING','VOUCHER_PENDING'].includes(b.status)).length,
      refundRequests: rows.filter(b=>['REFUND_REQUESTED','REFUND_PROCESSING'].includes(b.status)).length,
    };
    const days = Array.from({length:7},(_,i)=>{const d=new Date(); d.setDate(d.getDate()-(6-i)); const key=d.toISOString().slice(0,10); return {date:key.slice(5), bookings:rows.filter(b=>b.created_at?.slice(0,10)===key).length, revenue:rows.filter(b=>b.created_at?.slice(0,10)===key).reduce((s,b)=>s+Number(b.customer_price||0),0)};});
    return successResponse({cards,charts:{bookingsOverTime:days.map(d=>({date:d.date,bookings:d.bookings})),revenueOverTime:days.map(d=>({date:d.date,revenue:d.revenue})),flightVsHotel:[{name:'Flights',value:cards.flightBookings},{name:'Hotels',value:cards.hotelBookings}]},recent:rows.slice(0,10)});
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_STAFF') return errorResponse('Staff access required','FORBIDDEN',403);
    console.error(err); return errorResponse('Unable to load dashboard','INTERNAL_ERROR',500);
  }
}

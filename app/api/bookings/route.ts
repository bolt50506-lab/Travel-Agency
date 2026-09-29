export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';
import { calculateAgencyPrice, openPricingSnapshot } from '@/lib/services/pricing-service';

function makeReference() {
  return `AG-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function findCustomer(actorId: string, email: string, phone: string, name: string, agentMode: boolean) {
  if (!agentMode) {
    const { data } = await supabaseAdmin.from('customers').select('*').eq('user_id', actorId).maybeSingle();
    if (data) return data;
  } else {
    const { data } = await supabaseAdmin.from('customers').select('*').eq('created_by', actorId).eq('email', email).maybeSingle();
    if (data) return data;
  }

  if (!agentMode) {
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabaseAdmin.from('customers').insert({
    user_id: agentMode ? null : actorId,
    full_name: name || email.split('@')[0],
    email,
    phone,
    country: 'PK',
    nationality: 'Pakistani',
    ...(agentMode ? { created_by: actorId } : {}),
  }).select('*').single();

  if (error) throw error;
  return data;
}

function customerVisibleDetails(details: any, type: 'flight' | 'hotel') {
  if (!details || typeof details !== 'object') return {};
  if (type === 'flight') {
    return {
      id: details.id,
      airline: details.airline,
      airlineCode: details.airlineCode,
      segments: details.segments,
      // Older booking rows may not have passenger data. Always return a
      // stable array so customer/admin UIs can safely render the booking.
      passengers: Array.isArray(details.passengers) ? details.passengers : [],
      cabinClass: details.cabinClass,
      tripType: details.tripType,
      origin: details.origin,
      destination: details.destination,
      departureDate: details.departureDate,
      returnDate: details.returnDate,
      totalPrice: details.totalPrice,
    };
  }
  return {
    id: details.id,
    name: details.name,
    address: details.address,
    city: details.city,
    country: details.country,
    starRating: details.starRating,
    room: details.room,
    checkIn: details.checkIn,
    checkOut: details.checkOut,
    guests: details.guests,
    totalPrice: details.totalPrice,
  };
}

function mapBooking(row: any) {
  const item = Array.isArray(row.booking_items) ? row.booking_items[0] : null;
  const task = Array.isArray(row.fulfillment_tasks) ? row.fulfillment_tasks[0] : row.fulfillment_tasks;
  const metadata = item?.metadata || {};

  return {
    id: row.id,
    reference: row.reference,
    bookedByUserId: row.booked_by_user_id || null,
    bookedByRole: row.booked_by_role || null,
    type: row.type,
    status: row.status,
    totalAmount: { amount: Number(row.customer_price || 0), currency: row.currency || 'PKR' },
    supplierCost: { amount: Number(row.supplier_cost || 0), currency: row.currency || 'PKR' },
    margin: { amount: Number(row.agency_margin || 0), currency: row.currency || 'PKR' },
    userId: row.customer_id || '',
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flightDetails: row.type === 'flight' ? customerVisibleDetails(metadata, 'flight') : undefined,
    hotelDetails: row.type === 'hotel' ? customerVisibleDetails(metadata, 'hotel') : undefined,
    fulfillment: task ? {
      id: task.id,
      bookingId: row.id,
      status: String(task.status || 'pending').toUpperCase(),
      supplierName: task.supplier_name || undefined,
      supplierReference: task.supplier_reference || undefined,
      pnr: task.pnr || undefined,
      ticketNumber: task.ticket_number || undefined,
      hotelConfirmationNumber: task.hotel_confirmation_number || undefined,
      notes: [],
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      startedAt: task.started_at || undefined,
      completedAt: task.completed_at || undefined,
    } : undefined,
    documents: [],
    timeline: (row.booking_status_history || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((event: any) => ({
        id: event.id,
        status: event.status,
        description: event.description || '',
        timestamp: event.created_at,
        metadata: event.metadata || undefined,
      })),
  };
}

export async function GET(_req: NextRequest) {
  try {
    const actor = await getServerActor(_req.headers.get('cookie'));
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);

    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (actor.role === 'customer') {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('user_id', actor.id)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) return successResponse({ bookings: [], total: 0 });
      query = query.eq('customer_id', customer.id);
    } else if (actor.role === 'agent') {
      const agent = await requireAgentRecord(actor.id);
      query = query.eq('agent_id', agent.id);
    } else if (actor.role !== 'admin') {
      return errorResponse('Forbidden', 'FORBIDDEN', 403);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const bookings = rows || [];
    if (!bookings.length) return successResponse({ bookings: [], total: 0 });

    const bookingIds = bookings.map((row: any) => row.id);

    // Load related records separately instead of relying on PostgREST
    // relationship embedding. This keeps the endpoint compatible with the
    // self-hosted PostgREST schema as migrations evolve.
    const [itemsResult, historyResult, fulfillmentResult] = await Promise.all([
      supabaseAdmin.from('booking_items').select('*').in('booking_id', bookingIds),
      supabaseAdmin.from('booking_status_history').select('*').in('booking_id', bookingIds),
      supabaseAdmin.from('fulfillment_tasks').select('*').in('booking_id', bookingIds),
    ]);

    if (itemsResult.error) console.error('Booking items load warning:', itemsResult.error);
    if (historyResult.error) console.error('Booking history load warning:', historyResult.error);
    if (fulfillmentResult.error) console.error('Fulfillment load warning:', fulfillmentResult.error);
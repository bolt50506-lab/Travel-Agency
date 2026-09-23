export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';

function makeReference() {
  return `AG-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function findCustomer(actorId: string | null, email: string, phone: string, name: string, agentMode = false) {
  if (actorId && !agentMode) {
    const { data } = await supabaseAdmin.from('customers').select('*').eq('user_id', actorId).maybeSingle();
    if (data) return data;
  }

  if (actorId && agentMode) {
    const { data } = await supabaseAdmin.from('customers').select('*').eq('created_by', actorId).eq('email', email).maybeSingle();
    if (data) return data;
  }

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabaseAdmin.from('customers').insert({
    user_id: actorId,
    full_name: name || email.split('@')[0],
    email,
    phone,
    country: 'PK',
    nationality: 'Pakistani',
    ...(agentMode && actorId ? { created_by: actorId } : {}),
  }).select('*').single();

  if (error) throw error;
  return data;
}

function mapBooking(row: any) {
  const item = Array.isArray(row.booking_items) ? row.booking_items[0] : null;
  const task = Array.isArray(row.fulfillment_tasks) ? row.fulfillment_tasks[0] : row.fulfillment_tasks;
  const metadata = item?.metadata || {};

  return {
    id: row.id,
    reference: row.reference,
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
    flightDetails: row.type === 'flight' ? metadata : undefined,
    hotelDetails: row.type === 'hotel' ? metadata : undefined,
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
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);

    let query = supabaseAdmin
      .from('bookings')
      .select('*,booking_items(*),booking_status_history(*),fulfillment_tasks(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (actor.role === 'customer') {
      const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('user_id', actor.id).maybeSingle();
      if (!customer) return successResponse({ bookings: [], total: 0 });
      query = query.eq('customer_id', customer.id);
    } else if (actor.role === 'agent') {
      const agent = await requireAgentRecord(actor.id);
      query = query.eq('agent_id', agent.id);
    } else if (actor.role !== 'admin') {
      return errorResponse('Forbidden', 'FORBIDDEN', 403);
    }

    const { data, error } = await query;
    if (error) throw error;

    const bookings = (data || []).map(mapBooking);
    return successResponse({ bookings, total: bookings.length });
  } catch (err) {
    console.error('Get bookings error:', err);
    return errorResponse('Unable to load bookings', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!['flight', 'hotel'].includes(body.type)) return errorResponse('Booking type is required', 'VALIDATION_ERROR', 400);
    if (!body.contactEmail || !body.contactPhone || !body.totalAmount?.amount) {
      return errorResponse('Contact details and total amount are required', 'VALIDATION_ERROR', 400);
    }

    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);
    const details = body.flightDetails || body.hotelDetails || {};
    const passengerOrGuest = details.passengers?.[0] || details.guests?.[0];
    const customerName = passengerOrGuest
      ? [passengerOrGuest.firstName, passengerOrGuest.lastName].filter(Boolean).join(' ')
      : body.contactEmail.split('@')[0];

    const agent = actor.role === 'agent' ? await requireAgentRecord(actor.id) : null;
    const customer = await findCustomer(actor.id, body.contactEmail, body.contactPhone, customerName, !!agent);
    const amount = Number(body.totalAmount.amount);
    const currency = body.totalAmount.currency || 'PKR';
    const reference = makeReference();
    const supplierCost = Number(body.supplierCost || amount);
    const markup = Math.max(0, amount - supplierCost);

    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      reference,
      type: body.type,
      status: 'BOOKING_REQUESTED',
      customer_id: customer.id,
      ...(agent ? { agent_id: agent.id } : {}),
      contact_email: body.contactEmail,
      contact_phone: body.contactPhone,
      supplier_cost: supplierCost,
      agency_markup: markup,
      taxes: Number(body.taxes || 0),
      fees: Number(body.fees || 0),
      discount: Number(body.discount || 0),
      customer_price: amount,
      agency_margin: markup,
      currency,
      supplier_name: null,
      automatic_supplier_booking_enabled: false,
      notes: body.notes || null,
    }).select('*').single();

    if (error || !booking) throw error || new Error('Booking could not be created');

    const itemError = (await supabaseAdmin.from('booking_items').insert({
      booking_id: booking.id,
      item_type: body.type,
      description: body.type === 'flight'
        ? `${details.segments?.[0]?.origin?.code || ''} → ${details.segments?.[0]?.destination?.code || ''}`
        : `${details.name || 'Hotel'} — ${details.room?.type || 'Room'}`,
      supplier_offer_id: details.id || null,
      supplier_property_id: body.type === 'hotel' ? details.id || null : null,
      supplier_cost: supplierCost,
      customer_price: amount,
      currency,
      metadata: details,
    })).error;
    if (itemError) console.error('Booking item warning:', itemError);

    const historyError = (await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'BOOKING_REQUESTED',
      description: 'Booking request received by agency',
      changed_by: actor?.id || null,
      metadata: { source: 'customer_checkout' },
    })).error;
    if (historyError) console.error('Booking history warning:', historyError);

    const taskError = (await supabaseAdmin.from('fulfillment_tasks').insert({
      booking_id: booking.id,
      status: 'pending',
    })).error;
    if (taskError) console.error('Fulfillment task warning:', taskError);

    const notificationError = (await supabaseAdmin.from('notifications').insert({
      customer_id: customer.id,
      booking_id: booking.id,
      type: 'BOOKING_RECEIVED',
      title: 'Booking request received',
      body: `Your agency booking request ${reference} has been received. Payment and supplier confirmation are tracked separately.`,
      metadata: { reference },
    })).error;
    if (notificationError) console.error('Notification warning:', notificationError);

    return successResponse({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentStatus: 'pending',
      message: 'Booking request received. The agency will complete supplier fulfillment after payment verification.',
    }, 201);
  } catch (err) {
    console.error('Create booking error:', err);
    return errorResponse('Unable to create booking', 'BOOKING_CREATE_FAILED', 500);
  }
}

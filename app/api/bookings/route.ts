import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';

function makeReference() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AG-${year}-${suffix}`;
}

async function findCustomer(actorId: string | null, email: string, phone: string, name: string) {
  if (actorId) {
    const { data } = await supabaseAdmin.from('customers').select('*').eq('user_id', actorId).maybeSingle();
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
  }).select('*').single();

  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);

    let query = supabaseAdmin.from('bookings').select('*').order('created_at', { ascending: false });
    if (actor.role === 'customer') {
      const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('user_id', actor.id).maybeSingle();
      if (!customer) return successResponse({ bookings: [] });
      query = query.eq('customer_id', customer.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return successResponse({ bookings: data || [], total: data?.length || 0 });
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
    const details = body.flightDetails || body.hotelDetails || {};
    const passengerOrGuest = details.passengers?.[0] || details.guests?.[0];
    const customerName = passengerOrGuest
      ? [passengerOrGuest.firstName, passengerOrGuest.lastName].filter(Boolean).join(' ')
      : body.contactEmail.split('@')[0];

    const customer = await findCustomer(actor?.id || null, body.contactEmail, body.contactPhone, customerName);
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

    const { error: itemError } = await supabaseAdmin.from('booking_items').insert({
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
    });
    if (itemError) throw itemError;

    const { error: historyError } = await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'BOOKING_REQUESTED',
      description: 'Booking request received by agency',
      changed_by: actor?.id || null,
      metadata: { source: 'customer_checkout' },
    });
    if (historyError) throw historyError;

    const { error: taskError } = await supabaseAdmin.from('fulfillment_tasks').insert({
      booking_id: booking.id,
      status: 'pending',
    });
    if (taskError) throw taskError;

    await supabaseAdmin.from('notifications').insert({
      customer_id: customer.id,
      booking_id: booking.id,
      type: 'BOOKING_RECEIVED',
      title: 'Booking request received',
      body: `Your agency booking request ${reference} has been received. Payment and supplier confirmation are tracked separately.`,
      metadata: { reference },
    });

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

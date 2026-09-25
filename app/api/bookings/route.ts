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
    const actor = await getServerActor();
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

    const itemsByBooking = new Map<string, any[]>();
    for (const item of itemsResult.data || []) {
      const list = itemsByBooking.get(item.booking_id) || [];
      list.push(item);
      itemsByBooking.set(item.booking_id, list);
    }

    const historyByBooking = new Map<string, any[]>();
    for (const event of historyResult.data || []) {
      const list = historyByBooking.get(event.booking_id) || [];
      list.push(event);
      historyByBooking.set(event.booking_id, list);
    }

    const fulfillmentByBooking = new Map<string, any[]>();
    for (const task of fulfillmentResult.data || []) {
      const list = fulfillmentByBooking.get(task.booking_id) || [];
      list.push(task);
      fulfillmentByBooking.set(task.booking_id, list);
    }

    const result = bookings.map((row: any) => mapBooking({
      ...row,
      booking_items: itemsByBooking.get(row.id) || [],
      booking_status_history: historyByBooking.get(row.id) || [],
      fulfillment_tasks: fulfillmentByBooking.get(row.id) || [],
    }));

    return successResponse({ bookings: result, total: result.length });
  } catch (err: any) {
    console.error('Get bookings error:', err);
    return errorResponse(
      err?.message || 'Unable to load bookings',
      'BOOKINGS_LOAD_FAILED',
      500,
      {
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      }
    );
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!['flight', 'hotel'].includes(body.type)) return errorResponse('Booking type is required', 'VALIDATION_ERROR', 400);
    if (!body.contactEmail || !body.contactPhone) return errorResponse('Contact details are required', 'VALIDATION_ERROR', 400);

    const actor = await getServerActor();
    if (!actor || !['customer', 'agent', 'admin'].includes(actor.role)) {
      return errorResponse(
        'Login required to complete a booking. Flights and hotels can be viewed without an account.',
        'AUTH_REQUIRED',
        401
      );
    }

    const details = body.flightDetails || body.hotelDetails || {};
    const passengerOrGuest = details.passengers?.[0] || details.guests?.[0];
    const customerName = passengerOrGuest
      ? [passengerOrGuest.firstName, passengerOrGuest.lastName].filter(Boolean).join(' ')
      : body.contactEmail.split('@')[0];

    const agent = actor?.role === 'agent' ? await requireAgentRecord(actor.id) : null;
    let customer;
    if (agent && body.customerId) {
      const { data: selectedCustomer } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('id', String(body.customerId))
        .eq('created_by', actor.id)
        .maybeSingle();
      if (!selectedCustomer) return errorResponse('Customer is not assigned to this agent', 'FORBIDDEN', 403);
      customer = selectedCustomer;
    } else {
      if (actor) {
        customer = await findCustomer(actor.id, body.contactEmail, body.contactPhone, customerName, !!agent);
      } else {
        const { data: existingGuest } = await supabaseAdmin
          .from('customers')
          .select('*')
          .is('user_id', null)
          .eq('email', body.contactEmail)
          .eq('phone', body.contactPhone)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        customer = existingGuest;

        if (!customer) {
          const { data: guestCustomer, error: guestError } = await supabaseAdmin
            .from('customers')
            .insert({
              user_id: null,
              full_name: customerName || body.contactEmail.split('@')[0],
              email: body.contactEmail,
              phone: body.contactPhone,
              country: 'PK',
              nationality: 'Pakistani',
            })
            .select('*')
            .single();
          if (guestError) throw guestError;
          customer = guestCustomer;
        }
      }
    }

    const agentContactEmail = body.contactEmail || customer.email || 'no-email@customer.local';
    const agentContactPhone = body.contactPhone || customer.phone || 'N/A';
    if (!agentContactEmail || !agentContactPhone) return errorResponse('Customer contact details are required', 'VALIDATION_ERROR', 400);

    const pricingSnapshot = details.pricingToken ? openPricingSnapshot(String(details.pricingToken)) : null;
    if (details.pricingToken && !pricingSnapshot) return errorResponse('The selected offer has expired. Please search again.', 'PRICING_EXPIRED', 409);
    const inferredSupplierCost = pricingSnapshot
      ? Number(pricingSnapshot.supplierCost)
      : body.type === 'flight'
        ? Number(details.basePrice?.amount || 0)
        : Math.max(0, Number(details.room?.totalPrice?.amount || 0) - Number(details.room?.taxesAndFees?.amount || 0));
    const supplierCost = Number(body.supplierCost ?? details.supplierCost ?? inferredSupplierCost);
    const requestedPrice = Number(body.totalAmount?.amount ?? 0);
    const currency = String(body.totalAmount?.currency || 'PKR').toUpperCase();
    if (currency !== 'PKR') return errorResponse('Only PKR bookings are supported', 'CURRENCY_NOT_SUPPORTED', 400);
    if (!Number.isFinite(supplierCost) || supplierCost < 0) return errorResponse('Invalid supplier cost', 'VALIDATION_ERROR', 400);
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) return errorResponse('A positive booking amount is required', 'VALIDATION_ERROR', 400);
    if (supplierCost > requestedPrice) return errorResponse('Selling price cannot be below supplier cost', 'PRICE_BELOW_COST', 409);

    const inferredTaxes = pricingSnapshot
      ? Number(pricingSnapshot.taxes)
      : body.type === 'flight'
        ? Number(details.taxesAndFees?.amount || 0)
        : Number(details.room?.taxesAndFees?.amount || 0);
    const taxes = Number(body.taxes ?? inferredTaxes ?? 0);
    const fees = Number(body.fees || 0);
    const discount = Number(body.discount || 0);
    if (![taxes, fees, discount].every(Number.isFinite) || taxes < 0 || fees < 0 || discount < 0) {
      return errorResponse('Invalid taxes, fees or discount', 'VALIDATION_ERROR', 400);
    }

    const pricing = await calculateAgencyPrice({
      supplierCost,
      taxes,
      fees,
      discount,
      requestedCustomerPrice: requestedPrice,
      context: {
        product: body.type,
        supplier: body.supplierName || details.supplier,
        airline: details.airline?.code || details.airlineCode,
        route: details.segments?.[0]?.origin?.code && details.segments?.[0]?.destination?.code
          ? `${details.segments[0].origin.code}-${details.segments[0].destination.code}`
          : undefined,
        hotelCategory: details.starRating ? `${details.starRating}_star` : undefined,
        agentId: agent?.id,
      },
    });

    const reference = makeReference();
    const { data: booking, error } = await supabaseAdmin.from('bookings').insert({
      reference,
      type: body.type,
      status: 'BOOKING_REQUESTED',
      customer_id: customer.id,
      booked_by_user_id: actor?.id || null,
      booked_by_role: actor?.role || 'guest',
      ...(agent ? { agent_id: agent.id, agency_id: agent.agency_id || null } : {}),
      contact_email: agentContactEmail,
      contact_phone: agentContactPhone,
      supplier_cost: pricing.supplierCost,
      agency_markup: pricing.markup,
      taxes: pricing.taxes,
      fees: pricing.fees,
      discount: pricing.discount,
      customer_price: pricing.customerPrice,
      agency_margin: pricing.agencyMargin,
      currency: 'PKR',
      supplier_name: body.supplierName || details.supplier || null,
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
      supplier_provider: String(body.supplierName || details.provider || ''),
      supplier_api: String(body.supplierApi || details.provider || details.apiSource || 'manual_supplier'),
      supplier_cost: pricing.supplierCost,
      customer_price: pricing.customerPrice,
      currency: 'PKR',
      metadata: details,
    })).error;
    if (itemError) console.error('Booking item warning:', itemError);

    const historyError = (await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'BOOKING_REQUESTED',
      description: 'Booking request received by agency',
      changed_by: actor?.id || null,
      metadata: { source: agent ? 'agent_portal' : actor?.role === 'admin' ? 'admin_portal' : actor?.role === 'customer' ? 'customer_checkout' : 'guest_checkout', bookedByUserId: actor?.id || null, bookedByRole: actor?.role || 'guest', pricingRuleIds: pricing.appliedRuleIds },
    })).error;
    if (historyError) console.error('Booking history warning:', historyError);

    const taskError = (await supabaseAdmin.from('fulfillment_tasks').insert({
      booking_id: booking.id,
      status: 'pending',
    })).error;
    if (taskError) console.error('Fulfillment task warning:', taskError);

    if (agent) {
      const commissionRate = Number(agent.commission_rate || 0);
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) {
        return errorResponse('Agent commission percentage must be between 0% and 100%', 'INVALID_COMMISSION_RATE', 409);
      }

      const commissionAmount = Math.round((pricing.agencyMargin * commissionRate) * 100) / 100;
      const { error: commissionError } = await supabaseAdmin.from('agent_commissions').insert({
        booking_id: booking.id,
        agent_id: agent.id,
        basis_amount: pricing.agencyMargin,
        commission_type: 'percentage_of_margin',
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        currency: 'PKR',
        status: 'PENDING',
      });

      if (commissionError) console.error('Commission warning:', commissionError);
    }

    await supabaseAdmin.from('supplier_payables').insert({
      booking_id: booking.id,
      supplier_name: body.supplierName || details.supplier || 'Unassigned supplier',
      payable_amount: pricing.supplierCost,
      paid_amount: 0,
      currency: 'PKR',
      status: 'OPEN',
    });

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
      pricing: {
        supplierCost: pricing.supplierCost,
        markup: pricing.markup,
        taxes: pricing.taxes,
        fees: pricing.fees,
        discount: pricing.discount,
        customerPrice: pricing.customerPrice,
        agencyMargin: pricing.agencyMargin,
      },
      message: 'Booking request received. The agency will complete supplier fulfillment after payment verification.',
    }, 201);
  } catch (err) {
    console.error('Create booking error:', err);
    return errorResponse('Unable to create booking', 'BOOKING_CREATE_FAILED', 500);
  }
}

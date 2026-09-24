export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';
import { calculateAgencyPrice } from '@/lib/services/pricing-service';

function makeReference() {
  return `AG-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  phone: string;
  actorId: string;
}) {
  const email = input.email.trim().toLowerCase();

  const byEmail = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (byEmail.error) throw byEmail.error;
  if (byEmail.data) return byEmail.data;

  const created = await supabaseAdmin
    .from('customers')
    .insert({
      full_name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      country: 'PK',
      nationality: 'Pakistani',
      created_by: input.actorId,
    })
    .select('*')
    .single();

  if (created.error || !created.data) throw created.error || new Error('Customer could not be created');
  return created.data;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    // Do not rely on PostgREST relationship embedding here. The portal uses
    // self-hosted PostgREST and the customers/fulfillment relationships can
    // vary as migrations evolve. Load the base bookings first, then related
    // records separately and merge them in memory.
    let query = supabaseAdmin
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') query = query.eq('status', status);
    if (type && type !== 'all') query = query.eq('type', type);

    const { data: bookings, error: bookingsError } = await query;
    if (bookingsError) throw bookingsError;

    let rows = bookings || [];
    if (!rows.length) return successResponse({ bookings: [], total: 0 });

    const bookingIds = rows.map((booking: any) => booking.id);
    const customerIds = Array.from(
      new Set(rows.map((booking: any) => booking.customer_id).filter(Boolean))
    );

    const [customersResult, fulfillmentResult] = await Promise.all([
      customerIds.length
        ? supabaseAdmin.from('customers').select('id,full_name,email,phone').in('id', customerIds)
        : Promise.resolve({ data: [], error: null } as any),
      supabaseAdmin.from('fulfillment_tasks').select('*').in('booking_id', bookingIds),
    ]);

    if (customersResult.error) console.error('Admin booking customers warning:', customersResult.error);
    if (fulfillmentResult.error) console.error('Admin booking fulfillment warning:', fulfillmentResult.error);

    const customersById = new Map<string, any>();
    for (const customer of customersResult.data || []) {
      customersById.set(customer.id, customer);
    }

    const fulfillmentByBooking = new Map<string, any[]>();
    for (const task of fulfillmentResult.data || []) {
      const list = fulfillmentByBooking.get(task.booking_id) || [];
      list.push(task);
      fulfillmentByBooking.set(task.booking_id, list);
    }

    rows = rows.map((booking: any) => ({
      ...booking,
      customers: customersById.get(booking.customer_id) || null,
      fulfillment_tasks: fulfillmentByBooking.get(booking.id) || [],
    }));

    if (search) {
      rows = rows.filter((booking: any) =>
        String(booking.reference || '').toLowerCase().includes(search) ||
        String(booking.contact_email || '').toLowerCase().includes(search) ||
        String(booking.contact_phone || '').toLowerCase().includes(search) ||
        String(booking.customers?.full_name || '').toLowerCase().includes(search)
      );
    }

    return successResponse({ bookings: rows, total: rows.length });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required', 'FORBIDDEN', 403);
    }
    console.error('Admin bookings GET error:', err);
    return errorResponse('Unable to load bookings', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();

    const type = body.type === 'hotel' ? 'hotel' : body.type === 'flight' ? 'flight' : null;
    const customerName = String(body.customerName || '').trim();
    const contactEmail = String(body.contactEmail || '').trim().toLowerCase();
    const contactPhone = String(body.contactPhone || '').trim();
    const amount = Number(body.customerPrice);
    const supplierCost = Number(body.supplierCost || 0);
    const currency = String(body.currency || 'PKR').trim().toUpperCase();

    if (!type) return errorResponse('Choose flight or hotel', 'VALIDATION_ERROR', 400);
    if (!customerName || !contactEmail || !contactPhone) {
      return errorResponse('Customer name, email and phone are required', 'VALIDATION_ERROR', 400);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return errorResponse('Customer price must be greater than zero', 'VALIDATION_ERROR', 400);
    }
    if (!Number.isFinite(supplierCost) || supplierCost < 0) {
      return errorResponse('Supplier cost cannot be negative', 'VALIDATION_ERROR', 400);
    }
    if (currency !== 'PKR') return errorResponse('Only PKR bookings are supported', 'CURRENCY_NOT_SUPPORTED', 400);

    const customer = await findOrCreateCustomer({
      name: customerName,
      email: contactEmail,
      phone: contactPhone,
      actorId: actor.id,
    });

    const reference = makeReference();
    const details = body.details && typeof body.details === 'object' ? body.details : {};
    const taxes = Math.max(0, Number(body.taxes || 0));
    const fees = Math.max(0, Number(body.fees || 0));
    const discount = Math.max(0, Number(body.discount || 0));
    const pricing = await calculateAgencyPrice({
      supplierCost,
      taxes,
      fees,
      discount,
      requestedCustomerPrice: amount,
      context: { product: type, supplier: body.supplierName || undefined },
    });

    const created = await supabaseAdmin
      .from('bookings')
      .insert({
        reference,
        type,
        status: 'BOOKING_REQUESTED',
        customer_id: customer.id,
        booked_by_user_id: actor.id,
        booked_by_role: actor.role,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        supplier_cost: supplierCost,
        agency_markup: pricing.markup,
        taxes: pricing.taxes,
        fees: pricing.fees,
        discount: pricing.discount,
        customer_price: pricing.customerPrice,
        agency_margin: pricing.agencyMargin,
        currency: 'PKR',
        supplier_name: body.supplierName ? String(body.supplierName).trim() : null,
        notes: body.notes ? String(body.notes).trim() : null,
        automatic_supplier_booking_enabled: false,
      })
      .select('*')
      .single();

    if (created.error || !created.data) {
      throw created.error || new Error('Booking could not be created');
    }

    const booking = created.data;

    const item = await supabaseAdmin.from('booking_items').insert({
      booking_id: booking.id,
      item_type: type,
      description: type === 'flight'
        ? `${details.origin || 'Origin'} → ${details.destination || 'Destination'}`
        : `${details.hotelName || 'Hotel'} — ${details.roomType || 'Room'}`,
      supplier_cost: supplierCost,
      customer_price: pricing.customerPrice,
      currency: 'PKR',
      metadata: details,
    });
    if (item.error) console.error('Booking item creation warning:', item.error);

    const history = await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'BOOKING_REQUESTED',
      description: 'Booking manually created by agency staff',
      changed_by: actor.id,
      metadata: { source: 'admin_manual_booking' },
    });
    if (history.error) console.error('Booking history warning:', history.error);

    const task = await supabaseAdmin.from('fulfillment_tasks').insert({
      booking_id: booking.id,
      status: 'pending',
      supplier_name: body.supplierName ? String(body.supplierName).trim() : null,
    });
    if (task.error) console.error('Fulfillment task warning:', task.error);

    const notification = await supabaseAdmin.from('notifications').insert({
      customer_id: customer.id,
      booking_id: booking.id,
      type: 'BOOKING_RECEIVED',
      title: 'Booking created',
      body: `Your booking ${reference} has been created by the agency.`,
      metadata: { reference },
    });
    if (notification.error) console.error('Notification warning:', notification.error);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: actor.id,
      action: 'CREATE',
      entity_type: 'booking',
      entity_id: booking.id,
      new_value: booking,
    });

    return successResponse({
      booking,
      message: 'Booking created successfully',
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required', 'FORBIDDEN', 403);
    }
    console.error('Admin booking creation error:', err);
    return errorResponse(
      err instanceof Error ? `Unable to create booking: ${err.message}` : 'Unable to create booking',
      'BOOKING_CREATE_FAILED',
      500
    );
  }
}

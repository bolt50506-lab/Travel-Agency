export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

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

    let query = supabaseAdmin
      .from('bookings')
      .select('*,customers(full_name,email,phone),fulfillment_tasks(*)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') query = query.eq('status', status);
    if (type && type !== 'all') query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
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
    if (err instanceof Error && err.message === 'UNAUTHORIZED_STAFF') {
      return errorResponse('Staff access required', 'FORBIDDEN', 403);
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

    const customer = await findOrCreateCustomer({
      name: customerName,
      email: contactEmail,
      phone: contactPhone,
      actorId: actor.id,
    });

    const reference = makeReference();
    const margin = Math.max(0, amount - supplierCost);
    const details = body.details && typeof body.details === 'object' ? body.details : {};

    const created = await supabaseAdmin
      .from('bookings')
      .insert({
        reference,
        type,
        status: 'BOOKING_REQUESTED',
        customer_id: customer.id,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        supplier_cost: supplierCost,
        agency_markup: margin,
        taxes: Number(body.taxes || 0),
        fees: Number(body.fees || 0),
        discount: Number(body.discount || 0),
        customer_price: amount,
        agency_margin: margin,
        currency,
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
      customer_price: amount,
      currency,
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
    if (err instanceof Error && err.message === 'UNAUTHORIZED_STAFF') {
      return errorResponse('Staff access required', 'FORBIDDEN', 403);
    }
    console.error('Admin booking creation error:', err);
    return errorResponse(
      err instanceof Error ? `Unable to create booking: ${err.message}` : 'Unable to create booking',
      'BOOKING_CREATE_FAILED',
      500
    );
  }
}

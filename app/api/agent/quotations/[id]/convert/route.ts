import { NextRequest } from 'next/server';
import { requireAgent } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api';

function bookingReference() {
  return `AG-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await requireAgent();
    const agent = await requireAgentRecord(actor.id);
    const { data: quote, error } = await supabaseAdmin
      .from('quotations')
      .select('*')
      .eq('id', params.id)
      .eq('agent_id', agent.id)
      .maybeSingle();

    if (error || !quote) return errorResponse('Quotation not found', 'NOT_FOUND', 404);
    if (!['APPROVED', 'SENT', 'VIEWED'].includes(String(quote.status))) {
      return errorResponse('Quotation must be sent, viewed or approved before conversion', 'QUOTE_NOT_READY', 409);
    }
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return errorResponse('Quotation has expired', 'QUOTE_EXPIRED', 409);
    }
    if (!['flight','hotel'].includes(String(quote.service_type))) return errorResponse('Only flight and hotel quotations can be converted to bookings in this release', 'SERVICE_NOT_BOOKABLE', 409);
    if (!quote.customer_id) return errorResponse('Quotation customer is required', 'CUSTOMER_REQUIRED', 409);

    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id,full_name,email,phone')
      .eq('id', quote.customer_id)
      .eq('created_by', actor.id)
      .maybeSingle();
    if (!customer) return errorResponse('Customer is not assigned to this agent', 'FORBIDDEN', 403);

    const total = Number(quote.total || 0);
    const supplierCost = Number(quote.supplier_cost || 0);
    const taxes = Number(quote.taxes || 0);
    const discount = Number(quote.discount || 0);
    if (!Number.isFinite(total) || total <= 0 || supplierCost < 0 || supplierCost > total) {
      return errorResponse('Quotation pricing is invalid', 'INVALID_QUOTE_PRICING', 409);
    }

    const reference = bookingReference();
    const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').insert({
      reference,
      type: String(quote.service_type),
      status: 'BOOKING_REQUESTED',
      customer_id: customer.id,
      agent_id: agent.id,
      agency_id: agent.agency_id || null,
      contact_email: customer.email || 'no-email@customer.local',
      contact_phone: customer.phone || 'N/A',
      supplier_cost: supplierCost,
      agency_markup: Math.max(0, total - supplierCost - taxes + discount),
      taxes,
      fees: 0,
      discount,
      customer_price: total,
      agency_margin: Math.max(0, total - supplierCost - taxes + discount),
      currency: 'PKR',
      notes: `Converted from quotation ${quote.reference}. ${quote.notes || ''}`.trim(),
      automatic_supplier_booking_enabled: false,
    }).select('*').single();

    if (bookingError || !booking) throw bookingError || new Error('Booking could not be created');

    await supabaseAdmin.from('booking_items').insert({
      booking_id: booking.id,
      item_type: String(quote.service_type),
      description: quote.title || `Quotation ${quote.reference}`,
      supplier_cost: supplierCost,
      customer_price: total,
      currency: 'PKR',
      metadata: { quotationId: quote.id, quotationReference: quote.reference },
    });

    await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'BOOKING_REQUESTED',
      description: `Booking created from quotation ${quote.reference}`,
      changed_by: actor.id,
      metadata: { quotationId: quote.id },
    });

    await supabaseAdmin.from('fulfillment_tasks').insert({
      booking_id: booking.id,
      status: 'pending',
    });

    if (Number(agent.commission_rate || 0) > 0) {
      const commissionRate = Number(agent.commission_rate);
      const margin = Math.max(0, total - supplierCost - taxes + discount);
      await supabaseAdmin.from('agent_commissions').insert({
        booking_id: booking.id,
        agent_id: agent.id,
        basis_amount: margin,
        commission_type: 'percentage_of_margin',
        commission_rate: commissionRate,
        commission_amount: Math.round(margin * commissionRate) / 100,
        currency: 'PKR',
        status: 'PENDING',
      });
    }

    await supabaseAdmin.from('quotations').update({
      status: 'CONVERTED',
      updated_at: new Date().toISOString(),
    }).eq('id', quote.id);

    await supabaseAdmin.from('audit_logs').insert({
      user_id: actor.id,
      action: 'CONVERT',
      entity_type: 'quotations',
      entity_id: quote.id,
      old_value: quote,
      new_value: { bookingId: booking.id, bookingReference: booking.reference, status: 'CONVERTED' },
    });

    return successResponse({
      quotationId: quote.id,
      bookingId: booking.id,
      bookingReference: booking.reference,
      status: booking.status,
    }, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_AGENT') return errorResponse('Agent access required', 'FORBIDDEN', 403);
    console.error('Quotation conversion error:', err);
    return errorResponse('Unable to convert quotation', 'QUOTE_CONVERSION_FAILED', 500);
  }
}

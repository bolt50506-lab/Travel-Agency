import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);

    const { data: booking, error: findError } = await supabaseAdmin
      .from('bookings')
      .select('id,reference,customer_id,status')
      .eq('reference', params.id)
      .maybeSingle();

    if (findError) throw findError;
    if (!booking) return errorResponse('Booking not found', 'NOT_FOUND', 404);

    if (actor.role === 'customer') {
      const customer = await supabaseAdmin.from('customers').select('id').eq('user_id', actor.id).maybeSingle();
      if (customer.error) throw customer.error;
      if (!customer.data || customer.data.id !== booking.customer_id) {
        return errorResponse('Booking not found', 'NOT_FOUND', 404);
      }
    }

    if (['CANCELLED', 'REFUNDED', 'TICKETED', 'VOUCHER_ISSUED', 'COMPLETED'].includes(booking.status)) {
      return errorResponse('This booking cannot be cancelled at its current stage', 'BOOKING_CANNOT_CANCEL', 409);
    }

    const now = new Date().toISOString();
    const updated = await supabaseAdmin
      .from('bookings')
      .update({ status: 'CANCELLED', updated_at: now })
      .eq('id', booking.id)
      .select('*')
      .single();

    if (updated.error || !updated.data) throw updated.error || new Error('Booking could not be cancelled');

    const history = await supabaseAdmin.from('booking_status_history').insert({
      booking_id: booking.id,
      status: 'CANCELLED',
      description: actor.role === 'customer' ? 'Booking cancelled by customer' : 'Booking cancelled by agency staff',
      changed_by: actor.id,
      metadata: { source: 'booking_cancel' },
    });
    if (history.error) console.error('Cancel history warning:', history.error);

    await supabaseAdmin
      .from('fulfillment_tasks')
      .update({ status: 'cancelled', updated_at: now })
      .eq('booking_id', booking.id);

    return successResponse({
      id: updated.data.id,
      reference: updated.data.reference,
      status: updated.data.status,
      message: 'Booking cancelled successfully',
    });
  } catch (err) {
    console.error('Cancel booking error:', err);
    return errorResponse('Unable to cancel booking', 'BOOKING_CANCEL_FAILED', 500);
  }
}

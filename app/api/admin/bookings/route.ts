import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search')?.toLowerCase();

    let bookings = [...mockBookings];

    if (status) bookings = bookings.filter((b) => b.status === status);
    if (type) bookings = bookings.filter((b) => b.type === type);
    if (search) {
      bookings = bookings.filter(
        (b) =>
          b.reference.toLowerCase().includes(search) ||
          (b.fulfillment?.pnr || '').toLowerCase().includes(search) ||
          (b.fulfillment?.hotelConfirmationNumber || '').toLowerCase().includes(search) ||
          (b.contactEmail || '').toLowerCase().includes(search)
      );
    }

    return successResponse({ bookings, total: bookings.length });
  } catch (err) {
    console.error('Admin bookings error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

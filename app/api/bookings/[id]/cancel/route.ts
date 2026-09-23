import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = mockBookings.find((b) => b.reference === params.id);

    if (!booking) {
      return errorResponse('Booking not found', 'NOT_FOUND', 404);
    }

    booking.status = 'CANCELLED';
    booking.updatedAt = new Date().toISOString();
    booking.timeline.push({
      id: `evt-${Date.now()}`,
      status: 'CANCELLED',
      description: 'Booking cancelled by user',
      timestamp: new Date().toISOString(),
    });

    return successResponse(booking);
  } catch (err) {
    console.error('Cancel booking error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

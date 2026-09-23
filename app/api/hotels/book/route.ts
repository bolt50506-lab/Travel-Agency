import { NextRequest } from 'next/server';
import { hotelService } from '@/lib/services';
import { hotelBookSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(hotelBookSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await hotelService.bookHotel(validation.data);

    if (result.status === 'FAILED') {
      return errorResponse(
        'Reservation could not be completed. Please try again.',
        'BOOKING_FAILED',
        500
      );
    }

    return successResponse(result, 201);
  } catch (err) {
    console.error('Hotel booking error:', err);
    return errorResponse('Something went wrong while booking the hotel', 'INTERNAL_ERROR', 500);
  }
}

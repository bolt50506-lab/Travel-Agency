import { NextRequest } from 'next/server';
import { flightService } from '@/lib/services';
import { flightBookSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(flightBookSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await flightService.bookFlight(validation.data);

    if (result.status === 'FAILED') {
      return errorResponse(
        'Booking could not be completed. Please try again.',
        'BOOKING_FAILED',
        500
      );
    }

    return successResponse(result, 201);
  } catch (err) {
    console.error('Flight booking error:', err);
    return errorResponse('Something went wrong while booking the flight', 'INTERNAL_ERROR', 500);
  }
}

import { NextRequest } from 'next/server';
import { hotelService } from '@/lib/services';
import { hotelSearchSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(hotelSearchSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await hotelService.searchHotels(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Hotel search error:', err);
    return errorResponse('Something went wrong while searching hotels', 'INTERNAL_ERROR', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = {
      destination: searchParams.get('destination') || '',
      checkIn: searchParams.get('checkIn') || '',
      checkOut: searchParams.get('checkOut') || '',
      guests: parseInt(searchParams.get('guests') || '2'),
      rooms: parseInt(searchParams.get('rooms') || '1'),
    };

    const validation = validateBody(hotelSearchSchema, body);
    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await hotelService.searchHotels(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Hotel search error:', err);
    return errorResponse('Something went wrong while searching hotels', 'INTERNAL_ERROR', 500);
  }
}

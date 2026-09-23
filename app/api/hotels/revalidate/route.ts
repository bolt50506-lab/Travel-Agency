import { NextRequest } from 'next/server';
import { hotelService } from '@/lib/services';
import { hotelRevalidateSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(hotelRevalidateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await hotelService.revalidateRoom(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Hotel revalidate error:', err);
    return errorResponse('Something went wrong during rate revalidation', 'INTERNAL_ERROR', 500);
  }
}

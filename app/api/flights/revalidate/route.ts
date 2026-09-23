import { NextRequest } from 'next/server';
import { flightService } from '@/lib/services';
import { flightRevalidateSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(flightRevalidateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await flightService.revalidateOffer(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Flight revalidate error:', err);
    return errorResponse('Something went wrong during fare revalidation', 'INTERNAL_ERROR', 500);
  }
}

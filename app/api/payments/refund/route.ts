import { NextRequest } from 'next/server';
import { z } from 'zod';
import { paymentService } from '@/lib/services';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

const refundSchema = z.object({
  paymentId: z.string().min(1),
  bookingReference: z.string().min(1),
  reason: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(refundSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await paymentService.refund(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Refund error:', err);
    return errorResponse('Something went wrong while processing refund', 'INTERNAL_ERROR', 500);
  }
}

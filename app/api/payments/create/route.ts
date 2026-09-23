import { NextRequest } from 'next/server';
import { paymentService } from '@/lib/services';
import { paymentSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(paymentSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await paymentService.createPayment(validation.data);

    if (result.status === 'FAILED') {
      return errorResponse(result.message, 'PAYMENT_FAILED', 400);
    }

    return successResponse(result, 200);
  } catch (err) {
    console.error('Payment creation error:', err);
    return errorResponse('Something went wrong while processing payment', 'INTERNAL_ERROR', 500);
  }
}

import { NextRequest } from 'next/server';
import { paymentService } from '@/lib/services';
import { successResponse, errorResponse } from '@/lib/utils/api';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return errorResponse('Payment ID is required', 'VALIDATION_ERROR', 400);
    }

    const result = await paymentService.verifyPayment(paymentId);
    return successResponse(result);
  } catch (err) {
    console.error('Payment verification error:', err);
    return errorResponse('Something went wrong while verifying payment', 'INTERNAL_ERROR', 500);
  }
}

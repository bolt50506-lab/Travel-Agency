import { NextRequest } from 'next/server';
import { hotelService } from '@/lib/services';
import { hotelRevalidateSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { calculateAgencyPrice, sealRevalidationToken } from '@/lib/services/pricing-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(hotelRevalidateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await hotelService.revalidateRoom(validation.data);
    if (result.priceChanged && result.newPrice) {
      const pricing = await calculateAgencyPrice({ supplierCost: Number(result.room?.totalPrice?.amount || result.newPrice.amount), taxes: Number(result.room?.taxesAndFees?.amount || 0), requestedCustomerPrice: Number(result.newPrice.amount), context: { product: 'hotel' } });
      return successResponse({ ...result, newPrice: { amount: pricing.customerPrice, currency: 'PKR' }, pricingToken: sealRevalidationToken(pricing) });
    }
    return successResponse(result);
  } catch (err) {
    console.error('Hotel revalidate error:', err);
    return errorResponse('Something went wrong during rate revalidation', 'INTERNAL_ERROR', 500);
  }
}

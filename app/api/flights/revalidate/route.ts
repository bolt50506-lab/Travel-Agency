import { NextRequest } from 'next/server';
import { flightService } from '@/lib/services';
import { flightRevalidateSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { calculateAgencyPrice, sealRevalidationToken } from '@/lib/services/pricing-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(flightRevalidateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await flightService.revalidateOffer(validation.data);
    if (!result.offer) return successResponse(result);

    // Revalidation must return the same customer-facing price used when the
    // booking is created. The supplier offer is not the agency selling price.
    const pricing = await calculateAgencyPrice({
      supplierCost: Number(result.offer.basePrice?.amount || 0),
      taxes: Number(result.offer.taxesAndFees?.amount || 0),
      context: {
        product: 'flight',
        supplier: result.offer.provider,
        airline: result.offer.segments?.[0]?.airline?.code,
        route: result.offer.segments?.[0]?.origin?.code && result.offer.segments?.[0]?.destination?.code
          ? `${result.offer.segments[0].origin.code}-${result.offer.segments[0].destination.code}`
          : undefined,
      },
    });

    const customerOffer = {
      ...result.offer,
      totalPrice: { amount: pricing.customerPrice, currency: 'PKR' },
      basePrice: { amount: pricing.supplierCost, currency: 'PKR' },
      taxesAndFees: { amount: pricing.taxes, currency: 'PKR' },
      pricingToken: sealRevalidationToken(pricing),
    };

    return successResponse({
      ...result,
      offer: customerOffer,
      priceChanged: false,
      oldPrice: undefined,
      newPrice: undefined,
    });
  } catch (err) {
    console.error('Flight revalidate error:', err);
    return errorResponse('Something went wrong during fare revalidation', 'INTERNAL_ERROR', 500);
  }
}

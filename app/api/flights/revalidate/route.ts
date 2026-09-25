import { NextRequest } from 'next/server';
import { flightService } from '@/lib/services';
import { flightRevalidateSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { calculateAgencyPrice, sealRevalidationToken, openPricingSnapshot } from '@/lib/services/pricing-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(flightRevalidateSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const signedSnapshot = validation.data.pricingToken
      ? openPricingSnapshot(String(validation.data.pricingToken))
      : null;

    // LetsFG keeps the original search offer bookable for the search lifetime.
    // Its public API does not expose a separate revalidation endpoint, so never
    // replace a real selected fare with a synthetic zero-price offer.
    if (
      validation.data.selectedOffer &&
      signedSnapshot &&
      String(validation.data.offerId).startsWith('letsfg::')
    ) {
      const selected = validation.data.selectedOffer as any;
      const customerOffer = {
        ...selected,
        id: validation.data.offerId,
        totalPrice: { amount: signedSnapshot.customerPrice, currency: 'PKR' },
        basePrice: { amount: signedSnapshot.supplierCost, currency: 'PKR' },
        taxesAndFees: { amount: signedSnapshot.taxes, currency: 'PKR' },
        pricingToken: validation.data.pricingToken,
      };

      return successResponse({
        valid: true,
        priceChanged: false,
        oldPrice: undefined,
        newPrice: undefined,
        offer: customerOffer,
      });
    }

    const result = await flightService.revalidateOffer(validation.data);

    if (!result.offer) return successResponse(result);

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

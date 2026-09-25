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

    // Revalidation returns the supplier offer. Restore the signed customer
    // pricing snapshot when one was supplied so checkout keeps the exact fare
    // that was shown during search.
    let customerOffer = result.offer;

    if (signedSnapshot) {
      customerOffer = {
        ...result.offer,
        totalPrice: { amount: signedSnapshot.customerPrice, currency: 'PKR' },
        basePrice: { amount: signedSnapshot.supplierCost, currency: 'PKR' },
        taxesAndFees: { amount: signedSnapshot.taxes, currency: 'PKR' },
        pricingToken: validation.data.pricingToken,
      };
    } else {
      const pricing = await calculateAgencyPrice({
        supplierCost: Number(result.offer.basePrice?.amount || 0),
        taxes: Number(result.offer.taxesAndFees?.amount || 0),
        context: {
          product: 'flight',
          supplier: result.offer.provider,
          airline: result.offer.segments?.[0]?.airline?.code,
          route:
            result.offer.segments?.[0]?.origin?.code &&
            result.offer.segments?.[0]?.destination?.code
              ? `${result.offer.segments[0].origin.code}-${result.offer.segments[0].destination.code}`
              : undefined,
        },
      });

      customerOffer = {
        ...result.offer,
        totalPrice: { amount: pricing.customerPrice, currency: 'PKR' },
        basePrice: { amount: pricing.supplierCost, currency: 'PKR' },
        taxesAndFees: { amount: pricing.taxes, currency: 'PKR' },
        pricingToken: sealRevalidationToken(pricing),
      };
    }

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

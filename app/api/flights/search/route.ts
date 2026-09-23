import { NextRequest } from 'next/server';
import { flightService } from '@/lib/services';
import { flightSearchSchema } from '@/lib/validation/schemas';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { getActivePricingRules, priceFlightOffer } from '@/lib/services/pricing-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(flightSearchSchema, body);

    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await flightService.searchFlights(validation.data);
    const rules = await getActivePricingRules();
    const offers = await Promise.all(result.offers.map((offer) => priceFlightOffer(offer, rules)));
    return successResponse({ ...result, offers });
  } catch (err) {
    console.error('Flight search error:', err);
    return errorResponse('Something went wrong while searching flights', 'INTERNAL_ERROR', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = {
      tripType: searchParams.get('tripType') || 'round-trip',
      origin: searchParams.get('origin') || '',
      destination: searchParams.get('destination') || '',
      departDate: searchParams.get('departDate') || '',
      returnDate: searchParams.get('returnDate') || undefined,
      passengers: {
        adults: parseInt(searchParams.get('adults') || '1'),
        children: parseInt(searchParams.get('children') || '0'),
        infants: parseInt(searchParams.get('infants') || '0'),
      },
      cabinClass: searchParams.get('cabinClass') || 'economy',
    };

    const validation = validateBody(flightSearchSchema, body);
    if (!validation.success) {
      return errorResponse(validation.error, 'VALIDATION_ERROR', 400);
    }

    const result = await flightService.searchFlights(validation.data);
    return successResponse(result);
  } catch (err) {
    console.error('Flight search error:', err);
    return errorResponse('Something went wrong while searching flights', 'INTERNAL_ERROR', 500);
  }
}

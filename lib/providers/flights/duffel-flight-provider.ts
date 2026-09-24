import type { IFlightProvider } from './flight-provider';
import type {
  FlightSearchQuery,
  FlightSearchResponse,
  FlightOffer,
  FlightSegment,
  RevalidateRequest,
  RevalidateResponse,
  FlightBookingRequest,
  FlightBookingResult,
  CabinClass,
  FlightPassenger,
} from '@/types/flight';

const DUFFEL_API_URL = 'https://api.duffel.com';

type DuffelResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

type DuffelOffer = {
  id: string;
  live_mode?: boolean;
  total_amount: string;
  total_currency: string;
  base_amount?: string | null;
  base_currency?: string | null;
  tax_amount?: string | null;
  tax_currency?: string | null;
  expires_at: string;
  passengers?: Array<{
    id: string;
    type?: string;
    age?: number;
  }>;
  conditions?: {
    refund_before_departure?: { allowed?: boolean };
  };
  slices: Array<{
    origin?: DuffelAirport;
    destination?: DuffelAirport;
    segments: DuffelSegment[];
  }>;
};

type DuffelAirport = {
  iata_code?: string;
  iata_city_code?: string;
  name?: string;
  city_name?: string;
  iata_country_code?: string;
};

type DuffelCarrier = {
  iata_code?: string;
  name?: string;
  logo_symbol_url?: string;
};

type DuffelSegment = {
  id: string;
  departing_at: string;
  arriving_at: string;
  duration?: string;
  marketing_carrier?: DuffelCarrier;
  operating_carrier?: DuffelCarrier;
  marketing_carrier_flight_number?: string;
  origin: DuffelAirport;
  destination: DuffelAirport;
  passengers?: Array<{
    cabin_bags?: { quantity?: number };
    checked_bags?: { quantity?: number };
  }>;
};

type DuffelOrder = {
  id: string;
  booking_reference?: string;
  status?: string;
  created_at?: string;
  slices?: unknown[];
};

function getApiKey() {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error('DUFFEL_API_KEY is not configured');
  return key;
}

async function duffelRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${DUFFEL_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Duffel-Version': 'v2',
      Authorization: `Bearer ${getApiKey()}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const body = await response.text();
  let parsed: any = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      parsed?.errors?.[0]?.message ||
      parsed?.error?.message ||
      `Duffel API request failed with HTTP ${response.status}`;
    throw new Error(`DUFFEL_${response.status}: ${message}`);
  }

  return parsed as T;
}

function parseDuration(value?: string) {
  if (!value) return 0;
  const match = value.match(/^P(?:(\\d+)D)?T(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?$/);
  if (!match) return 0;
  return (
    Number(match[1] || 0) * 1440 +
    Number(match[2] || 0) * 60 +
    Number(match[3] || 0) +
    Math.round(Number(match[4] || 0) / 60)
  );
}

function cabinToDuffel(cabin: CabinClass) {
  return cabin === 'premium-economy' ? 'premium_economy' : cabin;
}

function cabinFromDuffel(cabin: CabinClass) {
  return cabin;
}

function airport(value: DuffelAirport) {
  const code = value.iata_code || value.iata_city_code || '';
  return {
    code,
    city: value.city_name || code,
    name: value.name || code,
    country: value.iata_country_code || '',
  };
}

function baggage(segment: DuffelSegment) {
  const passenger = segment.passengers?.[0];
  const cabin = passenger?.cabin_bags?.quantity;
  const checked = passenger?.checked_bags?.quantity;

  return {
    checked: checked == null ? 'See fare conditions' : `${checked} bag${checked === 1 ? '' : 's'}`,
    cabin: cabin == null ? 'See fare conditions' : `${cabin} bag${cabin === 1 ? '' : 's'}`,
  };
}

function mapSegment(segment: DuffelSegment, cabinClass: CabinClass): FlightSegment {
  const carrier = segment.marketing_carrier || segment.operating_carrier || {};
  return {
    id: segment.id,
    airline: {
      code: carrier.iata_code || '',
      name: carrier.name || carrier.iata_code || 'Unknown airline',
      logo: carrier.logo_symbol_url,
    },
    flightNumber: segment.marketing_carrier_flight_number || '',
    origin: airport(segment.origin),
    destination: airport(segment.destination),
    departureTime: segment.departing_at,
    arrivalTime: segment.arriving_at,
    duration: parseDuration(segment.duration),
    cabinClass,
    baggage: baggage(segment),
    seatsAvailable: 0,
  };
}

function mapOffer(offer: DuffelOffer, cabinClass: CabinClass): FlightOffer {
  const segments = offer.slices.flatMap((slice) =>
    slice.segments.map((segment) => mapSegment(segment, cabinClass))
  );
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);

  const total = Number(offer.total_amount);
  const base = Number(offer.base_amount ?? offer.total_amount);
  const taxes = Number(offer.tax_amount ?? Math.max(0, total - base));

  return {
    id: offer.id,
    segments,
    totalPrice: { amount: total, currency: offer.total_currency },
    basePrice: { amount: base, currency: offer.base_currency || offer.total_currency },
    taxesAndFees: { amount: taxes, currency: offer.tax_currency || offer.total_currency },
    stops: Math.max(0, segments.length - offer.slices.length),
    totalDuration,
    refundable: Boolean(offer.conditions?.refund_before_departure?.allowed),
    provider: 'Duffel',
    validUntil: offer.expires_at,
  };
}

function passengerTypes(query: FlightSearchQuery) {
  return [
    ...Array.from({ length: query.passengers.adults }, () => ({ type: 'adult' })),
    ...Array.from({ length: query.passengers.children }, () => ({ type: 'child' })),
    ...Array.from({ length: query.passengers.infants }, () => ({ age: 1 })),
  ];
}

function bookingPassenger(
  passenger: FlightPassenger,
  duffelPassengerId?: string
) {
  const gender =
    passenger.gender === 'male'
      ? 'm'
      : passenger.gender === 'female'
        ? 'f'
        : undefined;

  return {
    id: duffelPassengerId,
    title: gender === 'm' ? 'mr' : gender === 'f' ? 'ms' : 'mx',
    given_name: passenger.firstName,
    family_name: passenger.lastName,
    born_on: passenger.dateOfBirth,
    ...(gender ? { gender } : {}),
    email: undefined,
    phone_number: undefined,
    ...(passenger.passportNumber && passenger.nationality
      ? {
          identity_documents: [
            {
              type: 'passport',
              unique_identifier: passenger.passportNumber,
              issuing_country_code: passenger.nationality,
            },
          ],
        }
      : {}),
  };
}

export class DuffelFlightProvider implements IFlightProvider {
  readonly name = 'Duffel';
  readonly isMock = false;

  async search(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    const origin = query.origin.trim().toUpperCase();
    const destination = query.destination.trim().toUpperCase();

    if (origin === destination) {
      throw new Error('DUFFEL_INVALID_ROUTE: Origin and destination must be different');
    }

    const slices = [
      {
        origin,
        destination,
        departure_date: query.departDate,
      },
      ...(query.tripType === 'round-trip' && query.returnDate
        ? [
            {
              origin: destination,
              destination: origin,
              departure_date: query.returnDate,
            },
          ]
        : []),
      ...(query.tripType === 'multi-city'
        ? (query.multiCitySegments || []).map((segment) => {
            const segmentOrigin = segment.origin.trim().toUpperCase();
            const segmentDestination = segment.destination.trim().toUpperCase();

            if (segmentOrigin === segmentDestination) {
              throw new Error(
                'DUFFEL_INVALID_ROUTE: Multi-city segment origin and destination must be different (' +
                  segmentOrigin +
                  ')'
              );
            }

            return {
              origin: segmentOrigin,
              destination: segmentDestination,
              departure_date: segment.date,
            };
          })
        : []),
    ];

    const response = await duffelRequest<DuffelResponse<{ id: string; offers: DuffelOffer[] }>>(
      '/air/offer_requests',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            slices,
            passengers: passengerTypes(query),
            cabin_class: cabinToDuffel(query.cabinClass),
            max_connections: Number(process.env.DUFFEL_MAX_CONNECTIONS || 2),
          },
        }),
      }
    );

    const offers = (response.data.offers || [])
      .filter((offer) => offer.id && Array.isArray(offer.slices))
      .map((offer) => mapOffer(offer, cabinFromDuffel(query.cabinClass)));

    const expiresAt =
      offers.reduce(
        (earliest, offer) =>
          new Date(offer.validUntil) < new Date(earliest) ? offer.validUntil : earliest,
        offers[0]?.validUntil || new Date(Date.now() + 30 * 60000).toISOString()
      );

    return {
      offers,
      searchId: response.data.id,
      expiresAt,
    };
  }

  async revalidate(request: RevalidateRequest): Promise<RevalidateResponse> {
    const response = await duffelRequest<DuffelResponse<DuffelOffer>>(
      `/air/offers/${encodeURIComponent(request.offerId)}`
    );

    const offer = mapOffer(response.data, 'economy');
    const expired = new Date(response.data.expires_at).getTime() <= Date.now();

    if (expired) {
      return {
        valid: false,
        priceChanged: false,
        seatsAvailable: false,
        offer,
      };
    }

    return {
      valid: true,
      priceChanged: false,
      seatsAvailable: true,
      offer,
    };
  }

  async book(request: FlightBookingRequest): Promise<FlightBookingResult> {
    const offerResponse = await duffelRequest<DuffelResponse<DuffelOffer>>(
      `/air/offers/${encodeURIComponent(request.offerId)}`
    );
    const offer = offerResponse.data;

    if (new Date(offer.expires_at).getTime() <= Date.now()) {
      throw new Error('DUFFEL_OFFER_EXPIRED');
    }

    const offerPassengers = offer.passengers || [];
    if (offerPassengers.length < request.passengers.length) {
      throw new Error('DUFFEL_PASSENGER_COUNT_MISMATCH');
    }

    const passengers = request.passengers.map((passenger, index) => ({
      ...bookingPassenger(passenger, offerPassengers[index]?.id),
      email: request.contactEmail,
      phone_number: request.contactPhone,
    }));

    const totalAmount = String(offer.total_amount);
    const currency = offer.total_currency;

    const orderResponse = await duffelRequest<DuffelResponse<DuffelOrder>>(
      '/air/orders',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'instant',
            selected_offers: [offer.id],
            payments: [
              {
                type: 'balance',
                currency,
                amount: totalAmount,
              },
            ],
            passengers,
          },
        }),
      }
    );

    const order = orderResponse.data;
    const normalizedOffer = mapOffer(offer, 'economy');

    return {
      bookingReference: order.booking_reference || order.id,
      pnr: order.booking_reference || order.id,
      status: order.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
      offer: normalizedOffer,
      passengers: request.passengers,
      ticketStatus: order.status || 'PENDING',
      createdAt: order.created_at || new Date().toISOString(),
    };
  }
}

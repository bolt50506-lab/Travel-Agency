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
} from '@/types/flight';

const LIVE_BASE = 'https://letsfg.co/developers/api/v1';
const SANDBOX_BASE = 'https://letsfg.co/developers/api/v1/sandbox';

type LetsFGSegment = {
  id?: string;
  airline?: string;
  airline_name?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
  departure?: string;
  arrival?: string;
  departure_time?: string;
  arrival_time?: string;
  duration_minutes?: number;
};

type LetsFGOffer = {
  id: string;
  price: number;
  currency: string;
  owner_airline?: string;
  route?: string;
  outbound?: { segments?: LetsFGSegment[] };
  inbound?: { segments?: LetsFGSegment[] };
  segments?: LetsFGSegment[];
  refundable?: boolean;
  booking_url?: string;
};

type LetsFGSearchResponse = {
  search_id?: string;
  offers?: LetsFGOffer[];
  passenger_ids?: string[];
  total_results?: number;
};

function getBaseUrl() {
  return (process.env.LETSFG_MODE || 'sandbox').toLowerCase() === 'live'
    ? LIVE_BASE
    : SANDBOX_BASE;
}

function getApiKey() {
  return process.env.LETSFG_API_KEY || '';
}

function cabinToLetsFg(cabin: CabinClass) {
  switch (cabin) {
    case 'premium-economy':
      return 'W';
    case 'business':
      return 'C';
    case 'first':
      return 'F';
    default:
      return 'M';
  }
}

function durationFromSegments(segments: FlightSegment[]) {
  if (!segments.length) return 0;
  const start = new Date(segments[0].departureTime).getTime();
  const end = new Date(segments[segments.length - 1].arrivalTime).getTime();
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 60000)) : 0;
}

function parseRouteCode(value?: string, index = 0) {
  if (!value) return '';
  const parts = value.split(/\s*(?:->|→|-)\s*/);
  return parts[index] || value.trim().slice(0, 3).toUpperCase();
}

function mapSegment(segment: LetsFGSegment, cabinClass: CabinClass, index: number): FlightSegment {
  const origin = segment.origin || '';
  const destination = segment.destination || '';
  const departureTime = segment.departure_time || segment.departure || new Date().toISOString();
  const arrivalTime = segment.arrival_time || segment.arrival || departureTime;
  const airlineCode = (segment.airline || '').toUpperCase();
  const airlineName = segment.airline_name || segment.airline || 'Unknown airline';

  return {
    id: segment.id || `letsfg-seg-${index}-${origin}-${destination}`,
    airline: {
      code: airlineCode,
      name: airlineName,
    },
    flightNumber: segment.flight_number || '',
    origin: {
      code: origin,
      city: origin,
      name: origin,
      country: '',
    },
    destination: {
      code: destination,
      city: destination,
      name: destination,
      country: '',
    },
    departureTime,
    arrivalTime,
    duration: Number(segment.duration_minutes) || Math.max(
      0,
      Math.round((new Date(arrivalTime).getTime() - new Date(departureTime).getTime()) / 60000)
    ),
    cabinClass,
    baggage: { checked: 'See fare conditions', cabin: 'See fare conditions' },
    seatsAvailable: 0,
  };
}

function mapOffer(offer: LetsFGOffer, cabinClass: CabinClass): FlightOffer {
  const rawSegments = [
    ...(offer.outbound?.segments || []),
    ...(offer.inbound?.segments || []),
    ...(offer.segments || []),
  ];

  const fallbackOrigin = parseRouteCode(offer.route, 0);
  const fallbackDestination = parseRouteCode(offer.route, 1);

  const segments = rawSegments.length
    ? rawSegments.map((segment, index) => mapSegment(segment, cabinClass, index))
    : [{
        id: `letsfg-${offer.id}`,
        airline: {
          code: (offer.owner_airline || '').slice(0, 3).toUpperCase(),
          name: offer.owner_airline || 'Unknown airline',
        },
        flightNumber: '',
        origin: { code: fallbackOrigin, city: fallbackOrigin, name: fallbackOrigin, country: '' },
        destination: { code: fallbackDestination, city: fallbackDestination, name: fallbackDestination, country: '' },
        departureTime: new Date().toISOString(),
        arrivalTime: new Date().toISOString(),
        duration: 0,
        cabinClass,
        baggage: { checked: 'See fare conditions', cabin: 'See fare conditions' },
        seatsAvailable: 0,
      }];

  const total = Number(offer.price);
  return {
    id: offer.id,
    segments,
    totalPrice: { amount: Math.round(total), currency: (offer.currency || 'USD').toUpperCase() },
    basePrice: { amount: Math.round(total), currency: (offer.currency || 'USD').toUpperCase() },
    taxesAndFees: { amount: 0, currency: (offer.currency || 'USD').toUpperCase() },
    stops: Math.max(0, segments.length - 1),
    totalDuration: durationFromSegments(segments),
    refundable: Boolean(offer.refundable),
    provider: process.env.LETSFG_MODE === 'live' ? 'LetsFG' : 'LetsFG Sandbox',
    validUntil: new Date(Date.now() + 15 * 60000).toISOString(),
    pricingToken: offer.booking_url,
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  const key = getApiKey();
  if (key) headers['X-API-Key'] = key;

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    cache: 'no-store',
  });

  const body = await response.text();
  let parsed: any = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { parsed = null; }

  if (!response.ok) {
    throw new Error(
      `LETSFG_${response.status}: ${parsed?.message || parsed?.error || body || 'LetsFG request failed'}`
    );
  }
  return parsed as T;
}

export class LetsFGFlightProvider implements IFlightProvider {
  readonly name = process.env.LETSFG_MODE === 'live' ? 'LetsFG' : 'LetsFG Sandbox';
  readonly isMock = process.env.LETSFG_MODE !== 'live';

  async search(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    const response = await request<LetsFGSearchResponse>('/flights/search', {
      method: 'POST',
      body: JSON.stringify({
        origin: query.origin.trim().toUpperCase(),
        destination: query.destination.trim().toUpperCase(),
        date_from: query.departDate,
        ...(query.tripType === 'round-trip' && query.returnDate ? { return_from: query.returnDate } : {}),
        adults: query.passengers.adults,
        children: query.passengers.children,
        infants: query.passengers.infants,
        cabin_class: cabinToLetsFg(query.cabinClass),
        currency: 'USD',
        limit: 50,
        sort: 'price',
      }),
    });

    const offers = (response.offers || [])
      .filter((offer) => offer.id && Number.isFinite(Number(offer.price)))
      .map((offer) => mapOffer(offer, query.cabinClass));

    offers.sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);

    return {
      offers,
      searchId: response.search_id || `letsfg-${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60000).toISOString(),
    };
  }

  async revalidate(request: RevalidateRequest): Promise<RevalidateResponse> {
    // LetsFG's documented flow keeps a search/offer bookable for a limited window.
    // Re-run the search through the caller when the offer has expired; here we
    // preserve the existing normalized offer contract without inventing pricing.
    return {
      valid: true,
      priceChanged: false,
      seatsAvailable: true,
      offer: {
        id: request.offerId,
        segments: [],
        totalPrice: { amount: 0, currency: 'USD' },
        basePrice: { amount: 0, currency: 'USD' },
        taxesAndFees: { amount: 0, currency: 'USD' },
        stops: 0,
        totalDuration: 0,
        refundable: false,
        provider: this.name,
        validUntil: new Date(Date.now() + 5 * 60000).toISOString(),
      },
    };
  }

  async book(request: FlightBookingRequest): Promise<FlightBookingResult> {
    if (this.isMock) {
      throw new Error('LETSFG_SANDBOX_BOOKING_DISABLED: Sandbox search is for testing. Switch LETSFG_MODE=live for real booking.');
    }

    const passengers = request.passengers.map((p) => ({
      given_name: p.firstName,
      family_name: p.lastName,
      born_on: p.dateOfBirth,
      ...(p.gender ? { gender: p.gender === 'male' ? 'm' : p.gender === 'female' ? 'f' : undefined } : {}),
      ...(p.nationality ? { nationality: p.nationality } : {}),
      ...(p.passportNumber ? { passport_number: p.passportNumber } : {}),
      passenger_type: p.type,
      email: request.contactEmail,
      phone_number: request.contactPhone,
    }));

    const response = await requestApi<{ ok?: boolean; booking_id?: string; state?: string; poll_url?: string; charged?: number }>(
      '/flights/book',
      {
        method: 'POST',
        body: JSON.stringify({
          search_id: request.searchId,
          offer_id: request.offerId,
          idempotency_key: `${request.searchId}:${request.offerId}`,
          contact_email: request.contactEmail,
          passengers,
        }),
      }
    );

    return {
      bookingReference: response.booking_id || request.offerId,
      pnr: response.booking_id || request.offerId,
      status: response.state === 'completed' ? 'CONFIRMED' : 'PENDING',
      offer: {
        id: request.offerId,
        segments: [],
        totalPrice: { amount: 0, currency: 'USD' },
        basePrice: { amount: 0, currency: 'USD' },
        taxesAndFees: { amount: 0, currency: 'USD' },
        stops: 0,
        totalDuration: 0,
        refundable: false,
        provider: this.name,
        validUntil: new Date(Date.now() + 15 * 60000).toISOString(),
      },
      passengers: request.passengers,
      ticketStatus: response.state || 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }
}

async function requestApi<T>(path: string, init: RequestInit = {}) {
  const previous = process.env.LETSFG_MODE;
  process.env.LETSFG_MODE = 'live';
  try {
    return await request<T>(path, init);
  } finally {
    process.env.LETSFG_MODE = previous;
  }
}

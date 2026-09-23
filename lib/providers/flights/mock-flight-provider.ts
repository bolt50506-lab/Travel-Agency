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
import { mockAirports, mockAirlines } from './mock-data';

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAirport(code: string) {
  return mockAirports.find((a) => a.code === code) ?? mockAirports[0];
}

function generateTime(baseDate: Date, hour: number, minute: number): Date {
  const d = new Date(baseDate);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function generateFlightNumber(airlineCode: string, seed: number): string {
  return `${airlineCode}${1000 + Math.floor(seededRandom(seed) * 8999)}`;
}

function generateSegments(
  origin: string,
  destination: string,
  dateStr: string,
  cabinClass: CabinClass,
  seed: number
): FlightSegment[] {
  const originAirport = getAirport(origin);
  const destAirport = getAirport(destination);
  const date = new Date(dateStr);
  const airline = mockAirlines[Math.floor(seededRandom(seed) * mockAirlines.length)];

  const depHour = Math.floor(seededRandom(seed + 1) * 24);
  const depMinute = Math.floor(seededRandom(seed + 2) * 60);
  const depTime = generateTime(date, depHour, depMinute);

  const flightDurationMin = 180 + Math.floor(seededRandom(seed + 3) * 720);
  const arrTime = new Date(depTime.getTime() + flightDurationMin * 60000);

  const stops = seededRandom(seed + 4) < 0.35 ? 1 : 0;

  if (stops === 0) {
    return [
      {
        id: `seg-${seed}-0`,
        airline,
        flightNumber: generateFlightNumber(airline.code, seed + 5),
        origin: originAirport,
        destination: destAirport,
        departureTime: depTime.toISOString(),
        arrivalTime: arrTime.toISOString(),
        duration: flightDurationMin,
        cabinClass,
        baggage: {
          checked: cabinClass === 'economy' ? '20kg' : cabinClass === 'business' ? '30kg' : '40kg',
          cabin: '7kg',
        },
        seatsAvailable: Math.floor(seededRandom(seed + 6) * 50) + 1,
      },
    ];
  }

  const layoverAirport = mockAirports[Math.floor(seededRandom(seed + 7) * mockAirports.length)];
  const firstLegDuration = Math.floor(flightDurationMin * 0.5);
  const layoverDuration = 60 + Math.floor(seededRandom(seed + 8) * 180);
  const secondLegDuration = flightDurationMin - firstLegDuration;

  const firstArr = new Date(depTime.getTime() + firstLegDuration * 60000);
  const secondDep = new Date(firstArr.getTime() + layoverDuration * 60000);
  const secondArr = new Date(secondDep.getTime() + secondLegDuration * 60000);

  const airline2 = mockAirlines[Math.floor(seededRandom(seed + 9) * mockAirlines.length)];

  return [
    {
      id: `seg-${seed}-0`,
      airline,
      flightNumber: generateFlightNumber(airline.code, seed + 5),
      origin: originAirport,
      destination: layoverAirport,
      departureTime: depTime.toISOString(),
      arrivalTime: firstArr.toISOString(),
      duration: firstLegDuration,
      cabinClass,
      baggage: {
        checked: cabinClass === 'economy' ? '20kg' : cabinClass === 'business' ? '30kg' : '40kg',
        cabin: '7kg',
      },
      seatsAvailable: Math.floor(seededRandom(seed + 6) * 50) + 1,
    },
    {
      id: `seg-${seed}-1`,
      airline: airline2,
      flightNumber: generateFlightNumber(airline2.code, seed + 10),
      origin: layoverAirport,
      destination: destAirport,
      departureTime: secondDep.toISOString(),
      arrivalTime: secondArr.toISOString(),
      duration: secondLegDuration,
      cabinClass,
      baggage: {
        checked: cabinClass === 'economy' ? '20kg' : cabinClass === 'business' ? '30kg' : '40kg',
        cabin: '7kg',
      },
      seatsAvailable: Math.floor(seededRandom(seed + 11) * 50) + 1,
    },
  ];
}

function calculatePrice(cabinClass: CabinClass, stops: number, duration: number, seed: number): {
  base: number;
  taxes: number;
  total: number;
} {
  const cabinMultiplier =
    cabinClass === 'economy' ? 1 :
    cabinClass === 'premium-economy' ? 1.5 :
    cabinClass === 'business' ? 3 :
    4.5;

  const baseFare = (200 + seededRandom(seed) * 800) * cabinMultiplier;
  const stopDiscount = stops > 0 ? 0.85 : 1;
  const durationFactor = 1 + duration / 10000;
  const base = Math.round(baseFare * stopDiscount * durationFactor);
  const taxes = Math.round(base * 0.15);
  return { base, taxes, total: base + taxes };
}

function generatePNR(seed: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars[Math.floor(seededRandom(seed + i) * chars.length)];
  }
  return pnr;
}

export class MockFlightProvider implements IFlightProvider {
  readonly name = 'MockFlightProvider';
  readonly isMock = true;

  async search(query: FlightSearchQuery): Promise<FlightSearchResponse> {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const seed = hashCode(
      query.origin + query.destination + query.departDate + query.cabinClass
    );

    const numOffers = 8 + Math.floor(seededRandom(seed) * 7);
    const offers: FlightOffer[] = [];

    for (let i = 0; i < numOffers; i++) {
      const offerSeed = seed + i * 137;
      const segments = generateSegments(
        query.origin,
        query.destination,
        query.departDate,
        query.cabinClass,
        offerSeed
      );

      const stops = segments.length - 1;
      const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
      const price = calculatePrice(query.cabinClass, stops, totalDuration, offerSeed);

      offers.push({
        id: `offer-${offerSeed}`,
        segments,
        totalPrice: { amount: price.total, currency: 'USD' },
        basePrice: { amount: price.base, currency: 'USD' },
        taxesAndFees: { amount: price.taxes, currency: 'USD' },
        stops,
        totalDuration,
        refundable: seededRandom(offerSeed + 20) > 0.5,
        provider: this.name,
        validUntil: new Date(Date.now() + 30 * 60000).toISOString(),
      });
    }

    offers.sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);

    return {
      offers,
      searchId: `search-${seed}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    };
  }

  async revalidate(request: RevalidateRequest): Promise<RevalidateResponse> {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

    const seed = hashCode(request.offerId);

    if (seededRandom(seed + 100) < 0.15) {
      return {
        valid: false,
        priceChanged: false,
        seatsAvailable: false,
      };
    }

    if (seededRandom(seed + 200) < 0.25) {
      const oldPrice = 500 + Math.floor(seededRandom(seed) * 1000);
      const newPrice = Math.round(oldPrice * (1 + (seededRandom(seed + 300) - 0.4) * 0.2));

      return {
        valid: true,
        priceChanged: true,
        oldPrice: { amount: oldPrice, currency: 'USD' },
        newPrice: { amount: newPrice, currency: 'USD' },
        seatsAvailable: true,
      };
    }

    return {
      valid: true,
      priceChanged: false,
      seatsAvailable: true,
    };
  }

  async book(request: FlightBookingRequest): Promise<FlightBookingResult> {
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));

    const seed = hashCode(request.offerId + request.contactEmail);
    const pnr = generatePNR(seed);

    if (seededRandom(seed + 500) < 0.05) {
      return {
        bookingReference: `BK${Date.now().toString(36).toUpperCase()}`,
        pnr,
        status: 'FAILED',
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
          validUntil: new Date().toISOString(),
        },
        passengers: request.passengers,
        ticketStatus: 'FAILED',
        createdAt: new Date().toISOString(),
      };
    }

    return {
      bookingReference: `BK${Date.now().toString(36).toUpperCase()}`,
      pnr,
      status: 'CONFIRMED',
      offer: {
        id: request.offerId,
        segments: [],
        totalPrice: { amount: 0, currency: 'USD' },
        basePrice: { amount: 0, currency: 'USD' },
        taxesAndFees: { amount: 0, currency: 'USD' },
        stops: 0,
        totalDuration: 0,
        refundable: true,
        provider: this.name,
        validUntil: new Date().toISOString(),
      },
      passengers: request.passengers,
      ticketStatus: 'TICKETED',
      createdAt: new Date().toISOString(),
    };
  }
}

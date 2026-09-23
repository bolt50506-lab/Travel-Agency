import type { IHotelProvider } from './hotel-provider';
import type {
  HotelSearchQuery,
  HotelSearchResponse,
  HotelOffer,
  HotelRoom,
  HotelRevalidateRequest,
  HotelRevalidateResponse,
  HotelBookingRequest,
  HotelBookingResult,
} from '@/types/hotel';
import {
  hotelImagePool,
  mockHotelDestinations,
  mockHotelChains,
  mockHotelAmenities,
  mockPropertyTypes,
} from './mock-data';

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

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const result: T[] = [];
  const used = new Set<number>();
  for (let i = 0; i < n && i < arr.length; i++) {
    let idx = Math.floor(seededRandom(seed + i) * arr.length);
    while (used.has(idx)) idx = (idx + 1) % arr.length;
    used.add(idx);
    result.push(arr[idx]);
  }
  return result;
}

function generateRooms(seed: number, nights: number): HotelRoom[] {
  const roomTypes = [
    { type: 'Standard Room', bed: 'Queen Bed', max: 2, size: '25m²' },
    { type: 'Deluxe Room', bed: 'King Bed', max: 2, size: '30m²' },
    { type: 'Executive Suite', bed: 'King Bed', max: 3, size: '45m²' },
    { type: 'Family Room', bed: '2 Queen Beds', max: 4, size: '40m²' },
    { type: 'Presidential Suite', bed: 'King Bed', max: 2, size: '80m²' },
  ];

  const numRooms = 3 + Math.floor(seededRandom(seed) * 3);
  const rooms: HotelRoom[] = [];

  for (let i = 0; i < numRooms; i++) {
    const roomSeed = seed + i * 97;
    const rt = roomTypes[i % roomTypes.length];
    const pricePerNight = 80 + Math.floor(seededRandom(roomSeed) * 400);
    const taxes = Math.round(pricePerNight * nights * 0.12);
    const total = pricePerNight * nights + taxes;

    rooms.push({
      id: `room-${roomSeed}`,
      type: rt.type,
      description: `Comfortable ${rt.type.toLowerCase()} with ${rt.bed}, modern amenities, and city views.`,
      maxOccupancy: rt.max,
      bedType: rt.bed,
      size: rt.size,
      amenities: pickN(mockHotelAmenities, 5, roomSeed),
      cancellationPolicy: seededRandom(roomSeed + 50) > 0.4
        ? 'Free cancellation up to 48 hours before check-in'
        : 'Non-refundable',
      refundable: seededRandom(roomSeed + 50) > 0.4,
      pricePerNight: { amount: pricePerNight, currency: 'USD' },
      totalPrice: { amount: total, currency: 'USD' },
      taxesAndFees: { amount: taxes, currency: 'USD' },
      roomsAvailable: Math.floor(seededRandom(roomSeed + 60) * 10) + 1,
    });
  }

  return rooms;
}

function generateConfirmation(seed: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let conf = '';
  for (let i = 0; i < 8; i++) {
    conf += chars[Math.floor(seededRandom(seed + i) * chars.length)];
  }
  return conf;
}

export class MockHotelProvider implements IHotelProvider {
  readonly name = 'MockHotelProvider';
  readonly isMock = true;

  async search(query: HotelSearchQuery): Promise<HotelSearchResponse> {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));

    const checkIn = new Date(query.checkIn);
    const checkOut = new Date(query.checkOut);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

    const dest = mockHotelDestinations.find(
      (d) => d.city.toLowerCase() === query.destination.toLowerCase()
    ) ?? mockHotelDestinations[0];

    const seed = hashCode(query.destination + query.checkIn + query.checkOut);
    const numHotels = 10 + Math.floor(seededRandom(seed) * 8);
    const offers: HotelOffer[] = [];

    for (let i = 0; i < numHotels; i++) {
      const hotelSeed = seed + i * 211;
      const chain = mockHotelChains[Math.floor(seededRandom(hotelSeed) * mockHotelChains.length)];
      const starRating = 3 + Math.floor(seededRandom(hotelSeed + 1) * 3);
      const guestRating = Math.round((3.5 + seededRandom(hotelSeed + 2) * 1.5) * 10) / 10;
      const reviewCount = 50 + Math.floor(seededRandom(hotelSeed + 3) * 2000);
      const rooms = generateRooms(hotelSeed, nights);
      const startingPrice = Math.min(...rooms.map((r) => r.pricePerNight.amount));

      offers.push({
        id: `hotel-${hotelSeed}`,
        name: `${chain} ${dest.city}`,
        starRating,
        guestRating,
        reviewCount,
        address: `${100 + Math.floor(seededRandom(hotelSeed + 4) * 999)} ${dest.city} Boulevard`,
        city: dest.city,
        country: dest.country,
        images: [
          hotelImagePool[i % hotelImagePool.length],
          hotelImagePool[(i + 3) % hotelImagePool.length],
          hotelImagePool[(i + 6) % hotelImagePool.length],
        ],
        amenities: pickN(mockHotelAmenities, 8, hotelSeed),
        propertyType: mockPropertyTypes[Math.floor(seededRandom(hotelSeed + 5) * mockPropertyTypes.length)],
        checkInTime: '14:00',
        checkOutTime: '12:00',
        rooms,
        startingPrice: { amount: startingPrice, currency: 'USD' },
        provider: this.name,
        validUntil: new Date(Date.now() + 30 * 60000).toISOString(),
      });
    }

    offers.sort((a, b) => a.startingPrice.amount - b.startingPrice.amount);

    return {
      offers,
      searchId: `hotel-search-${seed}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString(),
    };
  }

  async revalidate(request: HotelRevalidateRequest): Promise<HotelRevalidateResponse> {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

    const seed = hashCode(request.hotelId + request.roomId);

    if (seededRandom(seed + 100) < 0.12) {
      return { valid: false, priceChanged: false, roomsAvailable: false };
    }

    if (seededRandom(seed + 200) < 0.2) {
      const oldPrice = 100 + Math.floor(seededRandom(seed) * 400);
      const newPrice = Math.round(oldPrice * (1 + (seededRandom(seed + 300) - 0.4) * 0.15));
      return {
        valid: true,
        priceChanged: true,
        oldPrice: { amount: oldPrice, currency: 'USD' },
        newPrice: { amount: newPrice, currency: 'USD' },
        roomsAvailable: true,
      };
    }

    return { valid: true, priceChanged: false, roomsAvailable: true };
  }

  async book(request: HotelBookingRequest): Promise<HotelBookingResult> {
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 500));

    const seed = hashCode(request.hotelId + request.roomId + request.contactEmail);
    const conf = generateConfirmation(seed);

    if (seededRandom(seed + 500) < 0.05) {
      return {
        bookingReference: `HB${Date.now().toString(36).toUpperCase()}`,
        confirmationNumber: conf,
        status: 'FAILED',
        hotel: { name: '', address: '', city: '' },
        room: {
          id: request.roomId,
          type: '',
          description: '',
          maxOccupancy: 0,
          bedType: '',
          amenities: [],
          cancellationPolicy: '',
          refundable: false,
          pricePerNight: { amount: 0, currency: 'USD' },
          totalPrice: { amount: 0, currency: 'USD' },
          taxesAndFees: { amount: 0, currency: 'USD' },
          roomsAvailable: 0,
        },
        checkIn: '',
        checkOut: '',
        guests: request.guests,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      bookingReference: `HB${Date.now().toString(36).toUpperCase()}`,
      confirmationNumber: conf,
      status: 'CONFIRMED',
      hotel: { name: '', address: '', city: '' },
      room: {
        id: request.roomId,
        type: '',
        description: '',
        maxOccupancy: 0,
        bedType: '',
        amenities: [],
        cancellationPolicy: '',
        refundable: true,
        pricePerNight: { amount: 0, currency: 'USD' },
        totalPrice: { amount: 0, currency: 'USD' },
        taxesAndFees: { amount: 0, currency: 'USD' },
        roomsAvailable: 1,
      },
      checkIn: '',
      checkOut: '',
      guests: request.guests,
      createdAt: new Date().toISOString(),
    };
  }
}

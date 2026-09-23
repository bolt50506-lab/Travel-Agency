import type { Money } from './common';

export type TripType = 'round-trip' | 'one-way' | 'multi-city';

export type CabinClass = 'economy' | 'premium-economy' | 'business' | 'first';

export type PassengerType = 'adult' | 'child' | 'infant';

export interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightSearchQuery {
  tripType: TripType;
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string;
  passengers: PassengerCount;
  cabinClass: CabinClass;
  multiCitySegments?: Array<{
    origin: string;
    destination: string;
    date: string;
  }>;
}

export interface Airport {
  code: string;
  city: string;
  name: string;
  country: string;
}

export interface Airline {
  code: string;
  name: string;
  logo?: string;
}

export interface FlightSegment {
  id: string;
  airline: Airline;
  flightNumber: string;
  origin: Airport;
  destination: Airport;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  cabinClass: CabinClass;
  baggage: {
    checked: string;
    cabin: string;
  };
  seatsAvailable: number;
}

export interface FlightOffer {
  id: string;
  segments: FlightSegment[];
  totalPrice: Money;
  basePrice: Money;
  taxesAndFees: Money;
  stops: number;
  totalDuration: number;
  refundable: boolean;
  provider: string;
  validUntil: string;
}

export interface FlightSearchResponse {
  offers: FlightOffer[];
  searchId: string;
  expiresAt: string;
}

export interface RevalidateRequest {
  offerId: string;
  searchId: string;
}

export interface RevalidateResponse {
  valid: boolean;
  priceChanged: boolean;
  oldPrice?: Money;
  newPrice?: Money;
  seatsAvailable: boolean;
  offer?: FlightOffer;
}

export interface FlightPassenger {
  type: PassengerType;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: 'male' | 'female' | 'other';
  passportNumber?: string;
  nationality?: string;
}

export interface FlightBookingRequest {
  offerId: string;
  searchId: string;
  passengers: FlightPassenger[];
  contactEmail: string;
  contactPhone: string;
}

export interface FlightBookingResult {
  bookingReference: string;
  pnr: string;
  status: 'PENDING' | 'CONFIRMED' | 'TICKETED' | 'CANCELLED' | 'FAILED';
  offer: FlightOffer;
  passengers: FlightPassenger[];
  ticketStatus: string;
  createdAt: string;
}

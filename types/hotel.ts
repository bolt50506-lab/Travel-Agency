import type { Money } from './common';

export interface HotelSearchQuery {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

export interface HotelAmenity {
  name: string;
  icon?: string;
}

export interface HotelRoom {
  id: string;
  type: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  size?: string;
  amenities: string[];
  cancellationPolicy: string;
  refundable: boolean;
  pricePerNight: Money;
  totalPrice: Money;
  taxesAndFees: Money;
  roomsAvailable: number;
}

export interface HotelOffer {
  id: string;
  name: string;
  starRating: number;
  guestRating: number;
  reviewCount: number;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  amenities: string[];
  propertyType: string;
  checkInTime: string;
  checkOutTime: string;
  rooms: HotelRoom[];
  startingPrice: Money;
  provider: string;
  validUntil: string;
}

export interface HotelSearchResponse {
  offers: HotelOffer[];
  searchId: string;
  expiresAt: string;
}

export interface HotelRevalidateRequest {
  hotelId: string;
  roomId: string;
  searchId: string;
}

export interface HotelRevalidateResponse {
  valid: boolean;
  priceChanged: boolean;
  oldPrice?: Money;
  newPrice?: Money;
  roomsAvailable: boolean;
  room?: HotelRoom;
}

export interface HotelGuest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface HotelBookingRequest {
  hotelId: string;
  roomId: string;
  searchId: string;
  guests: HotelGuest[];
  contactEmail: string;
  contactPhone: string;
  specialRequests?: string;
}

export interface HotelBookingResult {
  bookingReference: string;
  confirmationNumber: string;
  status: string;
  hotel: { name: string; address: string; city: string };
  room: HotelRoom;
  checkIn: string;
  checkOut: string;
  guests: HotelGuest[];
  createdAt: string;
}

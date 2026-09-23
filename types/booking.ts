import type { Money } from './common';
import type { FlightOffer, FlightPassenger } from './flight';
import type { HotelOffer, HotelRoom, HotelGuest } from './hotel';

export type BookingType = 'flight' | 'hotel';

export type BookingStatus =
  | 'DRAFT'
  | 'BOOKING_REQUESTED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_RECEIVED'
  | 'AGENCY_PROCESSING'
  | 'SUPPLIER_BOOKING_IN_PROGRESS'
  | 'SUPPLIER_CONFIRMED'
  | 'PRICE_CHANGE_REVIEW'
  | 'DOCUMENT_PENDING'
  | 'DOCUMENT_UPLOADED'
  | 'COMPLETED'
  | 'TICKET_PENDING'
  | 'TICKETED'
  | 'VOUCHER_PENDING'
  | 'VOUCHER_ISSUED'
  | 'CUSTOMER_ACTION_REQUIRED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_PROCESSING'
  | 'REFUNDED'
  | 'FAILED';

export type DocumentType =
  | 'AGENCY_CONFIRMATION'
  | 'AIRLINE_TICKET'
  | 'AIRLINE_ITINERARY'
  | 'HOTEL_CONFIRMATION'
  | 'HOTEL_VOUCHER'
  | 'PAYMENT_RECEIPT'
  | 'REFUND_DOCUMENT';

export interface BookingDocument {
  id: string;
  bookingId: string;
  type: DocumentType;
  filename: string;
  mimeType: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
  customerVisible: boolean;
  version: number;
}

export interface FulfillmentTask {
  id: string;
  bookingId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignedTo?: string;
  supplierName?: string;
  supplierReference?: string;
  pnr?: string;
  ticketNumber?: string;
  hotelConfirmationNumber?: string;
  notes: FulfillmentNote[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FulfillmentNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  type: BookingType;
  status: BookingStatus;
  totalAmount: Money;
  supplierCost?: Money;
  margin?: Money;
  userId: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  updatedAt: string;
  flightDetails?: FlightOffer & { passengers: FlightPassenger[] };
  hotelDetails?: HotelOffer & { room: HotelRoom; guests: HotelGuest[] };
  fulfillment?: FulfillmentTask;
  documents: BookingDocument[];
  timeline: BookingTimelineEvent[];
}

export interface BookingTimelineEvent {
  id: string;
  status: BookingStatus;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

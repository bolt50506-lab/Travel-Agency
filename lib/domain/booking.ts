export const BOOKING_STATUSES = ['DRAFT','BOOKING_REQUESTED','PAYMENT_PENDING','PAYMENT_RECEIVED','AGENCY_PROCESSING','SUPPLIER_BOOKING_IN_PROGRESS','SUPPLIER_CONFIRMED','PRICE_CHANGE_REVIEW','DOCUMENT_PENDING','DOCUMENT_UPLOADED','COMPLETED','TICKET_PENDING','TICKETED','VOUCHER_PENDING','VOUCHER_ISSUED','CUSTOMER_ACTION_REQUIRED','CANCELLED','REFUND_REQUESTED','REFUND_PROCESSING','REFUNDED','FAILED'] as const;
export type BookingStatus = typeof BOOKING_STATUSES[number];

export const BOOKING_TYPES = ['flight','hotel'] as const;
export type BookingType = typeof BOOKING_TYPES[number];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

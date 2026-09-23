import type { Money } from './common';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type PaymentMethod = 'card' | 'paypal' | 'bank-transfer' | 'wallet';

export interface PaymentRequest {
  bookingReference: string;
  amount: Money;
  method: PaymentMethod;
  card?: {
    number: string;
    name: string;
    expiry: string;
    cvv: string;
  };
  billingAddress?: {
    line1: string;
    city: string;
    country: string;
    postalCode: string;
  };
}

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  transactionId: string;
  amount: Money;
  message: string;
  paidAt?: string;
}

export interface RefundRequest {
  paymentId: string;
  bookingReference: string;
  reason: string;
}

export interface RefundResult {
  refundId: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  amount: Money;
  message: string;
}

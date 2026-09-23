import type {
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from '@/types/payment';

export interface IPaymentProvider {
  readonly name: string;
  readonly isMock: boolean;

  createPayment(request: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(paymentId: string): Promise<PaymentResult>;
  refund(request: RefundRequest): Promise<RefundResult>;
}

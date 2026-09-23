import { getPaymentProvider } from '@/lib/providers/payments';
import type {
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from '@/types/payment';

export class PaymentService {
  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    const provider = getPaymentProvider();
    return provider.createPayment(request);
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    const provider = getPaymentProvider();
    return provider.verifyPayment(paymentId);
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const provider = getPaymentProvider();
    return provider.refund(request);
  }
}

export const paymentService = new PaymentService();

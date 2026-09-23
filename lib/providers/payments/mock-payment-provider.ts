import type { IPaymentProvider } from './payment-provider';
import type {
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from '@/types/payment';

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

export class MockPaymentProvider implements IPaymentProvider {
  readonly name = 'MockPaymentProvider';
  readonly isMock = true;

  async createPayment(request: PaymentRequest): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));

    const seed = hashCode(request.bookingReference + request.amount.amount.toString());

    if (seededRandom(seed) < 0.08) {
      return {
        paymentId: `pay-${seed}-${Date.now()}`,
        status: 'FAILED',
        transactionId: '',
        amount: request.amount,
        message: 'Payment declined. Please try a different payment method.',
      };
    }

    return {
      paymentId: `pay-${seed}-${Date.now()}`,
      status: 'SUCCESS',
      transactionId: `txn-${seed}-${Date.now().toString(36).toUpperCase()}`,
      amount: request.amount,
      message: 'Payment processed successfully.',
      paidAt: new Date().toISOString(),
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 300));

    return {
      paymentId,
      status: 'SUCCESS',
      transactionId: `txn-verified-${Date.now().toString(36).toUpperCase()}`,
      amount: { amount: 0, currency: 'PKR' },
      message: 'Payment verified.',
      paidAt: new Date().toISOString(),
    };
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 400));

    const seed = hashCode(request.paymentId + request.reason);

    if (seededRandom(seed) < 0.05) {
      return {
        refundId: `refund-${seed}-${Date.now()}`,
        status: 'FAILED',
        amount: { amount: 0, currency: 'PKR' },
        message: 'Refund could not be processed at this time.',
      };
    }

    return {
      refundId: `refund-${seed}-${Date.now()}`,
      status: 'PROCESSED',
      amount: { amount: 0, currency: 'PKR' },
      message: 'Refund processed successfully.',
    };
  }
}

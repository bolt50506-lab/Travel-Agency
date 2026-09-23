import type { IPaymentProvider } from './payment-provider';
import { MockPaymentProvider } from './mock-payment-provider';

let paymentProvider: IPaymentProvider | null = null;

export function getPaymentProvider(): IPaymentProvider {
  if (!paymentProvider) {
    const providerName = process.env.PAYMENT_PROVIDER || 'mock';

    switch (providerName.toLowerCase()) {
      case 'mock':
      default:
        paymentProvider = new MockPaymentProvider();
        break;
    }
  }
  return paymentProvider;
}

export function resetPaymentProvider() {
  paymentProvider = null;
}

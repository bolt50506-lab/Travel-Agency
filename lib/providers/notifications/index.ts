import type { INotificationProvider } from './notification-provider';
import { MockNotificationProvider } from './mock-notification-provider';

let notificationProvider: INotificationProvider | null = null;

export function getNotificationProvider(): INotificationProvider {
  if (!notificationProvider) {
    const providerName = process.env.EMAIL_PROVIDER || 'mock';

    switch (providerName.toLowerCase()) {
      case 'mock':
      default:
        notificationProvider = new MockNotificationProvider();
        break;
    }
  }
  return notificationProvider;
}

export function resetNotificationProvider() {
  notificationProvider = null;
}

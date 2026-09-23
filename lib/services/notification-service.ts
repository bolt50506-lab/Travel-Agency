import { getNotificationProvider } from '@/lib/providers/notifications';
import { notificationTemplates } from '@/lib/providers/notifications/mock-notification-provider';
import type { NotificationType } from '@/lib/providers/notifications/notification-provider';

export class NotificationService {
  async notify(
    type: NotificationType,
    to: string,
    data: Record<string, string>
  ): Promise<void> {
    const provider = getNotificationProvider();
    const template = notificationTemplates[type];

    if (!template) return;

    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
    const body = template.body(data).replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');

    await provider.sendEmail(to, subject, body);
  }
}

export const notificationService = new NotificationService();

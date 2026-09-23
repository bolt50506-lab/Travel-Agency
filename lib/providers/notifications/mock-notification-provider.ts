import type { INotificationProvider, NotificationType } from './notification-provider';

export class MockNotificationProvider implements INotificationProvider {
  readonly name = 'MockNotificationProvider';
  readonly isMock = true;

  async sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject} | Body: ${body.substring(0, 100)}...`);
    return true;
  }

  async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`[MOCK SMS] To: ${to} | Message: ${message}`);
    return true;
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    console.log(`[MOCK WHATSAPP] To: ${to} | Message: ${message}`);
    return true;
  }
}

export const notificationTemplates: Record<NotificationType, { subject: string; body: (data: Record<string, string>) => string }> = {
  BOOKING_CREATED: {
    subject: 'Booking Created - {{reference}}',
    body: (d) => `Your booking ${d.reference} has been created. Please complete payment to confirm.`,
  },
  PAYMENT_SUCCESS: {
    subject: 'Payment Confirmed - {{reference}}',
    body: (d) => `We have received your payment of ${d.amount} for booking ${d.reference}.`,
  },
  BOOKING_CONFIRMED: {
    subject: 'Booking Confirmed - {{reference}}',
    body: (d) => `Your booking ${d.reference} has been confirmed.`,
  },
  TICKET_ISSUED: {
    subject: 'Flight Ticket Issued - {{reference}}',
    body: (d) => `Your flight ticket for booking ${d.reference} has been issued. PNR: ${d.pnr}.`,
  },
  VOUCHER_ISSUED: {
    subject: 'Hotel Voucher Issued - {{reference}}',
    body: (d) => `Your hotel voucher for booking ${d.reference} has been issued.`,
  },
  BOOKING_CANCELLED: {
    subject: 'Booking Cancelled - {{reference}}',
    body: (d) => `Your booking ${d.reference} has been cancelled.`,
  },
  REFUND_PROCESSED: {
    subject: 'Refund Processed - {{reference}}',
    body: (d) => `A refund of ${d.amount} has been processed for booking ${d.reference}.`,
  },
};

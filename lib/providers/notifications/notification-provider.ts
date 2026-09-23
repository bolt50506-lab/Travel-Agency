export interface INotificationProvider {
  readonly name: string;
  readonly isMock: boolean;

  sendEmail(to: string, subject: string, body: string): Promise<boolean>;
  sendSms(to: string, message: string): Promise<boolean>;
  sendWhatsApp(to: string, message: string): Promise<boolean>;
}

export type NotificationType =
  | 'BOOKING_CREATED'
  | 'PAYMENT_SUCCESS'
  | 'BOOKING_CONFIRMED'
  | 'TICKET_ISSUED'
  | 'VOUCHER_ISSUED'
  | 'BOOKING_CANCELLED'
  | 'REFUND_PROCESSED';

import { successResponse } from '@/lib/utils/api';

export async function GET() {
  try {
    const providers = [
      {
        id: 'flight-1',
        name: 'MockFlightProvider',
        type: 'flight',
        isMock: true,
        status: 'active',
        configured: true,
      },
      {
        id: 'hotel-1',
        name: 'MockHotelProvider',
        type: 'hotel',
        isMock: true,
        status: 'active',
        configured: true,
      },
      {
        id: 'payment-1',
        name: 'MockPaymentProvider',
        type: 'payment',
        isMock: true,
        status: 'active',
        configured: true,
      },
      {
        id: 'notif-1',
        name: 'MockNotificationProvider',
        type: 'notification',
        isMock: true,
        status: 'active',
        configured: true,
      },
    ];

    return successResponse({ providers });
  } catch (err) {
    console.error('Admin providers error:', err);
    return successResponse({ providers: [] });
  }
}

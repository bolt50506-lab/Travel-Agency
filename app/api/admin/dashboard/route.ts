import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';

export async function GET() {
  try {
    const totalBookings = mockBookings.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = mockBookings.filter((b) => b.createdAt.slice(0, 10) === today).length;
    const flightBookings = mockBookings.filter((b) => b.type === 'flight').length;
    const hotelBookings = mockBookings.filter((b) => b.type === 'hotel').length;

    const revenue = mockBookings
      .filter((b) => !['CANCELLED', 'REFUNDED', 'FAILED'].includes(b.status))
      .reduce((sum, b) => sum + b.totalAmount.amount, 0);

    const grossMargin = mockBookings
      .filter((b) => !['CANCELLED', 'REFUNDED', 'FAILED'].includes(b.status))
      .reduce((sum, b) => sum + (b.margin?.amount || 0), 0);

    const pendingPayments = mockBookings.filter((b) =>
      ['PAYMENT_PENDING', 'BOOKING_REQUESTED'].includes(b.status)
    ).length;

    const fulfillmentPending = mockBookings.filter((b) =>
      b.fulfillment && ['PENDING', 'IN_PROGRESS'].includes(b.fulfillment.status)
    ).length;

    const refundRequests = mockBookings.filter((b) =>
      ['REFUND_REQUESTED', 'REFUND_PROCESSING'].includes(b.status)
    ).length;

    const bookingsOverTime = [
      { date: 'Sep 15', bookings: 1 },
      { date: 'Sep 16', bookings: 0 },
      { date: 'Sep 17', bookings: 0 },
      { date: 'Sep 18', bookings: 1 },
      { date: 'Sep 19', bookings: 0 },
      { date: 'Sep 20', bookings: 1 },
      { date: 'Sep 21', bookings: 0 },
    ];

    const revenueOverTime = [
      { date: 'Sep 15', revenue: 842 },
      { date: 'Sep 16', revenue: 0 },
      { date: 'Sep 17', revenue: 0 },
      { date: 'Sep 18', revenue: 560 },
      { date: 'Sep 19', revenue: 0 },
      { date: 'Sep 20', revenue: 1240 },
      { date: 'Sep 21', revenue: 0 },
    ];

    const flightVsHotel = [
      { name: 'Flights', value: flightBookings },
      { name: 'Hotels', value: hotelBookings },
    ];

    return successResponse({
      cards: {
        totalBookings,
        todayBookings,
        flightBookings,
        hotelBookings,
        revenue,
        grossMargin,
        pendingPayments,
        fulfillmentPending,
        refundRequests,
      },
      charts: {
        bookingsOverTime,
        revenueOverTime,
        flightVsHotel,
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

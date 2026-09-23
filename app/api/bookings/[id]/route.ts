import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings, generateAgencyReference } from '@/lib/mock/booking-store';
import type { Booking, BookingType, BookingStatus, FulfillmentTask } from '@/types/booking';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = mockBookings.find((b) => b.reference === params.id);

    if (!booking) {
      return errorResponse('Booking not found', 'NOT_FOUND', 404);
    }

    return successResponse(booking);
  } catch (err) {
    console.error('Get booking error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const reference = generateAgencyReference();
    const now = new Date().toISOString();

    const fulfillment: FulfillmentTask = {
      id: `fulfillment-${Date.now()}`,
      bookingId: reference,
      status: 'PENDING',
      notes: [],
      createdAt: now,
      updatedAt: now,
    };

    const booking: Booking = {
      id: `booking-${Date.now()}`,
      reference,
      type: (body.type || 'flight') as BookingType,
      status: 'PAYMENT_RECEIVED' as BookingStatus,
      totalAmount: body.totalAmount || { amount: 0, currency: 'USD' },
      supplierCost: body.supplierCost,
      margin: body.margin,
      userId: body.userId || 'guest',
      contactEmail: body.contactEmail || '',
      contactPhone: body.contactPhone || '',
      createdAt: now,
      updatedAt: now,
      flightDetails: body.flightDetails,
      hotelDetails: body.hotelDetails,
      fulfillment,
      documents: [],
      timeline: [
        {
          id: `evt-${Date.now()}-1`,
          status: 'BOOKING_REQUESTED' as BookingStatus,
          description: 'Booking request submitted by customer',
          timestamp: now,
        },
        {
          id: `evt-${Date.now()}-2`,
          status: 'PAYMENT_RECEIVED' as BookingStatus,
          description: 'Payment received from customer',
          timestamp: now,
        },
      ],
    };

    mockBookings.push(booking);
    return successResponse(booking, 201);
  } catch (err) {
    console.error('Create booking error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';

export async function GET() {
  try {
    return successResponse({ bookings: mockBookings });
  } catch (err) {
    console.error('Get bookings error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

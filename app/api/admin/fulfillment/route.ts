import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';
import type { Booking, FulfillmentTask, FulfillmentNote, BookingStatus, BookingTimelineEvent } from '@/types/booking';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    let bookings = mockBookings.filter((b) => b.fulfillment);

    if (statusFilter && statusFilter !== 'all') {
      bookings = bookings.filter((b) => b.fulfillment!.status === statusFilter.toUpperCase());
    }

    const queue = bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      type: b.type,
      status: b.status,
      customerEmail: b.contactEmail,
      customerPhone: b.contactPhone,
      totalAmount: b.totalAmount,
      supplierCost: b.supplierCost,
      margin: b.margin,
      fulfillmentStatus: b.fulfillment!.status,
      assignedTo: b.fulfillment!.assignedTo,
      supplierName: b.fulfillment!.supplierName,
      supplierReference: b.fulfillment!.supplierReference,
      pnr: b.fulfillment!.pnr,
      ticketNumber: b.fulfillment!.ticketNumber,
      hotelConfirmationNumber: b.fulfillment!.hotelConfirmationNumber,
      hasDocuments: b.documents.length > 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      waitingTime: calculateWaitingTime(b.createdAt),
      summary: getBookingSummary(b),
    }));

    return successResponse({ queue });
  } catch (err) {
    console.error('Fulfillment queue error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

function calculateWaitingTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getBookingSummary(b: Booking): string {
  if (b.type === 'flight' && b.flightDetails) {
    const seg = b.flightDetails.segments[0];
    if (seg) return `${seg.origin} → ${seg.destination}`;
    return `Flight (${b.flightDetails.passengers.length} passengers)`;
  }
  if (b.type === 'hotel' && b.hotelDetails) {
    return `${b.hotelDetails.name} — ${b.hotelDetails.room.type}`;
  }
  return '';
}

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { mockBookings } from '@/lib/mock/booking-store';
import type { BookingStatus, BookingTimelineEvent, FulfillmentNote, BookingDocument, DocumentType } from '@/types/booking';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const booking = mockBookings.find((b) => b.id === params.id || b.reference === params.id);
    if (!booking) {
      return errorResponse('Booking not found', 'NOT_FOUND', 404);
    }
    return successResponse(booking);
  } catch (err) {
    console.error('Get fulfillment detail error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const booking = mockBookings.find((b) => b.id === params.id || b.reference === params.id);

    if (!booking) {
      return errorResponse('Booking not found', 'NOT_FOUND', 404);
    }

    const now = new Date().toISOString();
    const action = body.action as string;
    const timelineEvents: BookingTimelineEvent[] = [];

    switch (action) {
      case 'start_processing': {
        booking.status = 'AGENCY_PROCESSING' as BookingStatus;
        booking.fulfillment!.status = 'IN_PROGRESS';
        booking.fulfillment!.assignedTo = body.assignedTo || 'agent@travelportal.com';
        booking.fulfillment!.startedAt = now;
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: 'Agency started processing booking',
          timestamp: now,
        });
        break;
      }
      case 'supplier_booking_in_progress': {
        booking.status = 'SUPPLIER_BOOKING_IN_PROGRESS' as BookingStatus;
        if (body.supplierName) booking.fulfillment!.supplierName = body.supplierName;
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: `Supplier booking in progress${body.supplierName ? ` via ${body.supplierName}` : ''}`,
          timestamp: now,
        });
        break;
      }
      case 'supplier_confirmed': {
        booking.status = 'SUPPLIER_CONFIRMED' as BookingStatus;
        if (body.supplierReference) booking.fulfillment!.supplierReference = body.supplierReference;
        if (body.pnr) booking.fulfillment!.pnr = body.pnr;
        if (body.ticketNumber) booking.fulfillment!.ticketNumber = body.ticketNumber;
        if (body.hotelConfirmationNumber) booking.fulfillment!.hotelConfirmationNumber = body.hotelConfirmationNumber;
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: `Supplier confirmed${body.pnr ? `. PNR: ${body.pnr}` : ''}${body.hotelConfirmationNumber ? `. Confirmation: ${body.hotelConfirmationNumber}` : ''}`,
          timestamp: now,
        });
        break;
      }
      case 'add_note': {
        const note: FulfillmentNote = {
          id: `note-${Date.now()}`,
          author: body.author || 'agent@travelportal.com',
          text: body.text || '',
          createdAt: now,
        };
        booking.fulfillment!.notes.push(note);
        break;
      }
      case 'upload_document': {
        const doc: BookingDocument = {
          id: `doc-${Date.now()}`,
          bookingId: booking.id,
          type: body.documentType as DocumentType,
          filename: body.filename || 'document.pdf',
          mimeType: body.mimeType || 'application/pdf',
          storagePath: body.storagePath || `/documents/${body.filename || 'document.pdf'}`,
          uploadedBy: body.uploadedBy || 'agent@travelportal.com',
          createdAt: now,
          customerVisible: body.customerVisible ?? false,
          version: booking.documents.length + 1,
        };
        booking.documents.push(doc);
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: 'DOCUMENT_UPLOADED' as BookingStatus,
          description: `Document uploaded: ${doc.filename}`,
          timestamp: now,
        });
        break;
      }
      case 'mark_ticketed': {
        booking.status = 'TICKETED' as BookingStatus;
        booking.fulfillment!.status = 'COMPLETED';
        booking.fulfillment!.completedAt = now;
        if (booking.documents.length > 0) {
          booking.documents[booking.documents.length - 1].customerVisible = true;
        }
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: 'Ticket issued and document made visible to customer',
          timestamp: now,
        });
        break;
      }
      case 'mark_voucher_issued': {
        booking.status = 'VOUCHER_ISSUED' as BookingStatus;
        booking.fulfillment!.status = 'COMPLETED';
        booking.fulfillment!.completedAt = now;
        if (booking.documents.length > 0) {
          booking.documents[booking.documents.length - 1].customerVisible = true;
        }
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: 'Voucher issued and document made visible to customer',
          timestamp: now,
        });
        break;
      }
      case 'send_to_customer': {
        if (booking.documents.length > 0) {
          booking.documents[booking.documents.length - 1].customerVisible = true;
        }
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: 'Document sent to customer',
          timestamp: now,
        });
        break;
      }
      case 'request_customer_action': {
        booking.status = 'CUSTOMER_ACTION_REQUIRED' as BookingStatus;
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: body.message || 'Customer action required',
          timestamp: now,
        });
        break;
      }
      case 'cancel': {
        booking.status = 'CANCELLED' as BookingStatus;
        booking.fulfillment!.status = 'CANCELLED';
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: body.reason || 'Booking cancelled by agency',
          timestamp: now,
        });
        break;
      }
      case 'refund': {
        booking.status = 'REFUND_PROCESSING' as BookingStatus;
        timelineEvents.push({
          id: `evt-${Date.now()}`,
          status: booking.status,
          description: 'Refund processing initiated',
          timestamp: now,
        });
        break;
      }
      default:
        return errorResponse(`Unknown action: ${action}`, 'VALIDATION_ERROR', 400);
    }

    booking.timeline.push(...timelineEvents);
    booking.updatedAt = now;
    booking.fulfillment!.updatedAt = now;

    return successResponse(booking);
  } catch (err) {
    console.error('Fulfillment action error:', err);
    return errorResponse('Something went wrong', 'INTERNAL_ERROR', 500);
  }
}

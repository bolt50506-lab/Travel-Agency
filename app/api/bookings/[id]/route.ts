export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor } from '@/lib/auth/server';

function mapBooking(row: any, notes: any[] = []) {
  const item = Array.isArray(row.booking_items) ? row.booking_items[0] : null;
  const task = Array.isArray(row.fulfillment_tasks) ? row.fulfillment_tasks[0] : row.fulfillment_tasks;
  const metadata = item?.metadata || {};

  const fulfillment = task
    ? {
        id: task.id,
        bookingId: row.id,
        status: String(task.status || 'pending').toUpperCase(),
        assignedTo: task.assigned_to || undefined,
        supplierName: task.supplier_name || undefined,
        supplierReference: task.supplier_reference || undefined,
        pnr: task.pnr || undefined,
        ticketNumber: task.ticket_number || undefined,
        hotelConfirmationNumber: task.hotel_confirmation_number || undefined,
        notes: notes.map((note) => ({
          id: note.id,
          author: note.author_id || '',
          text: note.note,
          createdAt: note.created_at,
        })),
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        startedAt: task.started_at || undefined,
        completedAt: task.completed_at || undefined,
      }
    : undefined;

  return {
    id: row.id,
    reference: row.reference,
    type: row.type,
    status: row.status,
    totalAmount: { amount: Number(row.customer_price || 0), currency: row.currency || 'PKR' },
    supplierCost: { amount: Number(row.supplier_cost || 0), currency: row.currency || 'PKR' },
    margin: { amount: Number(row.agency_margin || 0), currency: row.currency || 'PKR' },
    userId: row.customer_id || '',
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flightDetails: row.type === 'flight' ? metadata : undefined,
    hotelDetails: row.type === 'hotel' ? metadata : undefined,
    fulfillment,
    documents: (row.documents || []).map((doc: any) => ({
      id: doc.id,
      bookingId: row.id,
      type: doc.document_type,
      filename: doc.filename,
      mimeType: doc.mime_type,
      storagePath: doc.storage_path,
      uploadedBy: doc.uploaded_by || '',
      createdAt: doc.created_at,
      customerVisible: Boolean(doc.customer_visible),
      version: Number(doc.version || 1),
    })),
    timeline: (row.booking_status_history || [])
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((event: any) => ({
        id: event.id,
        status: event.status,
        description: event.description || '',
        timestamp: event.created_at,
        metadata: event.metadata || undefined,
      })),
  };
}

async function getBooking(reference: string) {
  return supabaseAdmin
    .from('bookings')
    .select('*,booking_items(*),booking_status_history(*),fulfillment_tasks(*),documents(*)')
    .eq('reference', reference)
    .maybeSingle();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);

    const result = await getBooking(params.id);
    if (result.error) throw result.error;
    if (!result.data) return errorResponse('Booking not found', 'NOT_FOUND', 404);

    if (actor.role === 'customer') {
      const customer = await supabaseAdmin.from('customers').select('id').eq('user_id', actor.id).maybeSingle();
      if (customer.error) throw customer.error;
      if (!customer.data || customer.data.id !== result.data.customer_id) {
        return errorResponse('Booking not found', 'NOT_FOUND', 404);
      }
    }

    const task = Array.isArray(result.data.fulfillment_tasks) ? result.data.fulfillment_tasks[0] : result.data.fulfillment_tasks;
    const notes = task
      ? await supabaseAdmin.from('fulfillment_notes').select('*').eq('fulfillment_task_id', task.id).order('created_at', { ascending: true })
      : { data: [] };

    return successResponse(mapBooking(result.data, notes.data || []));
  } catch (err) {
    console.error('Get booking error:', err);
    return errorResponse('Unable to load booking', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return GET(req, { params });
}

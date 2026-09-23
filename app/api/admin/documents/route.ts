export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { requireAdmin } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';
import { getServerActor } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api';

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor || !['admin', 'agent'].includes(actor.role)) return errorResponse('Staff access required', 'FORBIDDEN', 403);

    const form = await req.formData();
    const bookingId = String(form.get('bookingId') || '');
    const documentType = String(form.get('documentType') || '');
    const customerVisible = String(form.get('customerVisible') || 'false') === 'true';
    const file = form.get('file');

    const allowedTypes = ['AGENCY_CONFIRMATION','AIRLINE_TICKET','AIRLINE_ITINERARY','HOTEL_CONFIRMATION','HOTEL_VOUCHER','PAYMENT_RECEIPT','REFUND_DOCUMENT'];
    if (!bookingId || !allowedTypes.includes(documentType)) return errorResponse('Booking and document type are required', 'VALIDATION_ERROR', 400);
    if (!(file instanceof File)) return errorResponse('A document file is required', 'FILE_REQUIRED', 400);
    if (file.size <= 0 || file.size > MAX_BYTES) return errorResponse('File must be between 1 byte and 15 MB', 'FILE_SIZE_INVALID', 400);
    const extension = ALLOWED[file.type];
    if (!extension) return errorResponse('Only PDF, JPG, PNG or WEBP files are supported', 'FILE_TYPE_INVALID', 400);

    const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').select('id,customer_id,agent_id,reference').eq('id', bookingId).maybeSingle();
    if (bookingError || !booking) return errorResponse('Booking not found', 'NOT_FOUND', 404);

    if (actor.role === 'agent') {
      const agent = await requireAgentRecord(actor.id);
      if (booking.agent_id !== agent.id) return errorResponse('Booking is not assigned to this agent', 'FORBIDDEN', 403);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || `document${extension}`;
    const relativeDir = path.join('data', 'documents', booking.id);
    const absoluteDir = path.join(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });
    const storedName = `${randomUUID()}${extension}`;
    const relativePath = path.join(relativeDir, storedName).replace(/\\/g, '/');
    await writeFile(path.join(absoluteDir, storedName), Buffer.from(await file.arrayBuffer()));

    const { data: document, error } = await supabaseAdmin.from('documents').insert({
      booking_id: booking.id,
      document_type: documentType,
      filename: safeName,
      mime_type: file.type,
      storage_path: relativePath,
      file_size: file.size,
      uploaded_by: actor.id,
      customer_visible: customerVisible,
      is_verified: false,
      current_version: 1,
    }).select('*').single();
    if (error) throw error;

    await supabaseAdmin.from('audit_logs').insert({
      user_id: actor.id,
      action: 'UPLOAD',
      entity_type: 'document',
      entity_id: document.id,
      new_value: { bookingId: booking.id, reference: booking.reference, documentType, filename: safeName, customerVisible },
    });

    return successResponse({ document }, 201);
  } catch (err) {
    console.error('Document upload error:', err);
    return errorResponse('Unable to upload document', 'DOCUMENT_UPLOAD_FAILED', 500);
  }
}

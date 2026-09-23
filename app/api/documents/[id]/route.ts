export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { getServerActor } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const actor = await getServerActor();
    if (!actor) return new Response('Unauthorized', { status: 401 });

    const { data: document, error } = await supabaseAdmin.from('documents').select('*').eq('id', params.id).maybeSingle();
    if (error || !document) return new Response('Document not found', { status: 404 });

    const { data: booking, error: bookingError } = await supabaseAdmin.from('bookings').select('id,customer_id,agent_id').eq('id', document.booking_id).maybeSingle();
    if (bookingError || !booking) return new Response('Document not found', { status: 404 });

    if (actor.role === 'admin') {
      // allowed
    } else if (actor.role === 'agent') {
      const agent = await requireAgentRecord(actor.id);
      if (booking.agent_id !== agent.id) return new Response('Forbidden', { status: 403 });
    } else if (actor.role === 'customer') {
      if (!document.customer_visible) return new Response('Document not found', { status: 404 });
      const { data: customer } = await supabaseAdmin.from('customers').select('id').eq('id', booking.customer_id).eq('user_id', actor.id).maybeSingle();
      if (!customer) return new Response('Document not found', { status: 404 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }

    const file = await readFile(path.join(process.cwd(), document.storage_path));
    return new Response(file, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type || 'application/octet-stream',
        'Content-Length': String(file.byteLength),
        'Content-Disposition': `inline; filename="${String(document.filename).replace(/["\\\r\n]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('Document read error:', err);
    return new Response('Document unavailable', { status: 404 });
  }
}

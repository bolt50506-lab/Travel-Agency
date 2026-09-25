import { NextRequest, NextResponse } from 'next/server';
import { getServerActor } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const search = req.nextUrl.searchParams.get('search')?.trim() || '';

    let query = supabaseAdmin
      .from('customers')
      .select('id,user_id,full_name,email,phone,cnic,passport_number,passport_expiry,nationality,address,city,country,created_by,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,cnic.ilike.%${search}%,passport_number.ilike.%${search}%`);
    }

    const { data: customers, error } = await query;
    if (error) throw error;

    const rows = customers || [];
    const ids = rows.map((customer) => customer.id);
    const bookingsByCustomer = new Map<string, { count: number; total: number }>();

    if (ids.length) {
      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select('customer_id,customer_price')
        .in('customer_id', ids);

      if (bookingsError) throw bookingsError;

      for (const booking of bookings || []) {
        if (!booking.customer_id) continue;
        const current = bookingsByCustomer.get(booking.customer_id) || { count: 0, total: 0 };
        current.count += 1;
        current.total += Number(booking.customer_price || 0);
        bookingsByCustomer.set(booking.customer_id, current);
      }
    }

    return NextResponse.json({
      customers: rows.map((customer) => ({
        ...customer,
        bookingCount: bookingsByCustomer.get(customer.id)?.count || 0,
        bookingTotal: bookingsByCustomer.get(customer.id)?.total || 0,
      })),
      total: rows.length,
    });
  } catch (error) {
    console.error('Admin customers load error:', error);
    return NextResponse.json({ error: 'Unable to load customers' }, { status: 500 });
  }
}

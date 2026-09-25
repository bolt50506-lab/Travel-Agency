import { NextRequest, NextResponse } from 'next/server';
import { getServerActor } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import crypto from 'crypto';
import { sendCustomerCredentialsEmail } from '@/lib/services/email-service';

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


function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384;
  const r = 8;
  const p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

function generateTemporaryPassword() {
  return `Destino-${crypto.randomBytes(4).toString('hex')}`;
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor || actor.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim() || null;

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Full name and a valid email are required' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin.from('local_users').select('id').eq('email', email).maybeSingle();
    if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });

    const password = generateTemporaryPassword();
    const { data: account, error: accountError } = await supabaseAdmin
      .from('local_users')
      .insert({ email, password_hash: hashPassword(password) })
      .select('id,email')
      .single();
    if (accountError || !account) throw accountError || new Error('Unable to create account');

    try {
      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: account.id,
        email,
        full_name: fullName,
        phone,
        role: 'customer',
        is_active: true,
        email_verified_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      const { error: customerError } = await supabaseAdmin.from('customers').insert({
        user_id: account.id,
        full_name: fullName,
        email,
        phone,
        country: 'PK',
        nationality: 'Pakistani',
      });
      if (customerError) throw customerError;

      let emailSent = false;
      try {
        await sendCustomerCredentialsEmail({ email, fullName, password });
        emailSent = true;
      } catch (emailError) {
        console.error('Customer credentials email error:', emailError);
      }

      return NextResponse.json({
        success: true,
        customer: { id: account.id, email, fullName, phone },
        emailSent,
        temporaryPassword: password,
        message: emailSent
          ? 'Customer account created and login credentials sent by email.'
          : 'Customer account created. Email could not be sent, so copy the temporary password and send it to the customer securely.',
      }, { status: 201 });
    } catch (error) {
      await supabaseAdmin.from('customers').delete().eq('user_id', account.id);
      await supabaseAdmin.from('profiles').delete().eq('id', account.id);
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw error;
    }
  } catch (error) {
    console.error('Admin customer create error:', error);
    return NextResponse.json({ error: 'Unable to create customer account' }, { status: 500 });
  }
}

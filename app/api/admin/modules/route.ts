import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

const configs: Record<string, { table: string; fields: string[]; search: string[] }> = {
  bookings: { table: 'bookings', fields: ['reference','type','status','contact_email','contact_phone','customer_price','currency','supplier_name','supplier_reference','notes'], search: ['reference','contact_email','contact_phone','status','type'] },
  customers: { table: 'customers', fields: ['full_name','email','phone','cnic','passport_number','passport_expiry','city'], search: ['full_name','email','phone'] },
  travelers: { table: 'travelers', fields: ['customer_id','first_name','last_name','date_of_birth','passport_number','passport_expiry','nationality'], search: ['first_name','last_name','passport_number'] },
  leads: { table: 'leads', fields: ['name','email','phone','service_type','destination','travel_date','status'], search: ['name','email','phone','destination'] },
  quotations: { table: 'quotations', fields: ['reference','customer_id','title','currency','total','valid_until','status'], search: ['reference','title'] },
  packages: { table: 'packages', fields: ['name','slug','destination','package_type','duration_days','selling_price','currency','description'], search: ['name','destination'] },
  umrah_packages: { table: 'umrah_packages', fields: ['name','makkah_hotel','madinah_hotel','duration_days','room_sharing','price_per_pilgrim','departure_date','return_date','seats'], search: ['name','makkah_hotel','madinah_hotel'] },
  visa_applications: { table: 'visa_applications', fields: ['reference','customer_id','traveler_id','destination','visa_type','entry_type','status','embassy_or_vfs','government_fee','service_fee'], search: ['reference','destination','visa_type'] },
  insurance_products: { table: 'insurance_products', fields: ['name','provider','destination_scope','coverage_summary','supplier_cost','selling_price','currency'], search: ['name','provider'] },
  reissue_requests: { table: 'reissue_requests', fields: ['booking_id','reason','new_travel_date','supplier_penalty','agency_fee','fare_difference','total_due','status'], search: ['booking_id','reason'] },
  b2b_agencies: { table: 'b2b_agencies', fields: ['name','email','phone','city','credit_limit','wallet_balance','commission_rate'], search: ['name','email','phone'] },
  agents: { table: 'agents', fields: ['user_id','agency_id','agent_code','commission_rate','is_active','hired_at'], search: ['agent_code','user_id'] },
  pricing_rules: { table: 'pricing_rules', fields: ['rule_type','scope','scope_value','value','is_active','priority','effective_from','effective_to'], search: ['rule_type','scope','scope_value'] },
  expenses: { table: 'expenses', fields: ['category','description','amount','currency','expense_date'], search: ['category','description'] }
};

function sanitize(body: Record<string, unknown>, fields: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of fields) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') out[key] = body[key];
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const params = new URL(req.url).searchParams;
    const moduleName = params.get('module') || '';
    const cfg = configs[moduleName];
    if (!cfg) return errorResponse('Unknown module', 'MODULE_NOT_FOUND', 404);

    const { data, error } = await supabaseAdmin.from(cfg.table).select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    let rows = data || [];
    const search = (params.get('search') || '').toLowerCase();
    if (search) rows = rows.filter((row: any) => cfg.search.some((key) => String(row[key] ?? '').toLowerCase().includes(search)));

    return successResponse({ module: moduleName, fields: cfg.fields, rows });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') return errorResponse('Admin access required', 'FORBIDDEN', 403);
    console.error(err);
    return errorResponse('Unable to load module', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();
    const cfg = configs[body.module];
    if (!cfg) return errorResponse('Unknown module', 'MODULE_NOT_FOUND', 404);
    const values = sanitize(body.data || {}, cfg.fields);
    if (body.module === 'quotations' && !values.reference) values.reference = 'QT-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data, error } = await supabaseAdmin.from(cfg.table).insert(values).select('*').single();
    if (error) throw error;
    await supabaseAdmin.from('audit_logs').insert({ user_id: actor.id, action: 'CREATE', entity_type: cfg.table, entity_id: data.id, new_value: data });
    return successResponse(data, 201);
  } catch (err) {
    console.error(err);
    return errorResponse('Unable to create record', 'CREATE_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();
    const cfg = configs[body.module];
    if (!cfg || !body.id) return errorResponse('Module and record ID are required', 'VALIDATION_ERROR', 400);
    const values = sanitize(body.data || {}, cfg.fields);
    const { data, error } = await supabaseAdmin.from(cfg.table).update(values).eq('id', body.id).select('*').single();
    if (error) throw error;
    await supabaseAdmin.from('audit_logs').insert({ user_id: actor.id, action: 'UPDATE', entity_type: cfg.table, entity_id: data.id, new_value: data });
    return successResponse(data);
  } catch (err) {
    console.error(err);
    return errorResponse('Unable to update record', 'UPDATE_FAILED', 500);
  }
}

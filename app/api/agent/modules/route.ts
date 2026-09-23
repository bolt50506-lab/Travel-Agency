export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireAgent } from '@/lib/auth/server';
import { requireAgentRecord } from '@/lib/auth/agent';
import { supabaseAdmin } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api';

const configs: Record<string, { table: string; fields: string[] }> = {
  customers: { table: 'customers', fields: ['full_name','email','phone','cnic','passport_number','passport_expiry','nationality','address','city'] },
  travelers: { table: 'travelers', fields: ['customer_id','first_name','last_name','date_of_birth','gender','nationality','cnic','passport_number','passport_expiry','relationship','notes'] },
  quotations: { table: 'quotations', fields: ['reference','customer_id','title','service_type','status','currency','supplier_cost','subtotal','discount','taxes','total','valid_until','notes'] },
  bookings: { table: 'bookings', fields: ['reference','type','status','contact_email','contact_phone','customer_price','currency','supplier_name','supplier_reference','notes','created_at'] },
  payments: { table: 'payments', fields: ['booking_id','reference','method','amount','currency','status','provider_name','provider_transaction_id','created_at'] },
  commissions: { table: 'agent_commissions', fields: ['booking_id','basis_amount','commission_type','commission_rate','commission_amount','currency','status','paid_at','created_at'] },
};

function clean(body: Record<string, unknown>, fields: string[]) {
  const result: Record<string, unknown> = {};
  for (const key of fields) if (body[key] !== undefined && body[key] !== null && body[key] !== '') result[key] = body[key];
  return result;
}

async function bookingIds(agentId: string) {
  const { data, error } = await supabaseAdmin.from('bookings').select('id').eq('agent_id', agentId).limit(1000);
  if (error) throw error;
  return (data || []).map((row: any) => row.id);
}

async function customerIds(userId: string) {
  const { data, error } = await supabaseAdmin.from('customers').select('id').eq('created_by', userId).limit(1000);
  if (error) throw error;
  return (data || []).map((row: any) => row.id);
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireAgent();
    const agent = await requireAgentRecord(actor.id);
    const moduleName = new URL(req.url).searchParams.get('module') || '';
    const cfg = configs[moduleName];
    if (!cfg) return errorResponse('Unknown agent module', 'MODULE_NOT_FOUND', 404);
    let data: any[] = [];

    if (moduleName === 'customers') {
      const result = await supabaseAdmin.from('customers').select('*').eq('created_by', actor.id).order('created_at', { ascending: false }).limit(200);
      if (result.error) throw result.error; data = result.data || [];
    } else if (moduleName === 'travelers') {
      const ids = await customerIds(actor.id);
      if (ids.length) { const result = await supabaseAdmin.from('travelers').select('*').in('customer_id', ids).order('created_at', { ascending: false }).limit(200); if (result.error) throw result.error; data = result.data || []; }
    } else if (moduleName === 'quotations') {
      const result = await supabaseAdmin.from('quotations').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(200);
      if (result.error) throw result.error; data = result.data || [];
    } else if (moduleName === 'bookings') {
      const result = await supabaseAdmin.from('bookings').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(200);
      if (result.error) throw result.error; data = result.data || [];
    } else if (moduleName === 'payments') {
      const ids = await bookingIds(agent.id);
      if (ids.length) { const result = await supabaseAdmin.from('payments').select('*').in('booking_id', ids).order('created_at', { ascending: false }).limit(200); if (result.error) throw result.error; data = result.data || []; }
    } else {
      const result = await supabaseAdmin.from('agent_commissions').select('*').eq('agent_id', agent.id).order('created_at', { ascending: false }).limit(200);
      if (result.error) throw result.error; data = result.data || [];
    }

    const meta: Record<string, unknown> = {};
    if (moduleName === 'travelers' || moduleName === 'quotations') {
      const result = await supabaseAdmin.from('customers').select('id,full_name,email').eq('created_by', actor.id).order('full_name').limit(200);
      if (result.error) throw result.error; meta.customers = result.data || [];
    }
    return successResponse({ module: moduleName, fields: cfg.fields, rows: data, meta });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_AGENT') return errorResponse('Agent access required', 'FORBIDDEN', 403);
    if (err instanceof Error && err.message === 'AGENT_PROFILE_REQUIRED') return errorResponse('Active agent profile required', 'AGENT_PROFILE_REQUIRED', 403);
    console.error(err); return errorResponse('Unable to load agent module', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAgent();
    const agent = await requireAgentRecord(actor.id);
    const body = await req.json();
    const moduleName = String(body.module || '');
    if (!['customers','travelers','quotations'].includes(moduleName)) return errorResponse('This module is read-only for agents', 'READ_ONLY_MODULE', 403);
    const cfg = configs[moduleName];
    const values = clean(body.data || {}, cfg.fields);

    if (moduleName === 'customers') values.created_by = actor.id;
    if (moduleName === 'travelers' || moduleName === 'quotations') {
      if (!values.customer_id) return errorResponse('Customer is required', 'VALIDATION_ERROR', 400);
      const allowed = await supabaseAdmin.from('customers').select('id').eq('id', values.customer_id).eq('created_by', actor.id).maybeSingle();
      if (allowed.error) throw allowed.error;
      if (!allowed.data) return errorResponse('Customer is not assigned to this agent', 'FORBIDDEN', 403);
    }
    if (moduleName === 'quotations') {
      const supplierCost = Number(values.supplier_cost || 0);
      const subtotal = Number(values.subtotal || 0);
      const discount = Number(values.discount || 0);
      const taxes = Number(values.taxes || 0);
      if (![supplierCost, subtotal, discount, taxes].every(Number.isFinite) || supplierCost < 0 || subtotal < 0 || discount < 0 || taxes < 0) {
        return errorResponse('Invalid quotation amounts', 'VALIDATION_ERROR', 400);
      }
      if (subtotal < supplierCost) return errorResponse('Quotation selling price cannot be below supplier cost', 'PRICE_BELOW_COST', 409);
      values.agent_id = agent.id;
      values.reference = values.reference || ('QT-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2,8).toUpperCase());
      values.currency = 'PKR';
      values.service_type = values.service_type || 'flight';
      values.status = values.status || 'DRAFT';
      values.total = Math.max(0, subtotal - discount + taxes);
      values.agency_margin = Math.max(0, Number(values.total) - supplierCost - taxes + discount);
    }
    const result = await supabaseAdmin.from(cfg.table).insert(values).select('*').single();
    if (result.error) throw result.error;
    await supabaseAdmin.from('audit_logs').insert({ user_id: actor.id, action: 'CREATE', entity_type: cfg.table, entity_id: result.data.id, new_value: result.data });
    return successResponse(result.data, 201);
  } catch (err) {
    console.error(err); return errorResponse('Unable to create record', 'CREATE_FAILED', 500);
  }
}

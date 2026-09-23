export const dynamic = 'force-dynamic';

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validateBody } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}


export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search')?.toLowerCase();

    let query = supabaseAdmin.from('profiles').select('id,email,full_name,phone,role,is_active,created_at').order('created_at', { ascending: false });
    if (role && role !== 'all') query = query.eq('role', role);
    const { data, error } = await query;
    if (error) throw error;

    let users = (data || []).map((u: any) => {
      const parts = String(u.full_name || '').trim().split(/\s+/);
      return { id: u.id, email: u.email, role: u.role, firstName: parts[0] || '', lastName: parts.slice(1).join(' '), phone: u.phone || '', isActive: u.is_active !== false, createdAt: u.created_at };
    });
    if (search) users = users.filter((u: any) => [u.email,u.firstName,u.lastName,u.phone].some((v) => String(v || '').toLowerCase().includes(search)));
    return successResponse({ users, total: users.length });
  } catch (err) {
    console.error('Admin users error:', err);
    return errorResponse('Unable to load users', 'USERS_LOAD_FAILED', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const role = String(body.role || 'customer').trim().toLowerCase();
    const phone = String(body.phone || '').trim();

    if (!email || !password || !firstName) return errorResponse('Email, password and first name are required', 'VALIDATION_ERROR', 400);
    if (password.length < 8) return errorResponse('Password must be at least 8 characters', 'VALIDATION_ERROR', 400);
    if (!['admin', 'agent', 'customer'].includes(role)) {
      const { data: customRole } = await supabaseAdmin.from('admin_roles').select('id').eq('name', role).eq('is_active', true).maybeSingle();
      if (!customRole) return errorResponse('Invalid or inactive role', 'VALIDATION_ERROR', 400);
    }
    const commissionRate = Number(body.commissionRate ?? 0);
    if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) return errorResponse('Commission percentage must be between 0 and 100', 'VALIDATION_ERROR', 400);

    const { data: existing } = await supabaseAdmin.from('local_users').select('id').eq('email', email).maybeSingle();
    if (existing) return errorResponse('An account with this email already exists', 'EMAIL_EXISTS', 409);

    const { data: account, error: accountError } = await supabaseAdmin.from('local_users').insert({ email, password_hash: hashPassword(password) }).select('id,email').single();
    if (accountError || !account) throw accountError || new Error('Unable to create account');

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: account.id, email, full_name: [firstName,lastName].filter(Boolean).join(' '), phone: phone || null, role, is_active: true,
    });
    if (profileError) {
      await supabaseAdmin.from('local_users').delete().eq('id', account.id);
      throw profileError;
    }

    if (role === 'agent') {
      let agentCode = String(body.agentCode || '').trim();
      if (!agentCode) agentCode = `AG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const { data: agency } = await supabaseAdmin.from('agencies').select('id').eq('is_active', true).order('created_at', { ascending: true }).limit(1).maybeSingle();
      const { error: agentError } = await supabaseAdmin.from('agents').insert({
        user_id: account.id,
        agency_id: agency?.id || null,
        agent_code: agentCode,
        commission_rate: commissionRate,
        is_active: true,
      });
      if (agentError) {
        await supabaseAdmin.from('profiles').delete().eq('id', account.id);
        await supabaseAdmin.from('local_users').delete().eq('id', account.id);
        throw agentError;
      }
    }

    return successResponse({ id: account.id, email, role }, 201);
  } catch (err) {
    console.error('Admin user create error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Unable to create user: ${message}`, 'USER_CREATE_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.id) return errorResponse('User ID is required', 'VALIDATION_ERROR', 400);

    const profileValues: Record<string, unknown> = {};
    if (body.firstName !== undefined || body.lastName !== undefined) {
      const current = await supabaseAdmin.from('profiles').select('full_name').eq('id', body.id).maybeSingle();
      const currentParts = String(current.data?.full_name || '').trim().split(/\s+/);
      const first = body.firstName !== undefined ? String(body.firstName).trim() : currentParts[0] || '';
      const last = body.lastName !== undefined ? String(body.lastName).trim() : currentParts.slice(1).join(' ');
      profileValues.full_name = [first,last].filter(Boolean).join(' ');
    }
    if (body.phone !== undefined) profileValues.phone = String(body.phone || '') || null;
    if (body.role !== undefined) profileValues.role = String(body.role).trim().toLowerCase();
    if (body.isActive !== undefined) profileValues.is_active = Boolean(body.isActive);
    if (Object.keys(profileValues).length) {
      const { error } = await supabaseAdmin.from('profiles').update(profileValues).eq('id', body.id);
      if (error) throw error;
    }
    if (body.password) {
      if (String(body.password).length < 8) return errorResponse('Password must be at least 8 characters', 'VALIDATION_ERROR', 400);
      const { error } = await supabaseAdmin.from('local_users').update({ password_hash: hashPassword(String(body.password)) }).eq('id', body.id);
      if (error) throw error;
    }
    const normalizedRole = body.role !== undefined ? String(body.role).trim().toLowerCase() : undefined;
    if (normalizedRole && !['admin', 'agent', 'customer'].includes(normalizedRole)) {
      const { data: customRole } = await supabaseAdmin.from('admin_roles').select('id').eq('name', normalizedRole).eq('is_active', true).maybeSingle();
      if (!customRole) return errorResponse('Invalid or inactive role', 'VALIDATION_ERROR', 400);
    }
    if (body.commissionRate !== undefined) {
      const rate = Number(body.commissionRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) return errorResponse('Commission percentage must be between 0 and 100', 'VALIDATION_ERROR', 400);
    }
    if (normalizedRole === 'agent') {
      const existing = await supabaseAdmin.from('agents').select('id').eq('user_id', body.id).maybeSingle();
      if (!existing.data) {
        const { error } = await supabaseAdmin.from('agents').insert({
          user_id: body.id,
          agent_code: String(body.agentCode || ('AG-' + Math.random().toString(36).slice(2, 8).toUpperCase())),
          commission_rate: Number(body.commissionRate || 0),
          is_active: body.isActive !== false,
        });
        if (error) throw error;
      } else {
        const values: Record<string, unknown> = {};
        if (body.commissionRate !== undefined) values.commission_rate = Number(body.commissionRate);
        if (body.isActive !== undefined) values.is_active = Boolean(body.isActive);
        if (Object.keys(values).length) await supabaseAdmin.from('agents').update(values).eq('id', existing.data.id);
      }
    }
    return successResponse({ saved: true });
  } catch (err) {
    console.error('Admin user update error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(`Unable to update user: ${message}`, 'USER_UPDATE_FAILED', 500);
  }
}

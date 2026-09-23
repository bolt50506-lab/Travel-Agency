import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabaseAdmin.from('admin_roles').select('*').order('name');
    if (error) {
      console.error('Admin roles table unavailable:', error);
      return successResponse({ roles: [
        { id: 'builtin-admin', name: 'admin', description: 'Full system administrator', is_active: true },
        { id: 'builtin-agent', name: 'agent', description: 'Travel agent', is_active: true },
        { id: 'builtin-customer', name: 'customer', description: 'Customer', is_active: true },
      ] });
    }
    const existing = data || [];
    const builtins = [
      { id: 'builtin-admin', name: 'admin', description: 'Full system administrator', is_active: true },
      { id: 'builtin-agent', name: 'agent', description: 'Travel agent', is_active: true },
      { id: 'builtin-customer', name: 'customer', description: 'Customer', is_active: true },
    ];
    return successResponse({ roles: [...builtins, ...existing.filter((r: any) => !['admin','agent','customer'].includes(r.name))] });
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required. Please sign in with an active admin account.', 'FORBIDDEN', 403);
    }
    console.error(err);
    return errorResponse('Unable to load roles', 'ROLES_LOAD_FAILED', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = String(body.name || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return errorResponse('Role name is required', 'VALIDATION_ERROR', 400);
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) return errorResponse('Role name may contain letters, numbers, underscores and hyphens', 'VALIDATION_ERROR', 400);

    const { data, error } = await supabaseAdmin.from('admin_roles').insert({
      name,
      description: body.description || null,
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
      is_active: body.is_active !== false,
    }).select('*').single();
    if (error) throw error;
    return successResponse(data, 201);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required. Please sign in with an active admin account.', 'FORBIDDEN', 403);
    }
    console.error(err);
    return errorResponse('Unable to create role', 'ROLE_CREATE_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    if (!body.id) return errorResponse('Role ID is required', 'VALIDATION_ERROR', 400);
    const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) values.name = String(body.name).trim().toLowerCase().replace(/\s+/g, '_');
    if (body.description !== undefined) values.description = body.description || null;
    if (body.permissions !== undefined) values.permissions = Array.isArray(body.permissions) ? body.permissions : [];
    if (body.is_active !== undefined) values.is_active = Boolean(body.is_active);

    const { data, error } = await supabaseAdmin.from('admin_roles').update(values).eq('id', body.id).select('*').single();
    if (error) throw error;
    return successResponse(data);
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED_ADMIN') {
      return errorResponse('Admin access required. Please sign in with an active admin account.', 'FORBIDDEN', 403);
    }
    console.error(err);
    return errorResponse('Unable to update role', 'ROLE_UPDATE_FAILED', 500);
  }
}

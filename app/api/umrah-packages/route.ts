export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    let query = supabaseAdmin
      .from('umrah_packages')
      .select('*')
      .eq('is_active', true)
      .order('departure_date', { ascending: true, nullsFirst: false })
      .order('price_per_pilgrim', { ascending: true });

    if (id) query = query.eq('id', id);
    if (slug) query = query.eq('name', slug.replaceAll('-', ' '));

    const { data, error } = await query;
    if (error) throw error;

    return successResponse({ packages: data || [] });
  } catch (error) {
    console.error('Umrah packages GET error:', error);
    return errorResponse('Unable to load Umrah packages', 'UMRAH_PACKAGES_LOAD_FAILED', 500);
  }
}
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function GET() {
  try {
    await requireAdmin();
    const { data, error } = await supabaseAdmin.from('app_settings').select('*').order('key');
    if (error) throw error;
    const settings: Record<string, any> = {};
    for (const row of data || []) settings[row.key] = row.value || {};
    return successResponse({ settings });
  } catch (err) {
    console.error(err);
    return errorResponse('Unable to load settings', 'SETTINGS_LOAD_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const updates = body.settings || {};
    for (const [key, value] of Object.entries(updates)) {
      if (!['agency', 'booking', 'notifications'].includes(key)) continue;
      const { error } = await supabaseAdmin.from('app_settings').upsert({
        key,
        value: value && typeof value === 'object' ? value : {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      if (error) throw error;
    }
    return successResponse({ saved: true });
  } catch (err) {
    console.error(err);
    return errorResponse('Unable to save settings', 'SETTINGS_SAVE_FAILED', 500);
  }
}

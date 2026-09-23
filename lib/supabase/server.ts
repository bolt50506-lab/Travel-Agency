import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.invalid';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'build-placeholder-key';

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

export async function getUserFromAccessToken(token?: string | null) {
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

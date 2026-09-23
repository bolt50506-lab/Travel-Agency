import { cookies } from 'next/headers';
import { supabaseAdmin, getUserFromAccessToken } from '@/lib/supabase/server';

export type ServerActor = {
  id: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  profile: Record<string, unknown> | null;
};

export async function getServerActor(): Promise<ServerActor | null> {
  const token = cookies().get('voyago_access_token')?.value;
  const user = await getUserFromAccessToken(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role || user.app_metadata?.role || 'customer') as ServerActor['role'];
  return { id: user.id, email: user.email || '', role, profile };
}

export async function requireStaff() {
  const actor = await getServerActor();
  if (!actor || !['admin', 'agent'].includes(actor.role)) {
    throw new Error('UNAUTHORIZED_STAFF');
  }
  return actor;
}

export async function requireAdmin() {
  const actor = await getServerActor();
  if (!actor || actor.role !== 'admin') {
    throw new Error('UNAUTHORIZED_ADMIN');
  }
  return actor;
}

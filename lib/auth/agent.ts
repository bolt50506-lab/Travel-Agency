import { supabaseAdmin } from '@/lib/supabase/server';

export async function getAgentRecord(userId: string) {
  const { data, error } = await supabaseAdmin.from('agents').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function requireAgentRecord(userId: string) {
  const agent = await getAgentRecord(userId);
  if (!agent || agent.is_active === false) throw new Error('AGENT_PROFILE_REQUIRED');
  return agent;
}

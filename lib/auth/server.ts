import crypto from 'crypto';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/server';

export type ServerActor = {
  id: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  profile: Record<string, unknown> | null;
};

type SessionPayload = {
  sub: string;
  email: string;
  role: ServerActor['role'];
  exp: number;
};

function secret() {
  const value = process.env.LOCAL_AUTH_SECRET || process.env.POSTGREST_JWT_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === 'production') throw new Error('LOCAL_AUTH_SECRET is required in production');
    return 'build-placeholder-secret-that-is-long-enough';
  }
  if (value.length < 32) throw new Error('LOCAL_AUTH_SECRET must be at least 32 characters');
  return value;
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(input: string) {
  return crypto.createHmac('sha256', secret()).update(input).digest('base64url');
}

export function createSessionToken(actor: Pick<ServerActor, 'id' | 'email' | 'role'>) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: actor.id,
    email: actor.email,
    role: actor.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  } satisfies SessionPayload);
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = sign(unsigned);
  const a = Buffer.from(parts[2]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.role || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getServerActor(): Promise<ServerActor | null> {
  const token = cookies().get('voyago_access_token')?.value;
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  // The email in the signed session is the login identity. Resolve the
  // current profile by email first so an old/stale token cannot accidentally
  // authorize against a different profile that happens to have the same
  // session subject in an older self-hosted database.
  let { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', session.email.trim().toLowerCase())
    .maybeSingle();

  // Backward-compatible fallback for databases where the profile email was
  // not normalized but the profile ID still matches the local account.
  if ((error || !profile) && session.sub) {
    const byId = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', session.sub)
      .maybeSingle();

    if (!byId.error && byId.data) {
      profile = byId.data;
      error = null;
    }
  }

  if (error || !profile || profile.is_active === false) return null;

  // Never authorize if the resolved profile belongs to a different identity.
  const profileEmail = String(profile.email || '').trim().toLowerCase();
  const sessionEmail = session.email.trim().toLowerCase();
  if (!profileEmail || profileEmail !== sessionEmail) return null;

  const normalizedRole = String(profile.role || '').trim().toLowerCase();
  if (!['customer', 'agent', 'admin'].includes(normalizedRole)) return null;

  return {
    id: String(profile.id || session.sub),
    email: profileEmail,
    role: normalizedRole as ServerActor['role'],
    profile,
  };
}
export async function requireStaff() {
  const actor = await getServerActor();
  if (!actor || !['admin', 'agent'].includes(actor.role)) throw new Error('UNAUTHORIZED_STAFF');
  return actor;
}

export async function requireAdmin() {
  const actor = await getServerActor();
  if (!actor || actor.role !== 'admin') throw new Error('UNAUTHORIZED_ADMIN');
  return actor;
}

export async function requireAgent() {
  const actor = await getServerActor();
  if (!actor || actor.role !== 'agent') throw new Error('UNAUTHORIZED_AGENT');
  return actor;
}



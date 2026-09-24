import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
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

  try {
    const actual = Buffer.from(parts[2]);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || !payload.email || !payload.role || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!['customer', 'agent', 'admin'].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

function readCookieHeader(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator);
    if (key !== name) continue;

    const rawValue = trimmed.slice(separator + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }

  return null;
}

function readSessionToken() {
  // Prefer the raw request Cookie header. This avoids differences between
  // Next.js cookie parsing in Node/standalone builds and the login response.
  const rawHeaderToken = readCookieHeader(headers().get('cookie'), 'voyago_access_token');
  if (rawHeaderToken) return rawHeaderToken;

  return cookies().get('voyago_access_token')?.value || null;
}

export async function getServerActor(): Promise<ServerActor | null> {
  const token = readSessionToken();
  if (!token) return null;

  const session = verifySessionToken(token);
  if (!session) return null;

  // Resolve by the immutable account id first. If a legacy/self-hosted
  // deployment has a profile whose id is not aligned with local_users,
  // resolve by normalized email as a safe fallback.
  const byId = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', session.sub)
    .maybeSingle();

  let profile = byId.data;
  let profileError = byId.error;

  if (!profile && !profileError) {
    const byEmail = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', session.email.toLowerCase())
      .maybeSingle();

    profile = byEmail.data;
    profileError = byEmail.error;
  }

  if (profileError || !profile || profile.is_active === false) return null;

  const role = profile.role;
  if (!['customer', 'agent', 'admin'].includes(role)) return null;

  return {
    id: profile.id || session.sub,
    email: profile.email || session.email,
    role,
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

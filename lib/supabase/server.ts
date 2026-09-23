import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const postgrestUrl = process.env.POSTGREST_URL || 'http://127.0.0.1:3001';
const jwtSecret = process.env.POSTGREST_JWT_SECRET || 'build-placeholder-secret-that-is-long-enough';

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function createServiceJwt() {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    role: 'service_role',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
  }));
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

/**
 * Compatibility name retained so the existing API/service layer can use the
 * Supabase query-builder syntax while talking to self-hosted PostgreSQL through
 * local PostgREST. No Supabase Cloud endpoint or service-role key is used.
 */
export const supabaseAdmin = createClient(postgrestUrl, createServiceJwt(), {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export function getPostgrestUrl() {
  return postgrestUrl;
}

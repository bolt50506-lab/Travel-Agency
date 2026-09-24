const crypto = require('crypto');
const readline = require('readline');

const baseUrl = process.env.POSTGREST_URL || 'http://127.0.0.1:3002';
const secret = process.env.POSTGREST_JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error('POSTGREST_JWT_SECRET must be set and at least 32 characters long.');
  process.exit(1);
}

function b64(value) { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
function serviceJwt() {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ role: 'service_role', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 365*24*60*60 });
  const u = h + '.' + p;
  return u + '.' + crypto.createHmac('sha256', secret).update(u).digest('base64url');
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const N = 16384, r = 8, p = 1;
  const hash = crypto.scryptSync(password, salt, 64, { N, r, p }).toString('base64url');
  return ['scrypt', N, r, p, salt, hash].join('$');
}
function ask(rl, question, hidden = false) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}
async function api(path, options = {}) {
  const response = await fetch(baseUrl + path, {
    ...options,
    headers: {
      apikey: serviceJwt(),
      Authorization: 'Bearer ' + serviceJwt(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = (process.env.ADMIN_EMAIL || await ask(rl, 'Admin email: ')).trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || await ask(rl, 'Admin password: ');
    const fullName = (process.env.ADMIN_FULL_NAME || await ask(rl, 'Admin full name: ')).trim();
    if (!email || !password || !fullName) throw new Error('Email, password and full name are required.');

    // Repair the built-in application roles before creating the first admin.
    // This is safe on an existing database and does not delete bookings or users.
    for (const role of [
      { name: 'admin', description: 'Full system administrator' },
      { name: 'agent', description: 'Travel agent' },
      { name: 'customer', description: 'Customer' },
    ]) {
      const existingRole = await api('/roles?select=id&name=eq.' + encodeURIComponent(role.name));
      if (!Array.isArray(existingRole) || existingRole.length === 0) {
        await api('/roles', { method: 'POST', body: JSON.stringify(role) });
      }
    }

    const builtInAdminRole = await api('/admin_roles?select=id&name=eq.admin');
    if (!Array.isArray(builtInAdminRole) || builtInAdminRole.length === 0) {
      await api('/admin_roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'admin',
          description: 'Full system administration access',
          permissions: ['*'],
          is_active: true,
        }),
      });
    }

    const existing = await api('/local_users?select=id&email=eq.' + encodeURIComponent(email));
    if (Array.isArray(existing) && existing.length) throw new Error('An account with this email already exists.');

    const users = await api('/local_users', { method: 'POST', body: JSON.stringify({ email, password_hash: hashPassword(password) }) });
    const user = Array.isArray(users) ? users[0] : users;
    await api('/profiles', { method: 'POST', body: JSON.stringify({ id: user.id, email, full_name: fullName, role: 'admin', is_active: true }) });
    console.log('Admin account created successfully:', email);
  } catch (error) {
    console.error('Unable to create admin:', error.message || error);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
})();
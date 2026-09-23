const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

const root = path.resolve(__dirname, '..');
const env = { ...loadEnv(path.join(root, '.env.local')), ...process.env };
const base = (env.POSTGREST_URL || 'http://127.0.0.1:3002').replace(/\/$/, '');
const secret = env.POSTGREST_JWT_SECRET || '';
if (secret.length < 32) {
  console.error('POSTGREST_JWT_SECRET must be present and at least 32 characters.');
  process.exit(1);
}

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function token() {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ role: 'service_role', exp: Math.floor(Date.now() / 1000) + 300 });
  const unsigned = header + '.' + payload;
  const signature = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
}

const tables = [
  'local_users','profiles','agencies','agents','customers','travelers',
  'leads','followups','quotations','quotation_items','bookings','booking_items',
  'booking_status_history','fulfillment_tasks','payments','payment_transactions',
  'payment_proofs','refunds','refund_transactions','pricing_rules','providers',
  'provider_credentials','provider_settings','documents','document_versions',
  'notifications','audit_logs','system_settings','feature_flags','agent_commissions',
  'supplier_payables','expenses','accounting_entries','packages','umrah_packages',
  'umrah_bookings','umrah_pilgrims','hajj_packages','visa_applications',
  'visa_documents','insurance_products','insurance_policies','reissue_requests',
  'b2b_agencies'
];

(async () => {
  const headers = { Authorization: 'Bearer ' + token(), Accept: 'application/json' };
  const health = await fetch(base + '/local_users?select=id&limit=1', { headers });
  if (!health.ok) throw new Error('PostgREST health check failed: HTTP ' + health.status);
  const failures = [];
  for (const table of tables) {
    const response = await fetch(base + '/' + table + '?select=*&limit=1', { headers });
    if (!response.ok) failures.push(table + ' (HTTP ' + response.status + ')');
  }
  if (failures.length) throw new Error('Database verification failed for: ' + failures.join(', '));
  console.log('Self-hosted database verification passed.');
  console.log('PostgREST: ' + base);
  console.log('Verified tables: ' + tables.length);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

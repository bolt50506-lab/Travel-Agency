const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const root = path.resolve(__dirname, '..');
const envLocalPath = path.join(root, '.env.local');
const envPath = path.join(root, '.env');

const PROJECT_URL = 'https://nduynlamswyozeydvbpy.supabase.co';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const values = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?
/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

function quote(value) {
  return JSON.stringify(String(value));
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const current = {
    ...parseEnvFile(envPath),
    ...parseEnvFile(envLocalPath),
  };

  let serviceKey = current.SUPABASE_SERVICE_ROLE_KEY;
  let duffelKey = current.DUFFEL_API_KEY;
  if (!serviceKey || /^(replace-with|YOUR_)/i.test(serviceKey)) {
    console.log('');
    console.log('Voyago hosted Supabase setup');
    console.log('Project: ' + PROJECT_URL);
    console.log('');
    serviceKey = await prompt('Paste the Supabase service_role key (stored only in .env.local): ');
  }

  if (!serviceKey) {
    console.error('A Supabase service_role key is required for this server-only custom-auth application.');
    process.exit(1);
  }

  const localAuthSecret =
    current.LOCAL_AUTH_SECRET &&
    current.LOCAL_AUTH_SECRET.length >= 32 &&
    !/^(replace-with|YOUR_)/i.test(current.LOCAL_AUTH_SECRET)
      ? current.LOCAL_AUTH_SECRET
      : crypto.randomBytes(32).toString('base64url');

  const lines = [
    '# Auto-managed by npm run dev:hosted. Do not commit this file.',
    'NEXT_PUBLIC_SUPABASE_URL=' + quote(PROJECT_URL),
    'SUPABASE_SERVICE_ROLE_KEY=' + quote(serviceKey),
    'POSTGREST_URL=',
    'POSTGREST_JWT_SECRET=',
    'LOCAL_AUTH_SECRET=' + quote(localAuthSecret),
    'NEXT_PUBLIC_APP_URL=' + quote(current.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    'FLIGHT_PROVIDER=' + quote(current.FLIGHT_PROVIDER || 'duffel'),
    'ALLOW_MOCK_PROVIDERS=false',
    'DUFFEL_API_KEY=' + quote(duffelKey),
    'HOTEL_PROVIDER=' + quote(current.HOTEL_PROVIDER || 'mock'),
    'PAYMENT_PROVIDER=' + quote(current.PAYMENT_PROVIDER || 'manual'),
    'PAYMENT_CURRENCY=' + quote(current.PAYMENT_CURRENCY || 'PKR'),
    'EMAIL_PROVIDER=' + quote(current.EMAIL_PROVIDER || 'mock'),
  ];

  const optionalKeys = [
    'DUFFEL_API_KEY',
    'AMADEUS_CLIENT_ID',
    'AMADEUS_CLIENT_SECRET',
    'TRAVELPORT_CLIENT_ID',
    'TRAVELPORT_CLIENT_SECRET',
    'DUFFEL_STAYS_API_KEY',
    'HOTELBEDS_API_KEY',
    'HOTELBEDS_SECRET',
    'EXPEDIA_API_KEY',
    'EXPEDIA_SECRET',
    'BANK_ACCOUNT_TITLE',
    'BANK_ACCOUNT_NUMBER',
    'BANK_IBAN',
    'BANK_NAME',
    'RAAST_ID',
    'JAZZCASH_NUMBER',
    'EASYPAISA_NUMBER',
    'EMAIL_API_KEY',
    'WHATSAPP_API_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
  ];

  for (const key of optionalKeys) {
    if (current[key] !== undefined) lines.push(key + '=' + quote(current[key]));
  }

  fs.writeFileSync(envLocalPath, lines.join('
') + '
', { encoding: 'utf8', mode: 0o600 });

  console.log('');
  console.log('Hosted Supabase configuration is ready.');
  console.log('Using: ' + PROJECT_URL);
  console.log('Saved credentials to .env.local (ignored by Git).');
  console.log('Starting Next.js...');
  console.log('');
}

main().catch((error) => {
  console.error('Hosted Supabase setup failed:', error.message);
  process.exit(1);
});

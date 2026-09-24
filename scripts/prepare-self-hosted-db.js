const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const outputDir = path.join(root, 'self-hosted');
const outputFile = path.join(outputDir, 'schema.sql');

const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();


function rewriteSelfHostedBootstrapConflicts(sql) {
  let out = sql;

  // The self-hosted demo bootstrap must remain idempotent even when an existing
  // database was created before user_id uniqueness was introduced. Avoid relying
  // on ON CONFLICT(user_id), which requires a unique/exclusion constraint.
  out = out.replace(
    /INSERT INTO public\.agents \(user_id, agent_code, commission_rate, is_active\)\s*VALUES \(agent_id, 'AG-DEMO01', 0, true\)\s*ON CONFLICT \(user_id\) DO UPDATE SET is_active = true\s*;/gis,
    `UPDATE public.agents
  SET is_active = true, user_id = agent_id
  WHERE user_id = agent_id OR agent_code = 'AG-DEMO01';

  IF NOT FOUND THEN
    INSERT INTO public.agents (user_id, agent_code, commission_rate, is_active)
    VALUES (agent_id, 'AG-DEMO01', 0, true);
  END IF;`
  );

  out = out.replace(
    /INSERT INTO public\.customers \(user_id, full_name, email, country, nationality\)\s*VALUES \(customer_id, 'John Smith', 'john\.smith@example\.com', 'PK', 'Pakistani'\)\s*ON CONFLICT \(user_id\) DO UPDATE SET email = EXCLUDED\.email\s*;/gis,
    `UPDATE public.customers
  SET email = 'john.smith@example.com',
      full_name = 'John Smith',
      country = 'PK',
      nationality = 'Pakistani',
      user_id = customer_id
  WHERE user_id = customer_id OR email = 'john.smith@example.com';

  IF NOT FOUND THEN
    INSERT INTO public.customers (user_id, full_name, email, country, nationality)
    VALUES (customer_id, 'John Smith', 'john.smith@example.com', 'PK', 'Pakistani');
  END IF;`
  );

  return out;
}

function stripSupabaseOnlySql(sql) {
  let out = sql;
  // Remove whole Supabase-only DO blocks before stripping policy/storage statements.
  // Doing this first prevents regex removal from leaving half of a PL/pgSQL block behind.
  out = out.replace(/DO\s+\$\$[\s\S]*?END\s+\$\$\s*;/gi, (block) =>
    /POLICY|storage\.objects/i.test(block) ? '' : block
  );
  out = out.replace(/REFERENCES\s+auth\.users\s*\(id\)/gi, 'REFERENCES local_users(id)');
  out = out.replace(/ALTER TABLE\s+[^;]+?\s+ENABLE ROW LEVEL SECURITY\s*;/gis, '');
  out = out.replace(/DROP POLICY IF EXISTS[\s\S]*?;/gi, '');
  out = out.replace(/CREATE POLICY[\s\S]*?;/gi, '');
  out = out.replace(/INSERT INTO\s+storage\.buckets[\s\S]*?;/gi, '');
  out = out.replace(/UPDATE\s+storage\.[\s\S]*?;/gi, '');
  out = out.replace(/DELETE FROM\s+storage\.[\s\S]*?;/gi, '');
  return out;
}

const header = [
  '-- GENERATED SELF-HOSTED DATABASE SCHEMA',
  '-- Generated from the existing travel-agency migrations.',
  '-- Do not edit manually. Run: npm.cmd run selfhost:prepare',
  '',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  '',
  'CREATE TABLE IF NOT EXISTS local_users (',
  '  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),',
  '  email text UNIQUE NOT NULL,',
  '  password_hash text NOT NULL,',
  '  created_at timestamptz NOT NULL DEFAULT now(),',
  '  updated_at timestamptz NOT NULL DEFAULT now(),',
  '  last_login_at timestamptz',
  ');',
  '',
  'CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(lower(email));',
  '',
  'CREATE OR REPLACE FUNCTION update_updated_at_column()',
  'RETURNS TRIGGER AS $$',
  'BEGIN',
  '  NEW.updated_at = now();',
  '  RETURN NEW;',
  'END;',
  '$$ LANGUAGE plpgsql;',
  ''
].join('\n');

let body = '';
for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  body += '\n-- ===== ' + file + ' =====\n' + rewriteSelfHostedBootstrapConflicts(stripSupabaseOnlySql(sql)) + '\n';
}

const security = [
  '-- Self-hosted PostgREST permissions.',
  'GRANT anon TO authenticator;',
  'GRANT service_role TO authenticator;',
  'GRANT USAGE ON SCHEMA public TO anon, service_role;',
  'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;',
  'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;',
  'GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;',
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;',
  'GRANT SELECT ON packages, umrah_packages, insurance_products TO anon;',
  "NOTIFY pgrst, 'reload schema';",
  ''
].join('\n');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, header + body + security, 'utf8');
console.log('Generated ' + outputFile);
console.log('Migrations included: ' + files.join(', '));

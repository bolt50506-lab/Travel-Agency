const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const outputDir = path.join(root, 'self-hosted');
const outputFile = path.join(outputDir, 'schema.sql');

const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();

function stripSupabaseOnlySql(sql) {
  let out = sql;
  out = out.replace(/REFERENCES\s+auth\.users\s*\(id\)/gi, 'REFERENCES local_users(id)');
  out = out.replace(/ALTER TABLE\s+[^;]+?\s+ENABLE ROW LEVEL SECURITY\s*;/gis, '');
  out = out.replace(/DROP POLICY IF EXISTS[\s\S]*?;/gi, '');
  out = out.replace(/CREATE POLICY[\s\S]*?;/gi, '');
  out = out.replace(/DO\s+\$\$[\s\S]*?END\s+\$\$\s*;/gi, (block) => /POLICY|storage\.objects/i.test(block) ? '' : block);
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
  body += '\n-- ===== ' + file + ' =====\n' + stripSupabaseOnlySql(sql) + '\n';
}

const security = [
  '-- Self-hosted PostgREST roles.',
  'DO $$',
  'BEGIN',
  "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN",
  "    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'change-this-postgrest-password';",
  '  END IF;',
  "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN",
  '    CREATE ROLE anon NOLOGIN;',
  '  END IF;',
  "  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN",
  '    CREATE ROLE service_role NOLOGIN;',
  '  END IF;',
  'END $$;',
  '',
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
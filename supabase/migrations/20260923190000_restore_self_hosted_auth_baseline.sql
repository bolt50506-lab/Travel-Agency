-- Restore a usable self-hosted local-auth baseline when the user/profile tables were emptied.
-- This migration is idempotent and only creates the demo accounts when no profiles exist.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.local_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_local_users_email_lower ON public.local_users (lower(email));

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.roles (name, description) VALUES
  ('admin', 'Full system administrator with all permissions'),
  ('agent', 'Travel agent who processes bookings and fulfillment'),
  ('customer', 'Customer who searches and books travel')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.admin_roles (name, description, permissions)
VALUES
  ('admin', 'Full system administration access', '[ "*" ]'::jsonb),
  ('agent', 'Agent portal and booking operations', '[ "bookings:create", "bookings:view", "customers:view" ]'::jsonb),
  ('customer', 'Customer portal access', '[ "bookings:view_own", "bookings:create" ]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- If the profile table is present but empty, restore the documented demo accounts.
-- Passwords are the existing documented demo credentials in README.md.
DO $$
DECLARE
  admin_id uuid := '11111111-1111-4111-8111-111111111111';
  agent_id uuid := '22222222-2222-4222-8222-222222222222';
  customer_id uuid := '33333333-3333-4333-8333-333333333333';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND is_active = true) THEN
    INSERT INTO public.local_users (id, email, password_hash)
    VALUES
      (admin_id, 'admin@travelportal.com', 'scrypt$16384$8$1$s5m_jjoMC1KIbeE59io1vA$s1BTjoevezD4pjUqu5s-nnp7klQg3TUqb1dhvEcKiEJcorcyrHwKQmqy76ov3uCIQAeDX-65Zbw0Bu0YXrnFbQ'),
      (agent_id, 'agent@travelportal.com', 'scrypt$16384$8$1$KCfMgFuwwXnpr-3SyfcNtA$ObWryGFsNBMNRtM4CU0Ca3pQIyo0nb9C07AHA3peOfN8MdSVdZJEaVnF68uV6UJQv58Tp7TmLuJZf6OKO-TjFA'),
      (customer_id, 'john.smith@example.com', 'scrypt$16384$8$1$xiOZ8Ds_zn_JFdBsV_DAqA$1PHp0eEoFHy9QmiTfAlJIWzW6mSzeN9wLxV1Z8kV8CqQNdKu9IoG8ldkCXbLKwn_MI5RyQ3zKyz3YJqIDA39FQ')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      updated_at = now();

    INSERT INTO public.profiles (id, email, full_name, phone, role, is_active)
    VALUES
      (admin_id, 'admin@travelportal.com', 'Destino Administrator', null, 'admin', true),
      (agent_id, 'agent@travelportal.com', 'Destino Agent', null, 'agent', true),
      (customer_id, 'john.smith@example.com', 'John Smith', null, 'customer', true)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_active = true,
      updated_at = now();

    INSERT INTO public.agents (user_id, agent_code, commission_rate, is_active)
    VALUES (agent_id, 'AG-DEMO01', 0, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.customers (user_id, full_name, email, country, nationality)
    VALUES (customer_id, 'John Smith', 'john.smith@example.com', 'PK', 'Pakistani')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

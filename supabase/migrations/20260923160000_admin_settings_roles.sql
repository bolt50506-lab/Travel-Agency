create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.admin_roles (name, description, permissions)
values
  ('admin', 'Full system administration access', '["*"]'::jsonb),
  ('agent', 'Agent portal and booking operations', '["bookings:create","bookings:view","customers:view"]'::jsonb),
  ('customer', 'Customer portal access', '["bookings:view_own","bookings:create"]'::jsonb)
on conflict (name) do nothing;

insert into public.app_settings (key, value)
values
  ('agency', '{"name":"Destino Travels","email":"","phone":"","address":"","city":"Islamabad","country":"Pakistan","currency":"PKR"}'::jsonb),
  ('booking', '{"require_payment_before_fulfillment":true,"automatic_supplier_booking":false,"default_markup_percent":12,"default_commission_percent":0}'::jsonb),
  ('notifications', '{"email_booking_received":true,"email_payment_received":true,"email_booking_confirmed":true}'::jsonb)
on conflict (key) do nothing;

create index if not exists idx_admin_roles_active on public.admin_roles(is_active);

alter table public.admin_roles enable row level security;
alter table public.app_settings enable row level security;

create policy "service role manages admin roles" on public.admin_roles
  for all to service_role using (true) with check (true);

create policy "service role manages app settings" on public.app_settings
  for all to service_role using (true) with check (true);

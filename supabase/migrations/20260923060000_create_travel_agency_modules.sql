/*
  Production travel-agency modules.
  Customer checkout creates an internal agency order.
  External supplier booking remains OFF by default.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE visa_application_status AS ENUM (
    'DOCUMENTS_REQUIRED','UNDER_REVIEW','READY_TO_SUBMIT','SUBMITTED',
    'PROCESSING','APPROVED','REJECTED','COMPLETED','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM ('DRAFT','SENT','VIEWED','APPROVED','EXPIRED','CONVERTED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('NEW','CONTACTED','QUALIFIED','QUOTED','WON','LOST');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reissue_status AS ENUM ('REQUESTED','UNDER_REVIEW','QUOTED','APPROVED','PROCESSING','COMPLETED','REJECTED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS travelers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text,
  nationality text DEFAULT 'Pakistani',
  cnic text,
  passport_number text,
  passport_expiry date,
  relationship text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  source text,
  name text NOT NULL,
  email text,
  phone text,
  service_type text,
  destination text,
  travel_date date,
  budget numeric(12,2),
  currency text DEFAULT 'PKR',
  status lead_status NOT NULL DEFAULT 'NEW',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  assigned_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  due_at timestamptz NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  subject text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  status quotation_status NOT NULL DEFAULT 'DRAFT',
  currency text NOT NULL DEFAULT 'PKR',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  taxes numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  valid_until date,
  title text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  description text NOT NULL,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  destination text NOT NULL,
  package_type text NOT NULL DEFAULT 'custom',
  description text,
  duration_days integer,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  inclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  exclusions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  title text NOT NULL,
  description text,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS umrah_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  name text NOT NULL,
  makkah_hotel text,
  madinah_hotel text,
  transport text,
  visa_included boolean NOT NULL DEFAULT false,
  flights_included boolean NOT NULL DEFAULT false,
  ziyarat_included boolean NOT NULL DEFAULT false,
  duration_days integer,
  room_sharing text,
  price_per_pilgrim numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  departure_date date,
  return_date date,
  seats integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS umrah_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  package_id uuid REFERENCES umrah_packages(id) ON DELETE SET NULL,
  group_reference text,
  assigned_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  total_pilgrims integer NOT NULL DEFAULT 1,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  balance_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  departure_date date,
  status text NOT NULL DEFAULT 'DOCUMENTS_REQUIRED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS umrah_pilgrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  umrah_booking_id uuid NOT NULL REFERENCES umrah_bookings(id) ON DELETE CASCADE,
  traveler_id uuid REFERENCES travelers(id) ON DELETE SET NULL,
  passport_number text,
  passport_expiry date,
  visa_status text DEFAULT 'pending',
  room_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hajj_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  season text,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  is_active boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visa_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  traveler_id uuid REFERENCES travelers(id) ON DELETE SET NULL,
  assigned_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  destination text NOT NULL,
  visa_type text NOT NULL,
  entry_type text,
  status visa_application_status NOT NULL DEFAULT 'DOCUMENTS_REQUIRED',
  embassy_or_vfs text,
  appointment_at timestamptz,
  government_fee numeric(12,2) NOT NULL DEFAULT 0,
  service_fee numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  rejection_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visa_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visa_application_id uuid NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text,
  destination_scope text,
  coverage_summary text,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  product_id uuid REFERENCES insurance_products(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  policy_number text,
  start_date date,
  end_date date,
  premium numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL DEFAULT 'PENDING',
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reissue_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  assigned_agent uuid REFERENCES agents(id) ON DELETE SET NULL,
  status reissue_status NOT NULL DEFAULT 'REQUESTED',
  reason text NOT NULL,
  supplier_penalty numeric(12,2) NOT NULL DEFAULT 0,
  agency_fee numeric(12,2) NOT NULL DEFAULT 0,
  fare_difference numeric(12,2) NOT NULL DEFAULT 0,
  total_due numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  new_travel_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  basis_amount numeric(12,2) NOT NULL DEFAULT 0,
  commission_type text NOT NULL DEFAULT 'percentage',
  commission_rate numeric(8,4) NOT NULL DEFAULT 0,
  commission_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL DEFAULT 'PENDING',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
  supplier_name text,
  supplier_reference text,
  payable_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  due_date date,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  entry_type text NOT NULL,
  debit numeric(12,2) NOT NULL DEFAULT 0,
  credit numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS b2b_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  city text,
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  wallet_balance numeric(12,2) NOT NULL DEFAULT 0,
  commission_rate numeric(8,4) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travelers_customer ON travelers(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(due_at);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_packages_destination ON packages(destination);
CREATE INDEX IF NOT EXISTS idx_umrah_departure ON umrah_packages(departure_date);
CREATE INDEX IF NOT EXISTS idx_visa_customer ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_status ON visa_applications(status);
CREATE INDEX IF NOT EXISTS idx_reissue_booking ON reissue_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_commission_agent ON agent_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_payables_status ON supplier_payables(status);
CREATE INDEX IF NOT EXISTS idx_accounting_booking ON accounting_entries(booking_id);

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'travelers','leads','quotations','packages','umrah_packages','umrah_bookings',
    'visa_applications','insurance_products','reissue_requests','supplier_payables',
    'b2b_agencies'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE umrah_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE umrah_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE umrah_pilgrims ENABLE ROW LEVEL SECURITY;
ALTER TABLE hajj_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE visa_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE reissue_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_agencies ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'travelers','leads','followups','quotations','quotation_items','packages','package_items',
    'umrah_packages','umrah_bookings','umrah_pilgrims','hajj_packages','visa_applications',
    'visa_documents','insurance_products','insurance_policies','reissue_requests',
    'agent_commissions','supplier_payables','expenses','accounting_entries','b2b_agencies'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "staff_all_%s" ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY "staff_all_%s" ON %I FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''agent''))) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''agent'')))',
      t, t
    );
  END LOOP;
END $$;

-- Public catalog reads. Writes remain staff-only.
CREATE POLICY "packages_public_read" ON packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "umrah_packages_public_read" ON umrah_packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "insurance_products_public_read" ON insurance_products FOR SELECT TO anon, authenticated USING (is_active = true);

-- Supabase Storage bucket for agency/customer documents.
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-documents', 'travel-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "travel_documents_staff_insert" ON storage.objects;
CREATE POLICY "travel_documents_staff_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'travel-documents' AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','agent')));

DROP POLICY IF EXISTS "travel_documents_staff_read" ON storage.objects;
CREATE POLICY "travel_documents_staff_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'travel-documents' AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','agent')));

DROP POLICY IF EXISTS "travel_documents_staff_delete" ON storage.objects;
CREATE POLICY "travel_documents_staff_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'travel-documents' AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','agent')));

INSERT INTO providers (name,type,is_active,priority) VALUES
  ('Mock Flights','flight',true,100),
  ('Duffel Flights','flight',false,10),
  ('Amadeus Flights','flight',false,20),
  ('Travelport Flights','flight',false,30),
  ('Mock Hotels','hotel',true,100),
  ('Duffel Stays','hotel',false,10),
  ('Hotelbeds','hotel',false,20),
  ('Expedia Rapid','hotel',false,30),
  ('Manual Payments','payment',true,1)
ON CONFLICT (name) DO NOTHING;

INSERT INTO system_settings (key,value,description) VALUES
  ('default_currency','PKR','Default customer and accounting currency'),
  ('agency_timezone','Asia/Karachi','Pakistan Standard Time'),
  ('agency_country','PK','Primary agency country'),
  ('automatic_supplier_booking_enabled','false','Supplier auto-booking remains disabled until explicitly enabled'),
  ('default_payment_method','bank_transfer','Default Pakistani payment workflow')
ON CONFLICT (key) DO NOTHING;

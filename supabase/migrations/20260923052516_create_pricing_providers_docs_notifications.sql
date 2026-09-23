/*
# Create Pricing, Providers, Documents, Notifications, and Admin Infrastructure

## Summary
Creates the remaining tables for the complete travel agency platform: pricing engine, provider management, document system, notifications, and admin tools.

## New Tables
1. **pricing_rules** — Markup rules (fixed, percentage, minimum margin) with scope (airline, route, airport, hotel, supplier, customer, agent).
2. **currency_rates** — Currency conversion rates for PKR-based pricing.
3. **discounts** — Promotional discounts and coupon codes.
4. **coupons** — Coupon codes with usage limits and validity.
5. **providers** — External supplier providers (Duffel, Amadeus, Hotelbeds, etc.).
6. **provider_credentials** — Encrypted provider API credentials.
7. **provider_settings** — Provider configuration and feature flags.
8. **provider_logs** — Provider API call logs for debugging.
9. **documents** — Uploaded documents (tickets, vouchers, confirmations, receipts).
10. **document_versions** — Version history for documents.
11. **notifications** — Customer notifications.
12. **notification_templates** — Reusable notification templates.
13. **notification_logs** — Notification delivery logs.
14. **audit_logs** — System audit trail.
15. **system_settings** — Application configuration.
16. **feature_flags** — Feature toggles.

## Security
- RLS on all tables.
- Pricing/providers/audit/settings: admin only.
- Documents: customers see own (customer_visible=true), staff see all.
- Notifications: customers see own, staff see all.

## Notes
1. Pricing rules support multiple scopes for flexible markup.
2. Documents support versioning and customer visibility flags.
3. Provider credentials stored with encrypted values.
*/

-- ============================================================
-- TABLES
-- ============================================================

-- Pricing
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN ('fixed_markup', 'percentage_markup', 'minimum_margin', 'manual_override')),
  scope text NOT NULL CHECK (scope IN ('global', 'airline', 'route', 'airport', 'hotel', 'hotel_category', 'supplier', 'customer', 'agent')),
  scope_value text,
  value numeric(12,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  effective_from date,
  effective_to date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'PKR',
  quote_currency text NOT NULL,
  rate numeric(12,6) NOT NULL,
  source text,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (base_currency, quote_currency)
);

CREATE TABLE IF NOT EXISTS discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  value numeric(12,2) NOT NULL,
  scope text CHECK (scope IN ('global', 'airline', 'route', 'hotel')),
  scope_value text,
  is_active boolean NOT NULL DEFAULT true,
  effective_from date,
  effective_to date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  value numeric(12,2) NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  min_booking_amount numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Providers
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('flight', 'hotel', 'payment', 'notification')),
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  encrypted_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  setting_value text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider_id, setting_key)
);

CREATE TABLE IF NOT EXISTS provider_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id) ON DELETE SET NULL,
  provider_name text,
  action text NOT NULL,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  status_code integer,
  duration_ms integer,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN (
    'AGENCY_CONFIRMATION', 'AIRLINE_TICKET', 'AIRLINE_ITINERARY',
    'HOTEL_CONFIRMATION', 'HOTEL_VOUCHER', 'PAYMENT_RECEIPT', 'REFUND_DOCUMENT'
  )),
  filename text NOT NULL,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  storage_path text NOT NULL,
  file_size bigint,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_visible boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  current_version integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version integer NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  subject text,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  channel text NOT NULL,
  recipient text,
  status text NOT NULL,
  error_message text,
  sent_at timestamptz DEFAULT now()
);

-- Admin
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_value jsonb DEFAULT '{}'::jsonb,
  new_value jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- Helper: admin check pattern used across all admin-only tables
-- Pricing: admin only
DROP POLICY IF EXISTS "pricing_rules_admin_all" ON pricing_rules;
CREATE POLICY "pricing_rules_admin_all" ON pricing_rules FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Currency rates: authenticated read, admin write
DROP POLICY IF EXISTS "currency_rates_select_authenticated" ON currency_rates;
CREATE POLICY "currency_rates_select_authenticated" ON currency_rates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "currency_rates_admin_write" ON currency_rates;
CREATE POLICY "currency_rates_admin_write" ON currency_rates FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Discounts/coupons: admin only
DROP POLICY IF EXISTS "discounts_admin_all" ON discounts;
CREATE POLICY "discounts_admin_all" ON discounts FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "coupons_admin_all" ON coupons;
CREATE POLICY "coupons_admin_all" ON coupons FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Providers: admin only
DROP POLICY IF EXISTS "providers_admin_all" ON providers;
CREATE POLICY "providers_admin_all" ON providers FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "provider_credentials_admin_all" ON provider_credentials;
CREATE POLICY "provider_credentials_admin_all" ON provider_credentials FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "provider_settings_admin_all" ON provider_settings;
CREATE POLICY "provider_settings_admin_all" ON provider_settings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "provider_logs_admin_all" ON provider_logs;
CREATE POLICY "provider_logs_admin_all" ON provider_logs FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Documents: customers see own (customer_visible), staff see all
DROP POLICY IF EXISTS "documents_select_own_or_staff" ON documents;
CREATE POLICY "documents_select_own_or_staff" ON documents FOR SELECT
  TO authenticated USING (
    (
      customer_visible = true
      AND EXISTS (
        SELECT 1 FROM bookings b
        JOIN customers c ON c.id = b.customer_id
        WHERE b.id = documents.booking_id AND c.user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "documents_insert_staff" ON documents;
CREATE POLICY "documents_insert_staff" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "documents_update_staff" ON documents;
CREATE POLICY "documents_update_staff" ON documents FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Document versions: staff only
DROP POLICY IF EXISTS "document_versions_select_staff" ON document_versions;
CREATE POLICY "document_versions_select_staff" ON document_versions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "document_versions_insert_staff" ON document_versions;
CREATE POLICY "document_versions_insert_staff" ON document_versions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Notifications: customers see own, staff see all
DROP POLICY IF EXISTS "notifications_select_own_or_staff" ON notifications;
CREATE POLICY "notifications_select_own_or_staff" ON notifications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers WHERE customers.user_id = auth.uid() AND customers.id = notifications.customer_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "notifications_insert_staff" ON notifications;
CREATE POLICY "notifications_insert_staff" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "notifications_update_own_or_staff" ON notifications;
CREATE POLICY "notifications_update_own_or_staff" ON notifications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers WHERE customers.user_id = auth.uid() AND customers.id = notifications.customer_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (true);

-- Notification templates/logs: admin only
DROP POLICY IF EXISTS "notification_templates_admin_all" ON notification_templates;
CREATE POLICY "notification_templates_admin_all" ON notification_templates FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "notification_logs_admin_all" ON notification_logs;
CREATE POLICY "notification_logs_admin_all" ON notification_logs FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Audit logs: admin only
DROP POLICY IF EXISTS "audit_logs_admin_all" ON audit_logs;
CREATE POLICY "audit_logs_admin_all" ON audit_logs FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- System settings: admin only
DROP POLICY IF EXISTS "system_settings_admin_all" ON system_settings;
CREATE POLICY "system_settings_admin_all" ON system_settings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Feature flags: admin only
DROP POLICY IF EXISTS "feature_flags_admin_all" ON feature_flags;
CREATE POLICY "feature_flags_admin_all" ON feature_flags FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pricing_rules', 'discounts', 'coupons', 'providers',
    'provider_credentials', 'provider_settings', 'documents',
    'notification_templates', 'system_settings', 'feature_flags'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pricing_rules_scope ON pricing_rules(scope, scope_value);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_currency_rates_pair ON currency_rates(base_currency, quote_currency);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);
CREATE INDEX IF NOT EXISTS idx_provider_creds_provider_id ON provider_credentials(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_logs_provider_id ON provider_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_logs_created_at ON provider_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_booking_id ON documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_customer_visible ON documents(customer_visible);
CREATE INDEX IF NOT EXISTS idx_doc_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer_id ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- DEFAULT FEATURE FLAGS
-- ============================================================
INSERT INTO feature_flags (key, is_enabled, description) VALUES
  ('automatic_supplier_booking_enabled', false, 'Enable automatic supplier booking (OFF by default - agency fulfills manually)'),
  ('multi_currency_display', true, 'Allow customers to view prices in multiple currencies'),
  ('coupon_system', true, 'Enable coupon code system'),
  ('document_upload', true, 'Enable document upload for agency staff'),
  ('payment_proof_upload', true, 'Enable payment proof upload for customers')
ON CONFLICT (key) DO NOTHING;

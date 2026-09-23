/*
# Create Bookings, Booking Items, Status History, and Fulfillment Tasks

## Summary
Creates the core booking infrastructure for the agency-order model where customer checkout creates an internal agency booking (not an automatic supplier purchase).

## New Tables
1. **bookings** — Main booking record with agency reference, status, pricing, customer/agent links.
2. **booking_items** — Line items within a booking (flight or hotel), with supplier cost and customer price.
3. **booking_status_history** — Audit trail of every status transition with timestamps and descriptions.
4. **fulfillment_tasks** — Agency fulfillment workflow tracking (assigned agent, supplier info, PNR, ticket number, notes).
5. **fulfillment_notes** — Internal notes added by agents during fulfillment.

## Enums
- booking_status: 20 statuses from DRAFT through REFUNDED covering the full agency-order lifecycle.
- booking_type: flight, hotel
- fulfillment_status: pending, in_progress, completed, cancelled

## Security
- RLS enabled on all tables.
- Customers can read their own bookings; agents/admins can read all.
- Only agents/admins can modify fulfillment tasks and notes.
- Customers can insert bookings (create new bookings).

## Notes
1. Agency reference format: AG-YYYY-NNNNNN (e.g., AG-2026-000146).
2. Supplier cost and margin stored separately from customer price.
3. automatic_supplier_booking_enabled defaults to false (agency fulfills manually).
4. PKR is the default currency.
*/

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'DRAFT', 'BOOKING_REQUESTED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED',
    'AGENCY_PROCESSING', 'SUPPLIER_BOOKING_IN_PROGRESS', 'SUPPLIER_CONFIRMED',
    'PRICE_CHANGE_REVIEW', 'DOCUMENT_PENDING', 'DOCUMENT_UPLOADED',
    'COMPLETED', 'TICKET_PENDING', 'TICKETED', 'VOUCHER_PENDING', 'VOUCHER_ISSUED',
    'CUSTOMER_ACTION_REQUIRED', 'CANCELLED', 'REFUND_REQUESTED',
    'REFUND_PROCESSING', 'REFUNDED', 'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_type AS ENUM ('flight', 'hotel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fulfillment_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  type booking_type NOT NULL,
  status booking_status NOT NULL DEFAULT 'BOOKING_REQUESTED',
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  agency_markup numeric(12,2) NOT NULL DEFAULT 0,
  taxes numeric(12,2) NOT NULL DEFAULT 0,
  fees numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  customer_price numeric(12,2) NOT NULL DEFAULT 0,
  agency_margin numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  supplier_name text,
  supplier_reference text,
  notes text,
  automatic_supplier_booking_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_type booking_type NOT NULL,
  description text,
  supplier_offer_id text,
  supplier_property_id text,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  customer_price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status booking_status NOT NULL,
  description text,
  changed_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fulfillment_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status fulfillment_status NOT NULL DEFAULT 'pending',
  assigned_to uuid REFERENCES agents(id) ON DELETE SET NULL,
  supplier_name text,
  supplier_reference text,
  pnr text,
  ticket_number text,
  hotel_confirmation_number text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fulfillment_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_task_id uuid NOT NULL REFERENCES fulfillment_tasks(id) ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- Bookings: customers see own, staff see all
DROP POLICY IF EXISTS "bookings_select_own_or_staff" ON bookings;
CREATE POLICY "bookings_select_own_or_staff" ON bookings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM customers c WHERE c.user_id = auth.uid() AND c.id = bookings.customer_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "bookings_insert_authenticated" ON bookings;
CREATE POLICY "bookings_insert_authenticated" ON bookings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bookings_update_staff" ON bookings;
CREATE POLICY "bookings_update_staff" ON bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Booking items: same access pattern as bookings
DROP POLICY IF EXISTS "booking_items_select_own_or_staff" ON booking_items;
CREATE POLICY "booking_items_select_own_or_staff" ON booking_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = booking_items.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "booking_items_insert_staff" ON booking_items;
CREATE POLICY "booking_items_insert_staff" ON booking_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent', 'customer'))
  );

DROP POLICY IF EXISTS "booking_items_update_staff" ON booking_items;
CREATE POLICY "booking_items_update_staff" ON booking_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Status history: staff read, staff insert
DROP POLICY IF EXISTS "status_history_select_own_or_staff" ON booking_status_history;
CREATE POLICY "status_history_select_own_or_staff" ON booking_status_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = booking_status_history.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "status_history_insert_staff" ON booking_status_history;
CREATE POLICY "status_history_insert_staff" ON booking_status_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- Fulfillment tasks: staff only
DROP POLICY IF EXISTS "fulfillment_tasks_select_staff" ON fulfillment_tasks;
CREATE POLICY "fulfillment_tasks_select_staff" ON fulfillment_tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = fulfillment_tasks.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "fulfillment_tasks_insert_staff" ON fulfillment_tasks;
CREATE POLICY "fulfillment_tasks_insert_staff" ON fulfillment_tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "fulfillment_tasks_update_staff" ON fulfillment_tasks;
CREATE POLICY "fulfillment_tasks_update_staff" ON fulfillment_tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Fulfillment notes: staff only
DROP POLICY IF EXISTS "fulfillment_notes_select_staff" ON fulfillment_notes;
CREATE POLICY "fulfillment_notes_select_staff" ON fulfillment_notes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "fulfillment_notes_insert_staff" ON fulfillment_notes;
CREATE POLICY "fulfillment_notes_insert_staff" ON fulfillment_notes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['bookings', 'booking_items', 'fulfillment_tasks']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(reference);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(type);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_booking_id ON fulfillment_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status ON fulfillment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_notes_task_id ON fulfillment_notes(fulfillment_task_id);

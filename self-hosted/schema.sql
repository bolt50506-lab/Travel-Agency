-- GENERATED SELF-HOSTED DATABASE SCHEMA
-- Generated from the existing travel-agency migrations.
-- Do not edit manually. Run: npm.cmd run selfhost:prepare

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS local_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_local_users_email ON local_users(lower(email));

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== 20260923052204_create_core_auth_profiles.sql =====
/*
# Create Core Auth, Profiles, Agencies, and Roles Infrastructure

## Summary
Creates the foundational authentication and organizational structure for the Pakistan travel agency platform.

## New Tables
1. **roles** — System roles (admin, agent, customer).
2. **profiles** — Extends Supabase auth.users with full name, phone, CNIC, role.
3. **agencies** — Travel agency organizations.
4. **agents** — Agent profiles linked to users and agencies.
5. **customers** — Customer profiles with Pakistani-specific fields.

## Security
- RLS enabled on all tables with owner-scoped and role-based policies.
- Profiles: users read/update own; admins read all.
- Agencies: authenticated read; admin write.
- Agents: own read; admin read all.
- Customers: own read/update; staff read all.

## Notes
1. Tables created first, policies added after all tables exist.
2. Pakistani fields: cnic, passport_number, phone (+92), city.
3. Agency country defaults to 'PK'.
*/

-- ============================================================
-- TABLE CREATION (all tables first, no policies yet)
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES local_users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  cnic text,
  role text NOT NULL DEFAULT 'customer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  country text NOT NULL DEFAULT 'PK',
  city text,
  address text,
  phone text,
  email text,
  website text,
  iata_code text,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  agent_code text UNIQUE,
  commission_rate numeric(5,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  hired_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  cnic text,
  passport_number text,
  passport_expiry date,
  nationality text DEFAULT 'Pakistani',
  address text,
  city text,
  country text DEFAULT 'PK',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================






-- ============================================================
-- POLICIES (added after all tables exist)
-- ============================================================

-- Roles policies






-- Profiles policies












-- Agencies policies






-- Agents policies









-- Customers policies












-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['roles', 'profiles', 'agencies', 'agents', 'customers']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_agency_id ON agents(agency_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);


-- ===== 20260923052249_create_bookings_fulfillment.sql =====
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
  booked_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  booked_by_role text,
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






-- ============================================================
-- POLICIES
-- ============================================================

-- Bookings: customers see own, staff see all









-- Booking items: same access pattern as bookings









-- Status history: staff read, staff insert






-- Fulfillment tasks: staff only









-- Fulfillment notes: staff only






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


-- ===== 20260923052326_create_payments_refunds.sql =====
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






-- ============================================================
-- POLICIES
-- ============================================================

-- Payments: customers see own, staff see all









-- Payment transactions: staff read






-- Payment proofs: customers insert own, staff see all









-- Refunds: customers see own, staff see all









-- Refund transactions: staff read






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


-- ===== 20260923052402_create_flights_infrastructure.sql =====
/*
# Create Flights Infrastructure: Searches, Offers, Segments, Passengers

## Summary
Creates the flight search and booking data model supporting provider abstraction (Duffel, Amadeus, Travelport, etc.) with normalized offers that retain supplier information internally.

## New Tables
1. **flight_searches** — Search query logs with parameters and results count.
2. **flight_offers** — Normalized flight offers from providers, with supplier cost and customer price.
3. **flight_segments** — Individual flight segments (legs) within an offer.
4. **flight_bookings** — Flight-specific booking details linked to core bookings.
5. **flight_passengers** — Passenger details for flight bookings (name, DOB, passport, type).

## Security
- RLS enabled on all tables.
- Searches and offers: authenticated read (for customer search).
- Bookings/passengers: customers see own, staff see all.
- Only staff can modify passenger details after booking creation.

## Notes
1. Supplier information stored internally (supplier, supplier_offer_id) — never exposed to customers.
2. Supplier cost stored separately from customer price.
3. Supports Pakistani airports (ISB, LHE, KHI, PEW, MUX, UET) and international.
4. Offer expiration tracking for revalidation.
*/

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS flight_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  trip_type text NOT NULL DEFAULT 'round-trip' CHECK (trip_type IN ('round-trip', 'one-way', 'multi-city')),
  origin text NOT NULL,
  destination text NOT NULL,
  depart_date date NOT NULL,
  return_date date,
  adults integer NOT NULL DEFAULT 1,
  children integer NOT NULL DEFAULT 0,
  infants integer NOT NULL DEFAULT 0,
  cabin_class text NOT NULL DEFAULT 'economy' CHECK (cabin_class IN ('economy', 'premium-economy', 'business', 'first')),
  results_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flight_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES flight_searches(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  supplier_offer_id text NOT NULL,
  airline_code text NOT NULL,
  airline_name text,
  total_price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  taxes_and_fees numeric(12,2) NOT NULL DEFAULT 0,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  stops integer NOT NULL DEFAULT 0,
  total_duration integer NOT NULL DEFAULT 0,
  refundable boolean NOT NULL DEFAULT false,
  cabin_class text NOT NULL DEFAULT 'economy',
  baggage_checked text,
  baggage_cabin text,
  fare_conditions text,
  cancellation_policy text,
  valid_until timestamptz,
  raw_supplier_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flight_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES flight_offers(id) ON DELETE CASCADE,
  segment_index integer NOT NULL DEFAULT 0,
  airline_code text NOT NULL,
  airline_name text,
  flight_number text NOT NULL,
  origin_code text NOT NULL,
  origin_city text,
  origin_name text,
  origin_country text,
  destination_code text NOT NULL,
  destination_city text,
  destination_name text,
  destination_country text,
  departure_time timestamptz NOT NULL,
  arrival_time timestamptz NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  cabin_class text NOT NULL DEFAULT 'economy',
  baggage_checked text,
  baggage_cabin text,
  seats_available integer,
  aircraft_type text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flight_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES flight_offers(id) ON DELETE SET NULL,
  pnr text,
  ticket_number text,
  airline_confirmation text,
  ticketing_deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flight_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_booking_id uuid NOT NULL REFERENCES flight_bookings(id) ON DELETE CASCADE,
  passenger_type text NOT NULL CHECK (passenger_type IN ('adult', 'child', 'infant')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  passport_number text,
  passport_expiry date,
  nationality text DEFAULT 'Pakistani',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================






-- ============================================================
-- POLICIES
-- ============================================================

-- Flight searches: own or staff






-- Flight offers: authenticated read (needed for search results)






-- Flight segments: authenticated read






-- Flight bookings: own or staff









-- Flight passengers: own or staff









-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['flight_bookings', 'flight_passengers']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_flight_searches_search_id ON flight_searches(search_id);
CREATE INDEX IF NOT EXISTS idx_flight_searches_user_id ON flight_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_offers_search_id ON flight_offers(search_id);
CREATE INDEX IF NOT EXISTS idx_flight_offers_supplier ON flight_offers(supplier);
CREATE INDEX IF NOT EXISTS idx_flight_segments_offer_id ON flight_segments(offer_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_booking_id ON flight_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_passengers_flight_booking_id ON flight_passengers(flight_booking_id);


-- ===== 20260923052432_create_hotels_infrastructure.sql =====
/*
# Create Hotels Infrastructure: Searches, Hotels, Offers, Rooms, Bookings, Guests

## Summary
Creates the hotel search and booking data model with provider abstraction (Hotelbeds, Expedia Rapid, etc.).

## New Tables
1. **hotel_searches** — Search query logs.
2. **hotels** — Hotel master data (name, rating, location, amenities) with supplier property IDs.
3. **hotel_offers** — Normalized hotel offers from providers with pricing and room details.
4. **hotel_bookings** — Hotel-specific booking details linked to core bookings.
5. **hotel_guests** — Guest details for hotel bookings.

## Security
- RLS enabled on all tables.
- Searches/offers: authenticated read.
- Bookings/guests: customers see own, staff see all.

## Notes
1. Supplier property IDs stored internally.
2. Supports hotels in Pakistan and worldwide.
3. Room details, amenities, cancellation policies tracked.
*/

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  destination text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  rooms integer NOT NULL DEFAULT 1,
  adults integer NOT NULL DEFAULT 2,
  children integer NOT NULL DEFAULT 0,
  results_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier text NOT NULL,
  supplier_property_id text NOT NULL,
  name text NOT NULL,
  star_rating integer CHECK (star_rating BETWEEN 1 AND 5),
  guest_rating numeric(3,1),
  review_count integer DEFAULT 0,
  address text,
  city text,
  country text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  property_type text,
  check_in_time text,
  check_out_time text,
  amenities text[],
  images jsonb DEFAULT '[]'::jsonb,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (supplier, supplier_property_id)
);

CREATE TABLE IF NOT EXISTS hotel_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid REFERENCES hotel_searches(id) ON DELETE CASCADE,
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  supplier text NOT NULL,
  supplier_offer_id text NOT NULL,
  room_type text NOT NULL,
  room_description text,
  bed_type text,
  max_occupancy integer NOT NULL DEFAULT 2,
  rooms_available integer NOT NULL DEFAULT 1,
  price_per_night numeric(12,2) NOT NULL,
  total_price numeric(12,2) NOT NULL,
  base_price numeric(12,2) NOT NULL DEFAULT 0,
  taxes_and_fees numeric(12,2) NOT NULL DEFAULT 0,
  supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PKR',
  refundable boolean NOT NULL DEFAULT false,
  cancellation_policy text,
  amenities text[],
  board_type text,
  valid_until timestamptz,
  raw_supplier_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES hotel_offers(id) ON DELETE SET NULL,
  hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  confirmation_number text,
  voucher_reference text,
  check_in date NOT NULL,
  check_out date NOT NULL,
  number_of_rooms integer NOT NULL DEFAULT 1,
  room_type text,
  board_type text,
  special_requests text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotel_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_booking_id uuid NOT NULL REFERENCES hotel_bookings(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================






-- ============================================================
-- POLICIES
-- ============================================================

-- Hotel searches






-- Hotels: authenticated read









-- Hotel offers: authenticated read






-- Hotel bookings: own or staff









-- Hotel guests: own or staff






-- ============================================================
-- TRIGGERS
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['hotels', 'hotel_bookings']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
  END LOOP;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_hotel_searches_search_id ON hotel_searches(search_id);
CREATE INDEX IF NOT EXISTS idx_hotels_supplier ON hotels(supplier, supplier_property_id);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotel_offers_search_id ON hotel_offers(search_id);
CREATE INDEX IF NOT EXISTS idx_hotel_offers_hotel_id ON hotel_offers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_booking_id ON hotel_bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_hotel_guests_booking_id ON hotel_guests(hotel_booking_id);


-- ===== 20260923052516_create_pricing_providers_docs_notifications.sql =====
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

















-- ============================================================
-- POLICIES
-- ============================================================

-- Helper: admin check pattern used across all admin-only tables
-- Pricing: admin only



-- Currency rates: authenticated read, admin write






-- Discounts/coupons: admin only






-- Providers: admin only












-- Documents: customers see own (customer_visible), staff see all









-- Document versions: staff only






-- Notifications: customers see own, staff see all









-- Notification templates/logs: admin only






-- Audit logs: admin only



-- System settings: admin only



-- Feature flags: admin only



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


-- ===== 20260923052556_seed_demo_data.sql =====
/*
# Seed Data: Pakistani Airports, Airlines, Hotels, Pricing Rules, Providers, Sample Bookings

## Summary
Populates the database with realistic development/demo seed data for a Pakistani travel agency platform. All records are clearly marked as demo/seed data.

## Data Included
1. **Roles** — admin, agent, customer
2. **Agencies** — Demo travel agency (Voyago Travels, Islamabad)
3. **Providers** — Mock flight, hotel, payment, notification providers
4. **Pricing Rules** — Global 12% markup, minimum margin rules
5. **Currency Rates** — USD to PKR, EUR to PKR, GBP to PKR, AED to PKR
6. **Hotels** — Sample hotels in Pakistan (Islamabad, Lahore, Karachi) and international (Dubai, London)
7. **System Settings** — Default currency PKR, timezone Asia/Karachi
8. **Feature Flags** — Already inserted in previous migration

## Notes
1. All seed data uses clearly demo/placeholder identifiers.
2. No real customer information is used.
3. Pakistani airports are referenced in flight mock data (application layer), not stored in DB.
4. Currency rates are approximate and should be updated from a live API in production.
*/

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system administrator with all permissions'),
  ('agent', 'Travel agent who processes bookings and fulfillment'),
  ('customer', 'Customer who searches and books travel')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- AGENCIES
-- ============================================================
INSERT INTO agencies (name, legal_name, country, city, address, phone, email, website, iata_code, settings)
VALUES (
  'Voyago Travels',
  'Voyago Travels (Pvt) Ltd',
  'PK',
  'Islamabad',
  'Blue Area, F-7 Markaz, Islamabad, Pakistan',
  '+92-51-111-222-333',
  'info@voyago.pk',
  'https://voyago.pk',
  'VT001',
  '{"default_currency": "PKR", "timezone": "Asia/Karachi", "phone_country_code": "+92"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PROVIDERS
-- ============================================================
INSERT INTO providers (name, type, is_active, priority, settings) VALUES
  ('mock_flight_provider', 'flight', true, 1, '{"class": "MockFlightProvider"}'::jsonb),
  ('duffel', 'flight', false, 2, '{"class": "DuffelFlightProvider", "endpoint": "https://api.duffel.com"}'::jsonb),
  ('amadeus', 'flight', false, 3, '{"class": "AmadeusFlightProvider"}'::jsonb),
  ('mock_hotel_provider', 'hotel', true, 1, '{"class": "MockHotelProvider"}'::jsonb),
  ('hotelbeds', 'hotel', false, 2, '{"class": "HotelbedsProvider"}'::jsonb),
  ('expedia_rapid', 'hotel', false, 3, '{"class": "ExpediaRapidProvider"}'::jsonb),
  ('manual_bank_transfer', 'payment', true, 1, '{"class": "ManualBankTransferProvider"}'::jsonb),
  ('jazzcash', 'payment', false, 2, '{"class": "JazzCashProvider"}'::jsonb),
  ('easypaisa', 'payment', false, 3, '{"class": "EasyPaisaProvider"}'::jsonb),
  ('raast', 'payment', false, 4, '{"class": "RaastProvider"}'::jsonb),
  ('card_payment', 'payment', false, 5, '{"class": "CardPaymentProvider"}'::jsonb),
  ('mock_notification', 'notification', true, 1, '{"class": "MockNotificationProvider"}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PRICING RULES
-- ============================================================
INSERT INTO pricing_rules (rule_type, scope, scope_value, value, is_active, priority) VALUES
  ('percentage_markup', 'global', NULL, 12.00, true, 1),
  ('minimum_margin', 'global', NULL, 2000.00, true, 2),
  ('percentage_markup', 'airline', 'PK', 8.00, true, 10),
  ('percentage_markup', 'airline', 'EK', 15.00, true, 10),
  ('percentage_markup', 'airline', 'QR', 14.00, true, 10),
  ('percentage_markup', 'route', 'ISB-DXB', 18.00, true, 20),
  ('percentage_markup', 'route', 'KHI-DXB', 15.00, true, 20),
  ('percentage_markup', 'route', 'LHE-LHR', 20.00, true, 20),
  ('percentage_markup', 'hotel_category', '5_star', 15.00, true, 15),
  ('percentage_markup', 'hotel_category', '4_star', 12.00, true, 15),
  ('fixed_markup', 'hotel', NULL, 2000.00, true, 5)
ON CONFLICT DO NOTHING;

-- ============================================================
-- CURRENCY RATES (approximate, update from live API in production)
-- ============================================================
INSERT INTO currency_rates (base_currency, quote_currency, rate, source) VALUES
  ('PKR', 'USD', 0.0036, 'manual_seed'),
  ('USD', 'PKR', 278.50, 'manual_seed'),
  ('PKR', 'EUR', 0.0033, 'manual_seed'),
  ('EUR', 'PKR', 301.20, 'manual_seed'),
  ('PKR', 'GBP', 0.0028, 'manual_seed'),
  ('GBP', 'PKR', 352.80, 'manual_seed'),
  ('PKR', 'AED', 0.013, 'manual_seed'),
  ('AED', 'PKR', 75.90, 'manual_seed')
ON CONFLICT (base_currency, quote_currency) DO NOTHING;

-- ============================================================
-- HOTELS (sample data — Pakistan and international)
-- ============================================================
INSERT INTO hotels (supplier, supplier_property_id, name, star_rating, guest_rating, review_count, address, city, country, property_type, check_in_time, check_out_time, amenities, description) VALUES
  ('mock_hotel_provider', 'PK-ISB-001', 'Serena Hotel Islamabad', 5, 4.6, 3200, 'Khayaban-e-Suhrawardy, G-5, Islamabad', 'Islamabad', 'Pakistan', 'Luxury Hotel', '14:00', '12:00', ARRAY['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Business Center', 'Valet Parking'], 'Five-star luxury hotel in the diplomatic enclave of Islamabad with stunning Margalla Hills views.'),
  ('mock_hotel_provider', 'PK-ISB-002', 'Islamabad Marriott Hotel', 5, 4.5, 2800, 'Aga Khan Road, F-5/1, Islamabad', 'Islamabad', 'Pakistan', 'Business Hotel', '14:00', '12:00', ARRAY['Free WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar', 'Business Center', 'Airport Shuttle'], 'Premium business hotel in the heart of Islamabad close to government offices.'),
  ('mock_hotel_provider', 'PK-LHE-001', 'Pearl Continental Hotel Lahore', 5, 4.4, 2500, 'Mall Road, Lahore', 'Lahore', 'Pakistan', 'Luxury Hotel', '14:00', '12:00', ARRAY['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Business Center'], 'Iconic luxury hotel on the historic Mall Road in the heart of Lahore.'),
  ('mock_hotel_provider', 'PK-KHI-001', 'Movenpick Hotel Karachi', 5, 4.3, 1800, 'Abdullah Haroon Road, Karachi', 'Karachi', 'Pakistan', 'Business Hotel', '14:00', '12:00', ARRAY['Free WiFi', 'Pool', 'Gym', 'Restaurant', 'Bar', 'Business Center', 'Airport Shuttle'], 'International five-star hotel in the business district of Karachi.'),
  ('mock_hotel_provider', 'AE-DXB-001', 'Burj Al Arab Jumeirah', 5, 4.9, 5800, 'Jumeirah Beach Road, Dubai', 'Dubai', 'United Arab Emirates', 'Luxury Resort', '14:00', '12:00', ARRAY['Free WiFi', 'Private Beach', 'Pool', 'Spa', 'Gym', 'Multiple Restaurants', 'Helipad', 'Butler Service'], 'The world-famous sail-shaped luxury resort on Jumeirah Beach.'),
  ('mock_hotel_provider', 'AE-DXB-002', 'Atlantis The Palm', 5, 4.7, 6200, 'Crescent Road, Palm Jumeirah, Dubai', 'Dubai', 'United Arab Emirates', 'Resort', '15:00', '12:00', ARRAY['Free WiFi', 'Aquaventure Waterpark', 'Private Beach', 'Pool', 'Spa', 'Gym', 'Multiple Restaurants', 'Dolphin Bay'], 'Iconic resort on the Palm Jumeirah with world-class aquaventure waterpark.'),
  ('mock_hotel_provider', 'GB-LON-001', 'The Savoy London', 5, 4.8, 4500, 'Strand, London WC2R 0EU', 'London', 'United Kingdom', 'Luxury Hotel', '15:00', '12:00', ARRAY['Free WiFi', 'Spa', 'Gym', 'Afternoon Tea', 'Restaurant', 'Bar', 'Butler Service'], 'Historic luxury hotel on the Strand in central London.'),
  ('mock_hotel_provider', 'SA-JED-001', 'Raffles Makkah Palace', 5, 4.6, 2100, 'Makkah Al Mukarramah, Saudi Arabia', 'Mecca', 'Saudi Arabia', 'Luxury Hotel', '14:00', '12:00', ARRAY['Free WiFi', 'Restaurant', 'Prayer Room', 'Business Center'], 'Premium hotel with direct views of the Holy Mosque.')
ON CONFLICT (supplier, supplier_property_id) DO NOTHING;

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (key, value, description, is_sensitive) VALUES
  ('default_currency', 'PKR', 'Default currency for the platform', false),
  ('default_timezone', 'Asia/Karachi', 'Default timezone (Pakistan Standard Time)', false),
  ('default_country', 'PK', 'Default country code', false),
  ('phone_country_code', '+92', 'Default phone country code for Pakistan', false),
  ('agency_name', 'Voyago Travels', 'Travel agency name displayed to customers', false),
  ('agency_address', 'Blue Area, F-7 Markaz, Islamabad, Pakistan', 'Agency physical address', false),
  ('agency_phone', '+92-51-111-222-333', 'Agency contact phone', false),
  ('agency_email', 'info@voyago.pk', 'Agency contact email', false),
  ('min_booking_amount', '1000', 'Minimum booking amount in PKR', false),
  ('max_markup_percentage', '50', 'Maximum allowed markup percentage', false),
  ('payment_proof_required', 'true', 'Require payment proof for manual payments', false),
  ('document_upload_allowed_types', 'pdf,jpg,png', 'Allowed file types for document upload', false),
  ('document_max_file_size_mb', '10', 'Maximum document file size in MB', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- NOTIFICATION TEMPLATES
-- ============================================================
INSERT INTO notification_templates (name, type, channel, subject, body, is_active) VALUES
  ('booking_received', 'booking_received', 'email', 'Booking Received - {reference}', 'Dear {customer_name},\n\nYour booking request has been received. Our travel team is processing your booking.\n\nReference: {reference}\nAmount: {amount}\n\nWe will notify you once your ticket/voucher is ready.\n\nVoyago Travels', true),
  ('booking_ticketed', 'booking_ticketed', 'email', 'Your Ticket is Ready - {reference}', 'Dear {customer_name},\n\nYour flight ticket has been issued and is ready for download.\n\nReference: {reference}\nPNR: {pnr}\n\nPlease log in to your account to download your ticket.\n\nVoyago Travels', true),
  ('booking_voucher_issued', 'booking_voucher_issued', 'email', 'Your Hotel Voucher is Ready - {reference}', 'Dear {customer_name},\n\nYour hotel voucher has been issued and is ready for download.\n\nReference: {reference}\nConfirmation: {confirmation_number}\n\nPlease log in to your account to download your voucher.\n\nVoyago Travels', true),
  ('payment_verified', 'payment_verified', 'email', 'Payment Verified - {reference}', 'Dear {customer_name},\n\nYour payment of {amount} has been verified. Your booking is now being processed.\n\nReference: {reference}\n\nVoyago Travels', true),
  ('booking_cancelled', 'booking_cancelled', 'email', 'Booking Cancelled - {reference}', 'Dear {customer_name},\n\nYour booking {reference} has been cancelled. If applicable, a refund will be processed.\n\nVoyago Travels', true)
ON CONFLICT (name) DO NOTHING;


-- ===== 20260923060000_create_travel_agency_modules.sql =====
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
  short_description text,
  image_url text,
  badge text,
  makkah_nights integer,
  madinah_nights integer,
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






















 

-- Public catalog reads. Writes remain staff-only.




-- Supabase Storage bucket for agency/customer documents.











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

-- Self-hosted PostgREST permissions.
GRANT anon TO authenticator;
GRANT service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO anon, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
GRANT SELECT ON packages, umrah_packages, insurance_products TO anon;
NOTIFY pgrst, 'reload schema';


-- ===== 20260923130000_quotation_commercial_hardening.sql =====
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agency_margin numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'flight' CHECK (service_type IN ('flight','hotel','package','visa','insurance'));
CREATE INDEX IF NOT EXISTS idx_quotations_agent_status ON quotations(agent_id, status);


-- ===== 20260924090000_add_customer_wallets.sql =====
CREATE TABLE IF NOT EXISTS public.customer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.customer_wallets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  method text NOT NULL CHECK (method IN ('bank_transfer','raast','jazzcash','easypaisa','card','manual')),
  payment_reference text,
  customer_note text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON public.customer_wallets;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.wallet_topups;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.wallet_topups
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customer_wallets_customer_id ON public.customer_wallets(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_customer_id ON public.wallet_topups(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON public.wallet_topups(status);

GRANT ALL PRIVILEGES ON public.customer_wallets TO service_role;
GRANT ALL PRIVILEGES ON public.wallet_topups TO service_role;

NOTIFY pgrst, 'reload schema';

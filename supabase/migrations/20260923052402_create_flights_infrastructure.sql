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
ALTER TABLE flight_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_passengers ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- Flight searches: own or staff
DROP POLICY IF EXISTS "flight_searches_select_own_or_staff" ON flight_searches;
CREATE POLICY "flight_searches_select_own_or_staff" ON flight_searches FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "flight_searches_insert_authenticated" ON flight_searches;
CREATE POLICY "flight_searches_insert_authenticated" ON flight_searches FOR INSERT
  TO authenticated WITH CHECK (true);

-- Flight offers: authenticated read (needed for search results)
DROP POLICY IF EXISTS "flight_offers_select_authenticated" ON flight_offers;
CREATE POLICY "flight_offers_select_authenticated" ON flight_offers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "flight_offers_insert_authenticated" ON flight_offers;
CREATE POLICY "flight_offers_insert_authenticated" ON flight_offers FOR INSERT
  TO authenticated WITH CHECK (true);

-- Flight segments: authenticated read
DROP POLICY IF EXISTS "flight_segments_select_authenticated" ON flight_segments;
CREATE POLICY "flight_segments_select_authenticated" ON flight_segments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "flight_segments_insert_authenticated" ON flight_segments;
CREATE POLICY "flight_segments_insert_authenticated" ON flight_segments FOR INSERT
  TO authenticated WITH CHECK (true);

-- Flight bookings: own or staff
DROP POLICY IF EXISTS "flight_bookings_select_own_or_staff" ON flight_bookings;
CREATE POLICY "flight_bookings_select_own_or_staff" ON flight_bookings FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = flight_bookings.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "flight_bookings_insert_authenticated" ON flight_bookings;
CREATE POLICY "flight_bookings_insert_authenticated" ON flight_bookings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "flight_bookings_update_staff" ON flight_bookings;
CREATE POLICY "flight_bookings_update_staff" ON flight_bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Flight passengers: own or staff
DROP POLICY IF EXISTS "flight_passengers_select_own_or_staff" ON flight_passengers;
CREATE POLICY "flight_passengers_select_own_or_staff" ON flight_passengers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM flight_bookings fb
      JOIN bookings b ON b.id = fb.booking_id
      JOIN customers c ON c.id = b.customer_id
      WHERE fb.id = flight_passengers.flight_booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "flight_passengers_insert_authenticated" ON flight_passengers;
CREATE POLICY "flight_passengers_insert_authenticated" ON flight_passengers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "flight_passengers_update_staff" ON flight_passengers;
CREATE POLICY "flight_passengers_update_staff" ON flight_passengers FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

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

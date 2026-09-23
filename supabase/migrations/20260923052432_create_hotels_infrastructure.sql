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
ALTER TABLE hotel_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_guests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- Hotel searches
DROP POLICY IF EXISTS "hotel_searches_select_own_or_staff" ON hotel_searches;
CREATE POLICY "hotel_searches_select_own_or_staff" ON hotel_searches FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "hotel_searches_insert_authenticated" ON hotel_searches;
CREATE POLICY "hotel_searches_insert_authenticated" ON hotel_searches FOR INSERT
  TO authenticated WITH CHECK (true);

-- Hotels: authenticated read
DROP POLICY IF EXISTS "hotels_select_authenticated" ON hotels;
CREATE POLICY "hotels_select_authenticated" ON hotels FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hotels_insert_staff" ON hotels;
CREATE POLICY "hotels_insert_staff" ON hotels FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "hotels_update_staff" ON hotels;
CREATE POLICY "hotels_update_staff" ON hotels FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Hotel offers: authenticated read
DROP POLICY IF EXISTS "hotel_offers_select_authenticated" ON hotel_offers;
CREATE POLICY "hotel_offers_select_authenticated" ON hotel_offers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "hotel_offers_insert_authenticated" ON hotel_offers;
CREATE POLICY "hotel_offers_insert_authenticated" ON hotel_offers FOR INSERT
  TO authenticated WITH CHECK (true);

-- Hotel bookings: own or staff
DROP POLICY IF EXISTS "hotel_bookings_select_own_or_staff" ON hotel_bookings;
CREATE POLICY "hotel_bookings_select_own_or_staff" ON hotel_bookings FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = hotel_bookings.booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "hotel_bookings_insert_authenticated" ON hotel_bookings;
CREATE POLICY "hotel_bookings_insert_authenticated" ON hotel_bookings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "hotel_bookings_update_staff" ON hotel_bookings;
CREATE POLICY "hotel_bookings_update_staff" ON hotel_bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

-- Hotel guests: own or staff
DROP POLICY IF EXISTS "hotel_guests_select_own_or_staff" ON hotel_guests;
CREATE POLICY "hotel_guests_select_own_or_staff" ON hotel_guests FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM hotel_bookings hb
      JOIN bookings b ON b.id = hb.booking_id
      JOIN customers c ON c.id = b.customer_id
      WHERE hb.id = hotel_guests.hotel_booking_id AND c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'agent'))
  );

DROP POLICY IF EXISTS "hotel_guests_insert_authenticated" ON hotel_guests;
CREATE POLICY "hotel_guests_insert_authenticated" ON hotel_guests FOR INSERT
  TO authenticated WITH CHECK (true);

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

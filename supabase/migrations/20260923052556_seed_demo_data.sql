/*
# Seed Data: Pakistani Airports, Airlines, Hotels, Pricing Rules, Providers, Sample Bookings

## Summary
Populates the database with realistic development/demo seed data for a Pakistani travel agency platform. All records are clearly marked as demo/seed data.

## Data Included
1. **Roles** — admin, agent, customer
2. **Agencies** — Demo travel agency (Destino Travels, Islamabad)
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
  'Destino Travels',
  'Destino Travels (Pvt) Ltd',
  'PK',
  'Islamabad',
  'Islamabad, Pakistan',
  '+92-51-000-0000',
  '',
  'https://b2b.destinotravels.com',
  'DT001',
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
  ('agency_name', 'Destino Travels', 'Travel agency name displayed to customers', false),
  ('agency_address', 'Islamabad, Pakistan', 'Agency physical address', false),
  ('agency_phone', '+92-51-000-0000', 'Agency contact phone', false),
  ('agency_email', 'info@destinotravels.com', 'Agency contact email', false),
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
  ('booking_received', 'booking_received', 'email', 'Booking Received - {reference}', 'Dear {customer_name},\n\nYour booking request has been received. Our travel team is processing your booking.\n\nReference: {reference}\nAmount: {amount}\n\nWe will notify you once your ticket/voucher is ready.\n\nDestino Travels', true),
  ('booking_ticketed', 'booking_ticketed', 'email', 'Your Ticket is Ready - {reference}', 'Dear {customer_name},\n\nYour flight ticket has been issued and is ready for download.\n\nReference: {reference}\nPNR: {pnr}\n\nPlease log in to your account to download your ticket.\n\nDestino Travels', true),
  ('booking_voucher_issued', 'booking_voucher_issued', 'email', 'Your Hotel Voucher is Ready - {reference}', 'Dear {customer_name},\n\nYour hotel voucher has been issued and is ready for download.\n\nReference: {reference}\nConfirmation: {confirmation_number}\n\nPlease log in to your account to download your voucher.\n\nDestino Travels', true),
  ('payment_verified', 'payment_verified', 'email', 'Payment Verified - {reference}', 'Dear {customer_name},\n\nYour payment of {amount} has been verified. Your booking is now being processed.\n\nReference: {reference}\n\nDestino Travels', true),
  ('booking_cancelled', 'booking_cancelled', 'email', 'Booking Cancelled - {reference}', 'Dear {customer_name},\n\nYour booking {reference} has been cancelled. If applicable, a refund will be processed.\n\nDestino Travels', true)
ON CONFLICT (name) DO NOTHING;

# Database Setup

The project uses Supabase PostgreSQL.

## Fresh project

1. Create a new Supabase project.
2. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. Run every SQL file in `supabase/migrations/` in filename order, or use the Supabase CLI migrations workflow.
4. Do not commit credentials.
5. The final migration creates the private `travel-documents` Storage bucket.

## Production rule

Customer checkout creates an internal agency booking. It does not purchase from an airline/hotel supplier. Staff completes supplier fulfillment externally until `automatic_supplier_booking_enabled` is explicitly enabled and a tested adapter is installed.

Default currency is PKR and timezone is Asia/Karachi.

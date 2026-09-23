# Environment Setup

Copy `.env.example` to `.env.local`.

Required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

Optional supplier integrations:
- FLIGHT_PROVIDER=mock or a configured production adapter
- HOTEL_PROVIDER=mock or a configured production adapter
- DUFFEL_API_KEY
- Amadeus credentials
- Travelport credentials
- Hotelbeds credentials
- Expedia Rapid credentials

Pakistani manual payments are supported for bank transfer, Raast, JazzCash and Easypaisa.

Never commit `.env.local`, supplier credentials, payment secrets or Supabase service-role credentials.

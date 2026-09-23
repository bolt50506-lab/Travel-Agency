# Voyago — Travel Booking Platform

A production-grade travel booking portal for flights and hotels. Built with Next.js, TypeScript, and a provider-based architecture that supports mock providers initially and real supplier APIs later.

## Features

- **Flight Search & Booking**: Search flights with filters (stops, airlines, departure time, price), fare revalidation, passenger details, payment, and confirmation.
- **Hotel Search & Booking**: Search hotels with filters (star rating, guest rating, amenities, price), room selection, rate revalidation, guest details, payment, and voucher issuance.
- **Booking Engine**: Unified booking system with status tracking, timeline events, and cancellation.
- **Payment Architecture**: Provider-based payment interface with mock implementation. Ready for real gateway integration.
- **Admin Dashboard**: Dashboard with charts, booking management, user management, and provider configuration.
- **Authentication**: Login and registration for customers, agents, and admins with role-based access.
- **Responsive Design**: Optimized for desktop, tablet, and mobile.

## Architecture

```
Frontend (Next.js)
    ↓
Application API (API Routes)
    ↓
Services (Business Logic)
    ↓
Provider Interfaces
    ↓
Mock Providers (current) → Real Providers (future)
```

### Provider Interfaces

- **FlightProvider**: `MockFlightProvider` → ready for Amadeus, Duffel, Travelport, etc.
- **HotelProvider**: `MockHotelProvider` → ready for Hotelbeds, Expedia, etc.
- **PaymentProvider**: `MockPaymentProvider` → ready for Stripe, PayPal, etc.
- **NotificationProvider**: `MockNotificationProvider` → ready for SendGrid, Twilio, etc.

The frontend never knows which supplier is being used. Replacing a mock with a real provider only requires setting environment variables and implementing the adapter.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

### Type Check

```bash
npm run typecheck
```

### Lint

```bash
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `FLIGHT_PROVIDER` | Flight supplier (`mock` by default) |
| `FLIGHT_API_KEY` | Flight supplier API key |
| `FLIGHT_API_SECRET` | Flight supplier API secret |
| `HOTEL_PROVIDER` | Hotel supplier (`mock` by default) |
| `HOTEL_API_KEY` | Hotel supplier API key |
| `HOTEL_API_SECRET` | Hotel supplier API secret |
| `PAYMENT_PROVIDER` | Payment gateway (`mock` by default) |
| `PAYMENT_API_KEY` | Payment gateway API key |
| `PAYMENT_API_SECRET` | Payment gateway API secret |
| `EMAIL_PROVIDER` | Email/notification provider (`mock` by default) |
| `EMAIL_API_KEY` | Email provider API key |

## Docker

### Build and run with Docker Compose

```bash
docker-compose up --build
```

This starts the web application on port 3000 and a PostgreSQL database on port 5432.

### Build the Docker image only

```bash
docker build -t voyago .
docker run -p 3000:3000 --env-file .env voyago
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | john.smith@example.com | password123 |
| Agent | agent@travelportal.com | agent123 |
| Admin | admin@travelportal.com | admin123 |

## Project Structure

```
/app                    Next.js app router pages and API routes
  /(customer)           Customer-facing pages
  /admin                Admin dashboard
  /api                  API routes (flights, hotels, bookings, payments, auth, admin)
/components             React components
  /ui                   shadcn/ui base components
  /flights              Flight-specific components
  /hotels               Hotel-specific components
  /home                 Home page sections
  /layout               Header, footer
  /admin                Admin sidebar and shared components
/lib                    Business logic
  /providers            Provider interfaces and mock implementations
    /flights            Flight providers
    /hotels             Hotel providers
    /payments           Payment providers
    /notifications      Notification providers
  /services            Service layer (flight, hotel, payment, notification)
  /validation          Zod validation schemas
  /utils                API utilities
  /mock                 Mock data stores
/types                  TypeScript type definitions
/hooks                  React hooks
```

## API Endpoints

### Flights
- `GET/POST /api/flights/search` — Search flights
- `POST /api/flights/revalidate` — Revalidate fare and availability
- `POST /api/flights/book` — Book a flight

### Hotels
- `GET/POST /api/hotels/search` — Search hotels
- `POST /api/hotels/revalidate` — Revalidate room rate and availability
- `POST /api/hotels/book` — Book a hotel room

### Bookings
- `GET /api/bookings` — List bookings
- `GET/POST /api/bookings/[id]` — Get or create a booking
- `POST /api/bookings/[id]/cancel` — Cancel a booking

### Payments
- `POST /api/payments/create` — Create a payment
- `POST /api/payments/verify` — Verify a payment
- `POST /api/payments/refund` — Process a refund

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register

### Admin
- `GET /api/admin/dashboard` — Dashboard stats
- `GET /api/admin/bookings` — All bookings
- `GET /api/admin/users` — All users
- `GET /api/admin/providers` — Provider status

## License

This project is proprietary software.

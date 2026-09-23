# Project architecture and extension guide

## Three isolated portals

- Public website: `/`
- Agent portal: `/agent`
- Employee administration: `/admin`

Authorization is enforced server-side. Navigation visibility is not treated as security.

## Reusable component layers

### Shared UI
`components/shared/`
- `module-shell.tsx` — consistent page header/action layout
- `data-table.tsx` — typed reusable data table

### Domain components
`components/flights/`, `components/hotels/`, `components/travel/`
- Search
- passenger/guest forms
- booking summaries
- quotations

### Portal components
`components/agent/`, `components/admin/`, `components/auth/`
- Portal-specific navigation and workflows
- Portal components must consume shared domain components instead of duplicating them.

## Reusable domain modules

- `lib/domain/booking.ts` — booking statuses/types
- `lib/domain/money.ts` — PKR money rules
- `lib/modules/registry.ts` — centralized module metadata and role access
- `lib/services/` — business services
- `lib/providers/` — replaceable external provider adapters
- `lib/validation/` — request validation
- `lib/auth/` — authentication and authorization

## Provider architecture

Business code talks to services. Services talk to provider adapters.

```
UI
 ↓
API / server workflow
 ↓
Service
 ↓
Provider adapter
 ↓
Supplier / payment provider
```

This keeps supplier integrations replaceable and prevents provider-specific logic from spreading through the application.

## Database

The self-hosted PostgreSQL schema is generated from the project's schema source. PostgreSQL is local-only and PostgREST is local-only; the Next.js application is the public application boundary.

Every operational workflow should write its related status/history/audit records together:
- bookings + booking_status_history
- payments + payment_transactions
- fulfillment + fulfillment_notes
- refunds + refund_transactions
- admin mutations + audit_logs

## Extension rule

When new scope is requested:
1. Add or reuse a domain service.
2. Add/reuse a provider adapter if an external service is involved.
3. Add the database model/migration.
4. Add shared components before portal-specific wrappers.
5. Register the module in `lib/modules/registry.ts`.
6. Add server-side authorization.
7. Add the smallest portal UI needed.
8. Keep Destino branding/configuration separate from business logic.

Do not duplicate a component merely because it is used on another portal.

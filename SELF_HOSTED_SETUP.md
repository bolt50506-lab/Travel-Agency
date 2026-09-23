# Destino Travels self-hosted server

This deployment removes the dependency on Supabase Cloud.

Components:
- PostgreSQL 16: local database
- PostgREST: local REST gateway for PostgreSQL
- Next.js: customer portal and admin application
- local signed session authentication
- future document storage on the Windows server

PostgREST is a standalone PostgreSQL REST server, not a Supabase Cloud service.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set strong random values for POSTGRES_PASSWORD, POSTGREST_DB_PASSWORD, POSTGREST_JWT_SECRET, and LOCAL_AUTH_SECRET.
3. Generate the database schema:

   npm.cmd run selfhost:prepare

4. Start the database and PostgREST. Docker Compose does not read `.env.local` automatically, so pass it explicitly:

   docker compose --env-file .env.local -f docker-compose.self-hosted.yml up -d

5. Build and start the application:

   npm.cmd run build
   npm.cmd start

The Next.js application uses port 3000. PostgREST uses localhost port 3002 and PostgreSQL uses localhost port 5432. Neither database service should be exposed through the public tunnel.

## Resetting an empty development database

Only for a new/test installation:

   docker compose --env-file .env.local -f docker-compose.self-hosted.yml down -v
   npm.cmd run selfhost:prepare
   docker compose --env-file .env.local -f docker-compose.self-hosted.yml up -d

Never use `down -v` on a production installation because it destroys the PostgreSQL volume.

## Authentication

Supabase Auth is not used. User accounts are stored in `local_users`. Passwords are hashed with Node's built-in scrypt and sessions use signed HTTP-only cookies.

## Public deployment

Expose only Next.js through Cloudflare Tunnel. Keep PostgreSQL and PostgREST bound to localhost.
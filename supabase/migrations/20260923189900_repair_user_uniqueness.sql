/*
  Repair self-hosted agent/customer user ownership constraints.

  The seed/bootstrap path uses ON CONFLICT (user_id), so each non-null
  user_id must identify at most one agent/customer row.

  Existing duplicate rows are consolidated deterministically by keeping
  the oldest row (created_at, then id). Foreign keys in the application
  already use SET NULL/CASCADE semantics where appropriate.
*/

-- Keep the oldest agent row for each duplicated user_id.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY created_at ASC NULLS FIRST, id ASC
         ) AS rn
  FROM public.agents
  WHERE user_id IS NOT NULL
)
DELETE FROM public.agents a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- Keep the oldest customer row for each duplicated non-null user_id.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id
           ORDER BY created_at ASC NULLS FIRST, id ASC
         ) AS rn
  FROM public.customers
  WHERE user_id IS NOT NULL
)
DELETE FROM public.customers c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

-- Unique indexes are idempotent and also satisfy ON CONFLICT (user_id).
CREATE UNIQUE INDEX IF NOT EXISTS agents_user_id_unique
  ON public.agents(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_unique
  ON public.customers(user_id);

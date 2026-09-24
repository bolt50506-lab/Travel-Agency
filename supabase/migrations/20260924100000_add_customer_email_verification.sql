-- Customer email verification.
-- Staff accounts created by admins do not require email verification.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.local_users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
  ON public.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
  ON public.email_verification_tokens(expires_at);

GRANT ALL PRIVILEGES ON public.email_verification_tokens TO service_role;

-- Existing staff and demo customer accounts were created before verification was added.
-- Keep them usable; all newly registered customers start unverified.
UPDATE public.profiles
SET email_verified_at = COALESCE(email_verified_at, created_at, now())
WHERE role IN ('admin', 'agent')
   OR email = 'john.smith@example.com';

NOTIFY pgrst, 'reload schema';

-- Repair admin accounts that were accidentally left inactive.
-- Admin accounts are managed by the agency and must remain usable for administration.
UPDATE public.profiles
SET is_active = true,
    updated_at = now()
WHERE role = 'admin';

NOTIFY pgrst, 'reload schema';

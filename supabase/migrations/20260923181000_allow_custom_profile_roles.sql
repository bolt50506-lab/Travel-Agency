-- Allow admin-defined roles to be assigned to profiles.
-- Portal authorization still uses the built-in admin/agent/customer roles;
-- custom roles are stored for future permission-based access control.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

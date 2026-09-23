ALTER TABLE public.umrah_packages
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS badge text,
  ADD COLUMN IF NOT EXISTS makkah_nights integer,
  ADD COLUMN IF NOT EXISTS madinah_nights integer;

CREATE INDEX IF NOT EXISTS idx_umrah_active_departure
  ON public.umrah_packages(is_active, departure_date);
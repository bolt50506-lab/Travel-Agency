-- Staff booking attribution and commission audit trail
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booked_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booked_by_role text;

CREATE INDEX IF NOT EXISTS idx_bookings_booked_by_user
  ON public.bookings(booked_by_user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_booked_by_role
  ON public.bookings(booked_by_role);

COMMENT ON COLUMN public.bookings.booked_by_user_id IS 'Authenticated staff/customer account that created the booking request.';
COMMENT ON COLUMN public.bookings.booked_by_role IS 'Role of the account that created the booking request at creation time.';

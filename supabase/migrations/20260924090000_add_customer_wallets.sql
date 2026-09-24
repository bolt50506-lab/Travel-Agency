/*
  Customer wallet infrastructure.

  - One wallet per customer.
  - Customer can submit a top-up request using an agency-supported method.
  - Balance is changed only by an admin approval or a trusted server-side payment flow.
  - Never accept a client-supplied wallet balance.
*/

CREATE TABLE IF NOT EXISTS public.customer_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  balance numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.customer_wallets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  method text NOT NULL CHECK (method IN ('bank_transfer','raast','jazzcash','easypaisa','card','manual')),
  payment_reference text,
  customer_note text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_select_own" ON public.customer_wallets;
CREATE POLICY "wallet_select_own" ON public.customer_wallets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_wallets.customer_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wallet_admin_all" ON public.customer_wallets;
CREATE POLICY "wallet_admin_all" ON public.customer_wallets
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "wallet_topups_own_select" ON public.wallet_topups;
CREATE POLICY "wallet_topups_own_select" ON public.wallet_topups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = wallet_topups.customer_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wallet_topups_own_insert" ON public.wallet_topups;
CREATE POLICY "wallet_topups_own_insert" ON public.wallet_topups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = wallet_topups.customer_id
        AND c.user_id = auth.uid()
    )
    AND status = 'PENDING'
  );

DROP POLICY IF EXISTS "wallet_topups_admin_all" ON public.wallet_topups;
CREATE POLICY "wallet_topups_admin_all" ON public.wallet_topups
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS set_updated_at ON public.customer_wallets;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.customer_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.wallet_topups;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.wallet_topups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_customer_wallets_customer_id
  ON public.customer_wallets(customer_id);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_customer_id
  ON public.wallet_topups(customer_id);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_status
  ON public.wallet_topups(status);

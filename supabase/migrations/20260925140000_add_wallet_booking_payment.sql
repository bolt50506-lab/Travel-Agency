-- Customer wallet booking payments.
-- The wallet debit and payment record are performed atomically in PostgreSQL.

ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'wallet';

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.customer_wallets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('CREDIT','DEBIT','REFUND','ADJUSTMENT')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  balance_before numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  description text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_customer_id ON public.wallet_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON public.wallet_transactions(booking_id);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_transactions_own_select" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_own_select" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = wallet_transactions.customer_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "wallet_transactions_admin_all" ON public.wallet_transactions;
CREATE POLICY "wallet_transactions_admin_all" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION public.pay_booking_from_wallet(
  p_booking_id uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_actor_id uuid
)
RETURNS TABLE(payment_id uuid, payment_reference text, new_balance numeric)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_wallet public.customer_wallets%ROWTYPE;
  v_existing public.payments%ROWTYPE;
  v_reference text;
  v_before numeric(14,2);
  v_after numeric(14,2);
  v_payment_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'WALLET_PAYMENT_INVALID_AMOUNT';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND';
  END IF;

  IF v_booking.customer_id IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'WALLET_PAYMENT_FORBIDDEN';
  END IF;

  IF upper(coalesce(v_booking.currency, 'PKR')) <> 'PKR' THEN
    RAISE EXCEPTION 'CURRENCY_NOT_SUPPORTED';
  END IF;

  IF abs(coalesce(v_booking.customer_price, 0) - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;

  SELECT * INTO v_existing
  FROM public.payments
  WHERE booking_id = p_booking_id
    AND method = 'wallet'
    AND status = 'verified'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    SELECT balance INTO v_after
    FROM public.customer_wallets
    WHERE customer_id = p_customer_id;
    RETURN QUERY SELECT v_existing.id, v_existing.reference, v_after;
    RETURN;
  END IF;

  SELECT * INTO v_wallet
  FROM public.customer_wallets
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  v_before := coalesce(v_wallet.balance, 0);
  IF v_before < p_amount THEN
    RAISE EXCEPTION 'WALLET_INSUFFICIENT_BALANCE';
  END IF;

  v_after := round((v_before - p_amount)::numeric, 2);
  v_reference := 'WAL-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  UPDATE public.customer_wallets
  SET balance = v_after, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    wallet_id, customer_id, booking_id, type, amount,
    balance_before, balance_after, description, created_by
  ) VALUES (
    v_wallet.id, p_customer_id, p_booking_id, 'DEBIT', p_amount,
    v_before, v_after, 'Wallet payment for booking ' || v_booking.reference, p_actor_id
  );

  INSERT INTO public.payments (
    booking_id, customer_id, reference, method, amount, currency,
    status, provider_name, provider_transaction_id, provider_response,
    verified_by, verified_at
  ) VALUES (
    p_booking_id, p_customer_id, v_reference, 'wallet', p_amount, 'PKR',
    'verified', 'customer_wallet', v_reference,
    jsonb_build_object('mode', 'wallet', 'wallet_id', v_wallet.id, 'balance_before', v_before, 'balance_after', v_after),
    p_actor_id, now()
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.payment_transactions (
    payment_id, provider_name, provider_transaction_id, amount, currency,
    status, request_payload, response_payload
  ) VALUES (
    v_payment_id, 'customer_wallet', v_reference, p_amount, 'PKR',
    'verified', jsonb_build_object('method', 'wallet'), jsonb_build_object('balance_after', v_after)
  );

  UPDATE public.bookings
  SET status = 'PAYMENT_RECEIVED', updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_status_history (
    booking_id, status, description, changed_by, metadata
  ) VALUES (
    p_booking_id, 'PAYMENT_RECEIVED', 'Booking paid from customer wallet', p_actor_id,
    jsonb_build_object('paymentId', v_payment_id, 'walletTransactionAmount', p_amount)
  );

  INSERT INTO public.notifications (
    customer_id, booking_id, type, title, body
  ) VALUES (
    p_customer_id, p_booking_id, 'PAYMENT_VERIFIED', 'Wallet payment completed',
    'Wallet payment for ' || v_booking.reference || ' was completed successfully.'
  );

  RETURN QUERY SELECT v_payment_id, v_reference, v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_booking_from_wallet(uuid, uuid, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pay_booking_from_wallet(uuid, uuid, numeric, uuid) TO service_role;
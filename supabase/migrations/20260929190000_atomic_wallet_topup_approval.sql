-- Atomic wallet top-up approval.
-- The wallet balance and CREDIT ledger entry are committed together with the
-- top-up status transition, preventing concurrent approvals from double-crediting.

create or replace function public.approve_wallet_topup(
  p_topup_id uuid,
  p_actor_id uuid
)
returns table(topup_id uuid, new_balance numeric)
language plpgsql
set search_path = public
as $$
declare
  v_topup public.wallet_topups%rowtype;
  v_wallet public.customer_wallets%rowtype;
  v_before numeric(14,2);
  v_after numeric(14,2);
begin
  select * into v_topup
  from public.wallet_topups
  where id = p_topup_id
  for update;

  if not found then
    raise exception 'WALLET_TOPUP_NOT_FOUND';
  end if;

  if v_topup.status <> 'PENDING' then
    raise exception 'WALLET_TOPUP_ALREADY_REVIEWED';
  end if;

  if upper(coalesce(v_topup.currency, 'PKR')) <> 'PKR' then
    raise exception 'CURRENCY_NOT_SUPPORTED';
  end if;

  select * into v_wallet
  from public.customer_wallets
  where id = v_topup.wallet_id
  for update;

  if not found then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  v_before := round(coalesce(v_wallet.balance, 0)::numeric, 2);
  v_after := round((v_before + v_topup.amount)::numeric, 2);

  update public.customer_wallets
  set balance = v_after, updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topups
  set status = 'APPROVED',
      reviewed_by = p_actor_id,
      reviewed_at = now()
  where id = v_topup.id;

  insert into public.wallet_transactions (
    wallet_id, customer_id, type, amount,
    balance_before, balance_after, description, created_by
  ) values (
    v_wallet.id, v_topup.customer_id, 'CREDIT', v_topup.amount,
    v_before, v_after, 'Wallet top-up approved ' || v_topup.id, p_actor_id
  );

  return query select v_topup.id, v_after;
end;
$$;

revoke all on function public.approve_wallet_topup(uuid, uuid) from public;
grant execute on function public.approve_wallet_topup(uuid, uuid) to service_role;

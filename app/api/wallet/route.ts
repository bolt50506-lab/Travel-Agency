export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getServerActor, requireAdmin } from '@/lib/auth/server';
import { errorResponse, successResponse } from '@/lib/utils/api';

const METHODS = ['bank_transfer', 'raast', 'jazzcash', 'easypaisa', 'manual'] as const;
type WalletMethod = typeof METHODS[number];

function paymentOptions() {
  return [
    {
      id: 'bank_transfer',
      label: 'Bank Transfer',
      details: [
        process.env.BANK_NAME ? `Bank: ${process.env.BANK_NAME}` : '',
        process.env.BANK_ACCOUNT_TITLE ? `Account title: ${process.env.BANK_ACCOUNT_TITLE}` : '',
        process.env.BANK_ACCOUNT_NUMBER ? `Account: ${process.env.BANK_ACCOUNT_NUMBER}` : '',
        process.env.BANK_IBAN ? `IBAN: ${process.env.BANK_IBAN}` : '',
      ].filter(Boolean),
    },
    {
      id: 'raast',
      label: 'Raast',
      details: process.env.RAAST_ID ? [`Raast ID: ${process.env.RAAST_ID}`] : [],
    },
    {
      id: 'jazzcash',
      label: 'JazzCash',
      details: process.env.JAZZCASH_NUMBER ? [`JazzCash: ${process.env.JAZZCASH_NUMBER}`] : [],
    },
    {
      id: 'easypaisa',
      label: 'Easypaisa',
      details: process.env.EASYPAISA_NUMBER ? [`Easypaisa: ${process.env.EASYPAISA_NUMBER}`] : [],
    },
    {
      id: 'manual',
      label: 'Other / Manual',
      details: ['Contact Destino Travels and provide your payment reference.'],
    },
  ];
}

async function getCustomer(actorId: string) {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('id,full_name,email,phone')
    .eq('user_id', actorId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);
    if (actor.role !== 'customer') return errorResponse('Customer access required', 'FORBIDDEN', 403);

    const customer = await getCustomer(actor.id);
    if (!customer) return successResponse({
      wallet: { balance: 0, currency: 'PKR' },
      topups: [],
      paymentOptions: paymentOptions(),
    });

    let { data: wallet, error: walletError } = await supabaseAdmin
      .from('customer_wallets')
      .select('*')
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (walletError && !String(walletError.message || '').toLowerCase().includes('does not exist')) {
      throw walletError;
    }

    if (!wallet && !walletError) {
      const created = await supabaseAdmin
        .from('customer_wallets')
        .insert({ customer_id: customer.id })
        .select('*')
        .single();
      if (created.error) throw created.error;
      wallet = created.data;
    }

    if (!wallet) {
      return successResponse({ wallet: { balance: 0, currency: 'PKR' }, topups: [], paymentOptions: paymentOptions() });
    }

    const { data: topups, error: topupError } = await supabaseAdmin
      .from('wallet_topups')
      .select('id,amount,currency,method,payment_reference,customer_note,status,review_note,created_at,reviewed_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (topupError) throw topupError;

    return successResponse({
      customer,
      wallet: { id: wallet.id, balance: Number(wallet.balance || 0), currency: wallet.currency || 'PKR' },
      topups: topups || [],
      paymentOptions: paymentOptions(),
    });
  } catch (err) {
    console.error('Wallet GET error:', err);
    return errorResponse('Unable to load wallet', 'WALLET_LOAD_FAILED', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);
    if (actor.role !== 'customer') return errorResponse('Customer access required', 'FORBIDDEN', 403);

    const body = await req.json();
    const amount = Number(body.amount);
    const method = String(body.method || '') as WalletMethod;
    const paymentReference = String(body.paymentReference || '').trim().slice(0, 120);
    const customerNote = String(body.customerNote || '').trim().slice(0, 500);

    if (!Number.isFinite(amount) || amount < 100) {
      return errorResponse('Minimum wallet top-up is PKR 100.', 'WALLET_TOPUP_INVALID_AMOUNT', 400);
    }
    if (amount > 10000000) {
      return errorResponse('Maximum wallet top-up is PKR 10,000,000.', 'WALLET_TOPUP_INVALID_AMOUNT', 400);
    }
    if (!METHODS.includes(method)) return errorResponse('Select a valid payment method.', 'WALLET_TOPUP_INVALID_METHOD', 400);

    const customer = await getCustomer(actor.id);
    if (!customer) return errorResponse('Customer profile not found.', 'CUSTOMER_NOT_FOUND', 404);

    // The project's lightweight PostgREST wrapper intentionally exposes
    // insert/update/select, but not Supabase's .upsert() helper. Reuse the
    // wallet created by GET, or create it if this is the first top-up.
    let { data: wallet, error: walletError } = await supabaseAdmin
      .from('customer_wallets')
      .select('*')
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (walletError) throw walletError;

    if (!wallet) {
      const created = await supabaseAdmin
        .from('customer_wallets')
        .insert({ customer_id: customer.id })
        .select('*')
        .single();

      if (created.error) {
        // Another request may have created the unique wallet between SELECT
        // and INSERT. Read it again rather than failing the customer's top-up.
        const existing = await supabaseAdmin
          .from('customer_wallets')
          .select('*')
          .eq('customer_id', customer.id)
          .maybeSingle();

        if (existing.error || !existing.data) {
          throw created.error;
        }

        wallet = existing.data;
      } else {
        wallet = created.data;
      }
    }

    if (!wallet) throw new Error('Wallet could not be created');

    const { data: topup, error } = await supabaseAdmin
      .from('wallet_topups')
      .insert({
        wallet_id: wallet.id,
        customer_id: customer.id,
        amount,
        currency: 'PKR',
        method,
        payment_reference: paymentReference || null,
        customer_note: customerNote || null,
        status: 'PENDING',
      })
      .select('id,amount,currency,method,payment_reference,customer_note,status,created_at')
      .single();

    if (error) throw error;

    return successResponse({
      topup,
      message: 'Top-up request submitted. Your wallet will be credited after the agency verifies the payment.',
    }, 201);
  } catch (err) {
    console.error('Wallet POST error:', err);
    return errorResponse('Unable to submit wallet top-up', 'WALLET_TOPUP_FAILED', 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await req.json();
    const topupId = String(body.topupId || '');
    const action = String(body.action || '');
    const reviewNote = String(body.reviewNote || '').trim().slice(0, 500);

    if (!topupId || !['approve', 'reject'].includes(action)) {
      return errorResponse('Top-up and action are required.', 'VALIDATION_ERROR', 400);
    }

    const { data: topup, error: loadError } = await supabaseAdmin
      .from('wallet_topups')
      .select('*')
      .eq('id', topupId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!topup) return errorResponse('Top-up request not found.', 'NOT_FOUND', 404);
    if (topup.status !== 'PENDING') return errorResponse('This top-up has already been reviewed.', 'ALREADY_REVIEWED', 409);

    const nextStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('wallet_topups')
      .update({
        status: nextStatus,
        reviewed_by: actor.id,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote || null,
      })
      .eq('id', topupId)
      .eq('status', 'PENDING')
      .select('*')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) return errorResponse('This top-up was reviewed by another request.', 'ALREADY_REVIEWED', 409);

    if (action === 'approve') {
      const { data: wallet, error: walletLoadError } = await supabaseAdmin
        .from('customer_wallets')
        .select('id,balance')
        .eq('id', topup.wallet_id)
        .maybeSingle();
      if (walletLoadError || !wallet) throw walletLoadError || new Error('Wallet not found');

      const { error: balanceError } = await supabaseAdmin
        .from('customer_wallets')
        .update({ balance: Number(wallet.balance || 0) + Number(topup.amount) })
        .eq('id', wallet.id);
      if (balanceError) throw balanceError;
    }

    return successResponse({ topup: updated, message: action === 'approve' ? 'Wallet credited.' : 'Top-up rejected.' });
  } catch (err) {
    console.error('Wallet PATCH error:', err);
    return errorResponse('Unable to review wallet top-up', 'WALLET_REVIEW_FAILED', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await getServerActor();
    if (!actor) return errorResponse('Login required', 'AUTH_REQUIRED', 401);
    if (actor.role !== 'customer') return errorResponse('Customer access required', 'FORBIDDEN', 403);

    const body = await req.json();
    const topupId = String(body.topupId || '');
    if (!topupId) return errorResponse('Top-up is required.', 'VALIDATION_ERROR', 400);

    const customer = await getCustomer(actor.id);
    if (!customer) return errorResponse('Customer profile not found.', 'CUSTOMER_NOT_FOUND', 404);

    const { data, error } = await supabaseAdmin
      .from('wallet_topups')
      .update({ status: 'CANCELLED' })
      .eq('id', topupId)
      .eq('customer_id', customer.id)
      .eq('status', 'PENDING')
      .select('id,status')
      .maybeSingle();

    if (error) throw error;
    if (!data) return errorResponse('Top-up cannot be cancelled.', 'TOPUP_NOT_CANCELLABLE', 409);

    return successResponse({ topup: data });
  } catch (err) {
    console.error('Wallet DELETE error:', err);
    return errorResponse('Unable to cancel top-up', 'WALLET_TOPUP_CANCEL_FAILED', 500);
  }
}

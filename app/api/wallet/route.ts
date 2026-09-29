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

export async function GET(req: NextRequest) {
  try {
    const actor = await getServerActor(req.headers.get('cookie'));
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
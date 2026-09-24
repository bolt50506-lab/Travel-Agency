export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/server';

export async function GET(req:NextRequest){
 try{
  await requireAdmin(); const status=new URL(req.url).searchParams.get('status');
  let q=supabaseAdmin.from('payments').select('*,bookings(reference,customer_id,contact_email,customer_price,currency)').order('created_at',{ascending:false}).limit(200);
  if(status)q=q.eq('status',status);
  const {data,error}=await q;if(error)throw error;return successResponse({payments:data||[]});
 }catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_ADMIN')return errorResponse('Admin access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load payments','INTERNAL_ERROR',500);}
}

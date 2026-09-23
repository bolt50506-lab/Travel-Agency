export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth/server';

export async function GET(_req:NextRequest){
 try{await requireStaff();const {data,error}=await supabaseAdmin.from('refunds').select('*,bookings(reference,contact_email),payments(reference,method)').order('created_at',{ascending:false}).limit(200);if(error)throw error;return successResponse({refunds:data||[]});}
 catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_STAFF')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load refunds','INTERNAL_ERROR',500);}
}

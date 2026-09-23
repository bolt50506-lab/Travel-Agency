import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/api';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  try {
    await requireStaff();
    const {searchParams}=new URL(req.url);
    const status=searchParams.get('status'); const type=searchParams.get('type'); const search=searchParams.get('search');
    let query=supabaseAdmin.from('bookings').select('*,customers(full_name,email,phone),fulfillment_tasks(*)').order('created_at',{ascending:false});
    if(status) query=query.eq('status',status);
    if(type) query=query.eq('type',type);
    const {data,error}=await query; if(error) throw error;
    let rows=data||[];
    if(search){const q=search.toLowerCase(); rows=rows.filter((b: any)=>b.reference.toLowerCase().includes(q)||(b.contact_email||'').toLowerCase().includes(q)||(b.supplier_reference||'').toLowerCase().includes(q));}
    return successResponse({bookings:rows,total:rows.length});
  } catch(err){if(err instanceof Error&&err.message==='UNAUTHORIZED_STAFF')return errorResponse('Staff access required','FORBIDDEN',403);console.error(err);return errorResponse('Unable to load bookings','INTERNAL_ERROR',500);}
}


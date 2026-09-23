import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({
    success:true,
    supplier:'Mock Supplier',
    supplierReference:body.supplierReference || null,
    status:'CANCELLED',
    cancelledAt:new Date().toISOString(),
    refundStatus:'PENDING_REVIEW',
    message:'Mock cancellation completed. No real supplier booking was cancelled.'
  });
}
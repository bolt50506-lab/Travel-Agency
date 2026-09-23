import { NextResponse } from 'next/server';

export async function GET(_: Request, { params }: { params: { reference: string } }) {
  return NextResponse.json({
    success:true,
    supplier:'Mock Supplier',
    supplierReference:params.reference,
    status:'CONFIRMED',
    lastUpdated:new Date().toISOString()
  });
}
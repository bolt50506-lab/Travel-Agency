import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const type = body.type === 'hotel' ? 'hotel' : 'flight';
  const reference = `MOCK-${type === 'hotel' ? 'HTL' : 'FLT'}-${Date.now().toString(36).toUpperCase()}`;
  return NextResponse.json({
    success:true,
    supplier:'Mock Supplier',
    supplierApi:type === 'hotel' ? 'mock_hotels_v1' : 'mock_flights_v1',
    status:'CONFIRMED',
    supplierReference:reference,
    confirmationNumber:reference,
    bookedAt:new Date().toISOString(),
    message:'Mock supplier booking confirmed. No real supplier booking or payment was made.',
    request:body
  });
}
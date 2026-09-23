import { NextRequest, NextResponse } from 'next/server';

const flights = [
  { id:'MOCK-FLT-001', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Pakistan International Airlines', flightNumber:'PK-211', from:'ISB', to:'DXB', departure:'08:30', arrival:'11:20', duration:'3h 50m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:52000, taxes:7800, totalSupplierPrice:59800, currency:'PKR' },
  { id:'MOCK-FLT-002', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Emirates', flightNumber:'EK-615', from:'ISB', to:'DXB', departure:'03:15', arrival:'06:05', duration:'3h 50m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:68500, taxes:10275, totalSupplierPrice:78775, currency:'PKR' },
  { id:'MOCK-FLT-003', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Saudi Arabian Airlines', flightNumber:'SV-727', from:'ISB', to:'JED', departure:'02:20', arrival:'05:35', duration:'5h 15m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:72000, taxes:10800, totalSupplierPrice:82800, currency:'PKR' },
  { id:'MOCK-FLT-004', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Qatar Airways', flightNumber:'QR-615', from:'LHE', to:'DOH', departure:'09:55', arrival:'11:55', duration:'4h 00m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:61000, taxes:9150, totalSupplierPrice:70150, currency:'PKR' },
  { id:'MOCK-FLT-005', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Air Arabia', flightNumber:'G9-553', from:'KHI', to:'DXB', departure:'17:40', arrival:'19:05', duration:'2h 25m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:38500, taxes:5775, totalSupplierPrice:44275, currency:'PKR' },
  { id:'MOCK-FLT-006', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Flynas', flightNumber:'XY-316', from:'LHE', to:'RUH', departure:'04:10', arrival:'07:15', duration:'4h 05m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:55000, taxes:8250, totalSupplierPrice:63250, currency:'PKR' },
  { id:'MOCK-FLT-007', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Turkish Airlines', flightNumber:'TK-711', from:'ISB', to:'IST', departure:'06:20', arrival:'11:15', duration:'8h 55m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:92000, taxes:13800, totalSupplierPrice:105800, currency:'PKR' },
  { id:'MOCK-FLT-008', provider:'Mock Supplier', supplierApi:'mock_flights_v1', airline:'Etihad Airways', flightNumber:'EY-232', from:'ISB', to:'AUH', departure:'04:30', arrival:'07:00', duration:'3h 30m', stops:0, cabin:'Economy', baggage:'30kg', baseFare:64000, taxes:9600, totalSupplierPrice:73600, currency:'PKR' },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from')?.toUpperCase();
  const to = searchParams.get('to')?.toUpperCase();
  const results = flights.filter(f => (!from || f.from.includes(from)) && (!to || f.to.includes(to)));
  return NextResponse.json({ success:true, supplier:'mock', api:'mock_flights_v1', currency:'PKR', count:results.length, results });
}
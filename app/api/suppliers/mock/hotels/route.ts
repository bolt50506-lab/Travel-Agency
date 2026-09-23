import { NextRequest, NextResponse } from 'next/server';

const hotels = [
  { id:'MOCK-HOT-001', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Pearl Continental Islamabad', city:'Islamabad', stars:5, location:'Blue Area', room:'Deluxe King', board:'Room Only', roomsAvailable:8, nightlySupplierPrice:28500, currency:'PKR', amenities:['WiFi','Breakfast available','Airport transfer'] },
  { id:'MOCK-HOT-002', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Islamabad Serena Hotel', city:'Islamabad', stars:5, location:'Khayaban-e-Suharwardy', room:'Deluxe Room', board:'Breakfast Included', roomsAvailable:5, nightlySupplierPrice:32000, currency:'PKR', amenities:['WiFi','Breakfast','Pool','Gym'] },
  { id:'MOCK-HOT-003', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Ramada by Wyndham Dubai', city:'Dubai', stars:4, location:'Jumeirah', room:'Deluxe Room', board:'Breakfast Included', roomsAvailable:12, nightlySupplierPrice:36500, currency:'PKR', amenities:['WiFi','Breakfast','Pool','Gym'] },
  { id:'MOCK-HOT-004', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Swissotel Al Maqam Makkah', city:'Makkah', stars:5, location:'Haram Area', room:'Superior Room', board:'Breakfast Included', roomsAvailable:6, nightlySupplierPrice:54000, currency:'PKR', amenities:['WiFi','Breakfast','Near Haram'] },
  { id:'MOCK-HOT-005', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Anwar Al Madinah Movenpick', city:'Madinah', stars:5, location:'Central Area', room:'Classic Room', board:'Breakfast Included', roomsAvailable:7, nightlySupplierPrice:47500, currency:'PKR', amenities:['WiFi','Breakfast','Near Masjid an-Nabawi'] },
  { id:'MOCK-HOT-006', provider:'Mock Supplier', supplierApi:'mock_hotels_v1', name:'Holiday Inn Riyadh Olaya', city:'Riyadh', stars:4, location:'Olaya', room:'Standard King', board:'Room Only', roomsAvailable:10, nightlySupplierPrice:29000, currency:'PKR', amenities:['WiFi','Pool','Gym'] },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city')?.trim().toLowerCase();
  const results = hotels.filter(h => !city || h.city.toLowerCase().includes(city));
  return NextResponse.json({ success:true, supplier:'mock', api:'mock_hotels_v1', currency:'PKR', count:results.length, results });
}
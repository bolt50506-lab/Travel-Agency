import type { HotelOffer } from '@/types/hotel';

export const mockHotelImages: Record<string, string[]> = {
  default: [
    'https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/70441/pexels-photo-70441.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3209035/pexels-photo-3209035.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/3144580/pexels-photo-3144580.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/53511/shipping-containers-cargo-container-shipping-53511.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/210265/pexels-photo-210265.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2467558/pexels-photo-2467558.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://images.pexels.com/photos/2581542/pexels-photo-2581542.jpeg?auto=compress&cs=tinysrgb&w=800',
  ],
};

export const hotelImagePool = mockHotelImages.default;

export const mockHotelDestinations = [
  { city: 'Islamabad', country: 'Pakistan' },
  { city: 'Lahore', country: 'Pakistan' },
  { city: 'Karachi', country: 'Pakistan' },
  { city: 'Murree', country: 'Pakistan' },
  { city: 'Hunza', country: 'Pakistan' },
  { city: 'Skardu', country: 'Pakistan' },
  { city: 'Dubai', country: 'United Arab Emirates' },
  { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  { city: 'Makkah', country: 'Saudi Arabia' },
  { city: 'Madinah', country: 'Saudi Arabia' },
  { city: 'Jeddah', country: 'Saudi Arabia' },
  { city: 'Doha', country: 'Qatar' },
  { city: 'Istanbul', country: 'Türkiye' },
  { city: 'London', country: 'United Kingdom' },
  { city: 'Paris', country: 'France' },
  { city: 'Singapore', country: 'Singapore' },
  { city: 'Tokyo', country: 'Japan' },
  { city: 'Bangkok', country: 'Thailand' },
  { city: 'Rome', country: 'Italy' },
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'New York', country: 'United States' },
];

export const mockHotelChains = [
  'Grand Hyatt', 'Hilton', 'Marriott', 'Four Seasons', 'Ritz-Carlton',
  'Shangri-La', 'Mandarin Oriental', 'InterContinental', 'Westin', 'Le Meridien',
  'Park Plaza', 'Crown Plaza', 'Novotel', 'Pullman', 'Sofitel',
];

export const mockHotelAmenities = [
  'Free WiFi', 'Swimming Pool', 'Fitness Center', 'Spa', 'Restaurant',
  'Bar', 'Room Service', 'Business Center', 'Parking', 'Airport Shuttle',
  'Concierge', 'Laundry', 'Air Conditioning', 'Pet Friendly', 'Family Rooms',
];

export const mockPropertyTypes = [
  'Hotel', 'Resort', 'Boutique Hotel', 'Apartment', 'Villa',
  'Guest House', 'Hostel', 'Serviced Apartment',
];

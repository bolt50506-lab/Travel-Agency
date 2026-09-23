import { z } from 'zod';

export const flightSearchSchema = z.object({
  tripType: z.enum(['round-trip', 'one-way', 'multi-city']),
  origin: z.string().min(3, 'Origin is required'),
  destination: z.string().min(3, 'Destination is required'),
  departDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().optional(),
  passengers: z.object({
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(8),
    infants: z.number().int().min(0).max(4),
  }),
  cabinClass: z.enum(['economy', 'premium-economy', 'business', 'first']),
  multiCitySegments: z
    .array(
      z.object({
        origin: z.string(),
        destination: z.string(),
        date: z.string(),
      })
    )
    .optional(),
}).refine(
  (data) => data.tripType !== 'round-trip' || !!data.returnDate,
  { message: 'Return date is required for round-trip', path: ['returnDate'] }
);

export const flightRevalidateSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1),
});

export const flightBookSchema = z.object({
  offerId: z.string().min(1),
  searchId: z.string().min(1),
  passengers: z.array(
    z.object({
      type: z.enum(['adult', 'child', 'infant']),
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      dateOfBirth: z.string().min(1, 'Date of birth is required'),
      gender: z.enum(['male', 'female', 'other']).optional(),
      passportNumber: z.string().optional(),
      nationality: z.string().optional(),
    })
  ).min(1, 'At least one passenger is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(1, 'Phone number is required'),
});

export const hotelSearchSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  checkIn: z.string().min(1, 'Check-in date is required'),
  checkOut: z.string().min(1, 'Check-out date is required'),
  guests: z.number().int().min(1).max(20),
  rooms: z.number().int().min(1).max(9),
}).refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  { message: 'Check-out must be after check-in', path: ['checkOut'] }
);

export const hotelRevalidateSchema = z.object({
  hotelId: z.string().min(1),
  roomId: z.string().min(1),
  searchId: z.string().min(1),
});

export const hotelBookSchema = z.object({
  hotelId: z.string().min(1),
  roomId: z.string().min(1),
  searchId: z.string().min(1),
  guests: z.array(
    z.object({
      firstName: z.string().min(1, 'First name is required'),
      lastName: z.string().min(1, 'Last name is required'),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    })
  ).min(1, 'At least one guest is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  specialRequests: z.string().optional(),
});

export const paymentSchema = z.object({
  bookingReference: z.string().min(1),
  amount: z.object({
    amount: z.number().positive(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'AED']),
  }),
  method: z.enum(['card', 'paypal', 'bank-transfer', 'wallet']),
  card: z
    .object({
      number: z.string().min(12),
      name: z.string().min(1),
      expiry: z.string().min(4),
      cvv: z.string().min(3),
    })
    .optional(),
  billingAddress: z
    .object({
      line1: z.string(),
      city: z.string(),
      country: z.string(),
      postalCode: z.string(),
    })
    .optional(),
}).refine(
  (data) => data.method !== 'card' || !!data.card,
  { message: 'Card details are required for card payment', path: ['card'] }
);

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

export type FlightSearchInput = z.infer<typeof flightSearchSchema>;
export type HotelSearchInput = z.infer<typeof hotelSearchSchema>;
export type FlightBookInput = z.infer<typeof flightBookSchema>;
export type HotelBookInput = z.infer<typeof hotelBookSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

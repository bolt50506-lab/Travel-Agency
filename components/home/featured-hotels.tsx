import Link from 'next/link';
import Image from 'next/image';
import { Star, MapPin } from 'lucide-react';

const hotels = [
  {
    name: 'Grand Hyatt London',
    city: 'London',
    country: 'United Kingdom',
    rating: 4.8,
    starRating: 5,
    price: 45000,
    image: 'https://images.pexels.com/photos/2259226/pexels-photo-2259226.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Marriott Dubai',
    city: 'Dubai',
    country: 'UAE',
    rating: 4.7,
    starRating: 5,
    price: 36000,
    image: 'https://images.pexels.com/photos/7974839/pexels-photo-7974839.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Shangri-La Tokyo',
    city: 'Tokyo',
    country: 'Japan',
    rating: 4.9,
    starRating: 5,
    price: 52000,
    image: 'https://images.pexels.com/photos/2467558/pexels-photo-2467558.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
  {
    name: 'Four Seasons Sydney',
    city: 'Sydney',
    country: 'Australia',
    rating: 4.8,
    starRating: 5,
    price: 48000,
    image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=600',
  },
];

export function FeaturedHotels() {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Featured Hotels</h2>
          <p className="text-sm text-muted-foreground mt-1">Handpicked stays with starting rates shown in PKR</p>
        </div>
        <Link href="/hotels" className="text-sm font-medium text-primary hover:underline hidden sm:block">
          Browse hotels
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {hotels.map((hotel) => (
          <Link
            key={hotel.name}
            href={`/hotels/results?destination=${hotel.city}&checkIn=${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}&checkOut=${new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]}&guests=2&rooms=1`}
            className="group overflow-hidden rounded-lg border border-border bg-card hover:shadow-md transition-all"
          >
            <div className="aspect-[4/3] relative overflow-hidden">
              <Image
                src={hotel.image}
                alt={hotel.name}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, 25vw"
              />
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
              </div>
              <h3 className="mt-1.5 text-sm font-semibold truncate">{hotel.name}</h3>
              <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                {hotel.city}, {hotel.country}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">{hotel.rating} rating</span>
                <span className="text-sm font-bold">PKR {hotel.price.toLocaleString('en-PK')}<span className="text-xs font-normal text-muted-foreground">/night</span></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

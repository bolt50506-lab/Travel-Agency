import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

const destinations = [
  { city: 'London', country: 'United Kingdom', image: 'https://images.pexels.com/photos/10180377/pexels-photo-10180377.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 320 },
  { city: 'Dubai', country: 'UAE', image: 'https://images.pexels.com/photos/7974839/pexels-photo-7974839.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 450 },
  { city: 'Tokyo', country: 'Japan', image: 'https://images.pexels.com/photos/28807189/pexels-photo-28807189.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 680 },
  { city: 'Sydney', country: 'Australia', image: 'https://images.pexels.com/photos/37930273/pexels-photo-37930273.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 890 },
  { city: 'Toronto', country: 'Canada', image: 'https://images.pexels.com/photos/39627996/pexels-photo-39627996.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 290 },
  { city: 'Baku', country: 'Azerbaijan', image: 'https://images.pexels.com/photos/38509992/pexels-photo-38509992.jpeg?auto=compress&cs=tinysrgb&w=600', priceFrom: 380 },
];

export function PopularDestinations() {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Popular Destinations</h2>
          <p className="text-sm text-muted-foreground mt-1">Trending travel spots our customers love</p>
        </div>
        <Link href="/flights" className="text-sm font-medium text-primary hover:underline hidden sm:block">
          View all <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {destinations.map((dest) => (
          <Link
            key={dest.city}
            href={`/flights/results?origin=JFK&destination=${dest.city.slice(0, 3).toUpperCase()}&departDate=${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}&adults=1&cabinClass=economy&tripType=one-way`}
            className="group relative overflow-hidden rounded-lg border border-border"
          >
            <div className="aspect-[3/4] relative">
              <Image
                src={dest.image}
                alt={dest.city}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 16vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-sm font-semibold text-white">{dest.city}</p>
                <p className="text-xs text-white/70">{dest.country}</p>
                <p className="text-xs text-white/90 mt-1">From ${dest.priceFrom}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const routes = [
  { from: 'New York', to: 'London', fromCode: 'JFK', toCode: 'LHR', price: 320, duration: '7h 30m' },
  { from: 'Los Angeles', to: 'Tokyo', fromCode: 'LAX', toCode: 'HND', price: 680, duration: '11h 45m' },
  { from: 'Dubai', to: 'Singapore', fromCode: 'DXB', toCode: 'SIN', price: 390, duration: '7h 15m' },
  { from: 'London', to: 'Paris', fromCode: 'LHR', toCode: 'CDG', price: 120, duration: '1h 20m' },
  { from: 'Frankfurt', to: 'Istanbul', fromCode: 'FRA', toCode: 'IST', price: 180, duration: '3h 10m' },
  { from: 'Sydney', to: 'Singapore', fromCode: 'SYD', toCode: 'SIN', price: 520, duration: '8h 05m' },
];

export function PopularRoutes() {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Popular Flight Routes</h2>
          <p className="text-sm text-muted-foreground mt-1">Most booked routes this month</p>
        </div>
        <Link href="/flights" className="text-sm font-medium text-primary hover:underline hidden sm:block">
          Search flights <ArrowRight className="inline h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {routes.map((route) => (
          <Link
            key={`${route.fromCode}-${route.toCode}`}
            href={`/flights/results?origin=${route.fromCode}&destination=${route.toCode}&departDate=${new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}&adults=1&cabinClass=economy&tripType=one-way`}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold">{route.fromCode}</p>
                <p className="text-xs text-muted-foreground">{route.from}</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="h-px w-12 bg-border relative">
                  <div className="absolute -top-1 right-0 h-2 w-2 border-t border-r border-muted-foreground rotate-45" />
                </div>
                <span className="text-xs text-muted-foreground mt-1">{route.duration}</span>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{route.toCode}</p>
                <p className="text-xs text-muted-foreground">{route.to}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">from</p>
              <p className="text-lg font-bold text-primary">${route.price}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

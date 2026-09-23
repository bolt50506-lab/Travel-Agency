import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const routes = [
  { from: 'Islamabad', to: 'Dubai', fromCode: 'ISB', toCode: 'DXB', price: 55000, duration: '3h 10m' },
  { from: 'Lahore', to: 'Dubai', fromCode: 'LHE', toCode: 'DXB', price: 52000, duration: '3h 00m' },
  { from: 'Karachi', to: 'Dubai', fromCode: 'KHI', toCode: 'DXB', price: 45000, duration: '2h 15m' },
  { from: 'Islamabad', to: 'Jeddah', fromCode: 'ISB', toCode: 'JED', price: 82000, duration: '5h 30m' },
  { from: 'Lahore', to: 'Doha', fromCode: 'LHE', toCode: 'DOH', price: 72000, duration: '4h 00m' },
  { from: 'Islamabad', to: 'Istanbul', fromCode: 'ISB', toCode: 'IST', price: 105000, duration: '6h 45m' },
];

export function PopularRoutes() {
  return (
    <section>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Popular Flight Routes</h2>
          <p className="text-sm text-muted-foreground mt-1">Popular international routes with starting fares in PKR</p>
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
              <p className="text-lg font-bold text-primary">PKR {route.price.toLocaleString('en-PK')}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

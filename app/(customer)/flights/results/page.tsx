'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ArrowRight, Clock, Plane, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FlightOffer } from '@/types/flight';
import { mockAirlines } from '@/lib/providers/flights/mock-data';
import { formatDuration, formatPrice } from '@/lib/utils/api';
import { cn } from '@/lib/utils';

type SortOption = 'price-asc' | 'price-desc' | 'duration-asc' | 'departure-asc';

export default function FlightResultsPage() {
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [filters, setFilters] = useState({
    stops: { nonstop: false, oneStop: false },
    airlines: {} as Record<string, boolean>,
    maxPrice: 500000,
    departureTime: { morning: false, afternoon: false, evening: false },
  });

  const query = useMemo(() => ({
    tripType: searchParams.get('tripType') || 'round-trip',
    origin: searchParams.get('origin') || '',
    destination: searchParams.get('destination') || '',
    departDate: searchParams.get('departDate') || '',
    returnDate: searchParams.get('returnDate') || undefined,
    passengers: {
      adults: parseInt(searchParams.get('adults') || '1'),
      children: parseInt(searchParams.get('children') || '0'),
      infants: parseInt(searchParams.get('infants') || '0'),
    },
    cabinClass: searchParams.get('cabinClass') || 'economy',
  }), [searchParams]);

  useEffect(() => {
    if (!query.origin || !query.destination || !query.departDate) {
      setError('Missing search parameters. Please search again from the home page.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch('/api/flights/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to search flights');
        }
        return res.json();
      })
      .then((data) => {
        setOffers(data.offers || []);
        setSearchId(data.searchId || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong while searching flights');
        setLoading(false);
      });
  }, [query.origin, query.destination, query.departDate, query.returnDate, query.cabinClass, query.tripType]);

  const filteredOffers = useMemo(() => {
    let result = [...offers];

    if (filters.stops.nonstop || filters.stops.oneStop) {
      result = result.filter((o) => {
        if (filters.stops.nonstop && o.stops === 0) return true;
        if (filters.stops.oneStop && o.stops === 1) return true;
        return false;
      });
    }

    const selectedAirlines = Object.entries(filters.airlines).filter(([, v]) => v).map(([k]) => k);
    if (selectedAirlines.length > 0) {
      result = result.filter((o) =>
        o.segments.some((s) => selectedAirlines.includes(s.airline.code))
      );
    }

    result = result.filter((o) => o.totalPrice.amount <= filters.maxPrice);

    if (filters.departureTime.morning || filters.departureTime.afternoon || filters.departureTime.evening) {
      result = result.filter((o) => {
        const hour = new Date(o.segments[0].departureTime).getHours();
        if (filters.departureTime.morning && hour >= 5 && hour < 12) return true;
        if (filters.departureTime.afternoon && hour >= 12 && hour < 18) return true;
        if (filters.departureTime.evening && (hour >= 18 || hour < 5)) return true;
        return false;
      });
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.totalPrice.amount - b.totalPrice.amount);
        break;
      case 'price-desc':
        result.sort((a, b) => b.totalPrice.amount - a.totalPrice.amount);
        break;
      case 'duration-asc':
        result.sort((a, b) => a.totalDuration - b.totalDuration);
        break;
      case 'departure-asc':
        result.sort((a, b) => new Date(a.segments[0].departureTime).getTime() - new Date(b.segments[0].departureTime).getTime());
        break;
    }

    return result;
  }, [offers, filters, sortBy]);

  const availableAirlines = useMemo(() => {
    const codes = new Set<string>();
    offers.forEach((o) => o.segments.forEach((s) => codes.add(s.airline.code)));
    return mockAirlines.filter((a) => codes.has(a.code));
  }, [offers]);

  const handleSelectFlight = (offer: FlightOffer) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('offerId', offer.id);
    params.set('searchId', searchId);
    // Keep the exact signed supplier/customer price snapshot for checkout.
    // This prevents a provider-specific revalidation response from replacing
    // the selected fare with an unrelated amount.
    try {
      sessionStorage.setItem('destino:selected-flight-offer', JSON.stringify(offer));
    } catch {
      // Navigation still works; checkout will fall back to server revalidation.
    }
    window.location.href = `/flights/checkout?${params.toString()}`;
  };

  return (
    <div className="container-page py-6">
      {/* Search Summary */}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{query.origin}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">{query.destination}</span>
        <span className="text-muted-foreground">·</span>
        <span>{new Date(query.departDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        {query.returnDate && (
          <>
            <span className="text-muted-foreground">—</span>
            <span>{new Date(query.returnDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </>
        )}
        <span className="text-muted-foreground">·</span>
        <span>{query.passengers.adults + query.passengers.children + query.passengers.infants} Passenger(s)</span>
        <span className="text-muted-foreground">·</span>
        <span className="capitalize">{query.cabinClass.replace('-', ' ')}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Filters</h3>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stops</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="nonstop"
                      checked={filters.stops.nonstop}
                      onCheckedChange={(v) => setFilters({ ...filters, stops: { ...filters.stops, nonstop: !!v } })}
                    />
                    <Label htmlFor="nonstop" className="text-sm cursor-pointer">Non-stop</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="oneStop"
                      checked={filters.stops.oneStop}
                      onCheckedChange={(v) => setFilters({ ...filters, stops: { ...filters.stops, oneStop: !!v } })}
                    />
                    <Label htmlFor="oneStop" className="text-sm cursor-pointer">1 Stop</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Airlines</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {availableAirlines.map((airline) => (
                    <div key={airline.code} className="flex items-center gap-2">
                      <Checkbox
                        id={`airline-${airline.code}`}
                        checked={filters.airlines[airline.code] || false}
                        onCheckedChange={(v) => setFilters({
                          ...filters,
                          airlines: { ...filters.airlines, [airline.code]: !!v },
                        })}
                      />
                      <Label htmlFor={`airline-${airline.code}`} className="text-sm cursor-pointer">{airline.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Departure Time</Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="morning"
                      checked={filters.departureTime.morning}
                      onCheckedChange={(v) => setFilters({ ...filters, departureTime: { ...filters.departureTime, morning: !!v } })}
                    />
                    <Label htmlFor="morning" className="text-sm cursor-pointer">Morning (5:00 - 12:00)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="afternoon"
                      checked={filters.departureTime.afternoon}
                      onCheckedChange={(v) => setFilters({ ...filters, departureTime: { ...filters.departureTime, afternoon: !!v } })}
                    />
                    <Label htmlFor="afternoon" className="text-sm cursor-pointer">Afternoon (12:00 - 18:00)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="evening"
                      checked={filters.departureTime.evening}
                      onCheckedChange={(v) => setFilters({ ...filters, departureTime: { ...filters.departureTime, evening: !!v } })}
                    />
                    <Label htmlFor="evening" className="text-sm cursor-pointer">Evening (18:00 - 5:00)</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Price: PKR ${filters.maxPrice.toLocaleString()}</Label>
                <input
                  type="range"
                  min={5000}
                  max={500000}
                  step={5000}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                  className="mt-2 w-full accent-primary"
                />
              </div>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : `${filteredOffers.length} flights found`}
            </p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="duration-asc">Shortest Duration</SelectItem>
                <SelectItem value="departure-asc">Earliest Departure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.href = '/'}>
                  Back to Search
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
            </>
          )}

          {!loading && !error && filteredOffers.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <Plane className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold">No flights found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search with different dates.</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/'}>
                New Search
              </Button>
            </div>
          )}

          {!loading && !error && filteredOffers.map((offer) => (
            <FlightResultCard key={offer.id} offer={offer} onSelect={() => handleSelectFlight(offer)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function FlightResultCard({ offer, onSelect }: { offer: FlightOffer; onSelect: () => void }) {
  const firstSegment = offer.segments[0];
  const lastSegment = offer.segments[offer.segments.length - 1];
  const depTime = new Date(firstSegment.departureTime);
  const arrTime = new Date(lastSegment.arrivalTime);

  return (
    <Card className="p-4 hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 shrink-0">
            <span className="text-xs font-bold text-primary">{firstSegment.airline.code}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-lg font-bold">{depTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-muted-foreground">{firstSegment.origin.code}</p>
              </div>
              <div className="flex-1 mx-2">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs text-muted-foreground">{formatDuration(offer.totalDuration)}</span>
                </div>
                <div className="relative flex items-center mt-1">
                  <div className="h-px flex-1 bg-border" />
                  {offer.stops > 0 && (
                    <span className="text-xs text-muted-foreground px-1.5 bg-background">
                      {offer.stops} stop{offer.stops > 1 ? 's' : ''}
                    </span>
                  )}
                  <div className="h-px flex-1 bg-border" />
                  <Plane className="absolute left-1/2 -translate-x-1/2 h-3 w-3 text-muted-foreground bg-background px-0.5" />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold">{arrTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                <p className="text-xs text-muted-foreground">{lastSegment.destination.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">{firstSegment.airline.name}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{firstSegment.flightNumber}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">{firstSegment.cabinClass.replace('-', ' ')}</span>
              {offer.refundable && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <Badge variant="secondary" className="text-xs">Refundable</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xl font-bold">{formatPrice(offer.totalPrice.amount, offer.totalPrice.currency)}</p>
            <p className="text-xs text-muted-foreground">incl. taxes & fees</p>
          </div>
          <Button size="sm" onClick={onSelect}>
            Select
          </Button>
        </div>
      </div>
    </Card>
  );
}

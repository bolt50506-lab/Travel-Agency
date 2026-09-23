'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Star, MapPin, AlertCircle, Loader2, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { HotelOffer } from '@/types/hotel';
import { formatPrice } from '@/lib/utils/api';

type SortOption = 'price-asc' | 'price-desc' | 'rating-desc' | 'stars-desc';

export default function HotelResultsPage() {
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [filters, setFilters] = useState({
    starRating: {} as Record<number, boolean>,
    minRating: 0,
    maxPrice: 200000,
    amenities: {} as Record<string, boolean>,
  });

  const query = useMemo(() => ({
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    guests: parseInt(searchParams.get('guests') || '2'),
    rooms: parseInt(searchParams.get('rooms') || '1'),
  }), [searchParams]);

  useEffect(() => {
    if (!query.destination || !query.checkIn || !query.checkOut) {
      setError('Missing search parameters. Please search again from the home page.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch('/api/hotels/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to search hotels');
        }
        return res.json();
      })
      .then((data) => {
        setOffers(data.offers || []);
        setSearchId(data.searchId || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong while searching hotels');
        setLoading(false);
      });
  }, [query.destination, query.checkIn, query.checkOut, query.guests, query.rooms]);

  const filteredOffers = useMemo(() => {
    let result = [...offers];

    const selectedStars = Object.entries(filters.starRating).filter(([, v]) => v).map(([k]) => parseInt(k));
    if (selectedStars.length > 0) {
      result = result.filter((o) => selectedStars.includes(o.starRating));
    }

    result = result.filter((o) => o.guestRating >= filters.minRating);
    result = result.filter((o) => o.startingPrice.amount <= filters.maxPrice);

    const selectedAmenities = Object.entries(filters.amenities).filter(([, v]) => v).map(([k]) => k);
    if (selectedAmenities.length > 0) {
      result = result.filter((o) => selectedAmenities.every((a) => o.amenities.includes(a)));
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.startingPrice.amount - b.startingPrice.amount);
        break;
      case 'price-desc':
        result.sort((a, b) => b.startingPrice.amount - a.startingPrice.amount);
        break;
      case 'rating-desc':
        result.sort((a, b) => b.guestRating - a.guestRating);
        break;
      case 'stars-desc':
        result.sort((a, b) => b.starRating - a.starRating);
        break;
    }

    return result;
  }, [offers, filters, sortBy]);

  const availableAmenities = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => o.amenities.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [offers]);

  const handleSelectHotel = (hotel: HotelOffer) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('hotelId', hotel.id);
    params.set('searchId', searchId);
    window.location.href = `/hotels/checkout?${params.toString()}`;
  };

  return (
    <div className="container-page py-6">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">{query.destination}</span>
        <span className="text-muted-foreground">·</span>
        <span>{new Date(query.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span className="text-muted-foreground">—</span>
        <span>{new Date(query.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        <span className="text-muted-foreground">·</span>
        <span>{query.guests} Guest(s), {query.rooms} Room(s)</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">Filters</h3>

            <div className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Star Rating</Label>
                <div className="mt-2 space-y-2">
                  {[5, 4, 3].map((star) => (
                    <div key={star} className="flex items-center gap-2">
                      <Checkbox
                        id={`star-${star}`}
                        checked={filters.starRating[star] || false}
                        onCheckedChange={(v) => setFilters({
                          ...filters,
                          starRating: { ...filters.starRating, [star]: !!v },
                        })}
                      />
                      <Label htmlFor={`star-${star}`} className="text-sm cursor-pointer flex items-center gap-1">
                        {star} <Star className="h-3 w-3 fill-primary text-primary" />
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Guest Rating</Label>
                <div className="mt-2 space-y-2">
                  {[
                    { label: 'Excellent (4.5+)', value: 4.5 },
                    { label: 'Very Good (4+)', value: 4 },
                    { label: 'Good (3.5+)', value: 3.5 },
                  ].map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`rating-${opt.value}`}
                        checked={filters.minRating === opt.value}
                        onCheckedChange={(v) => setFilters({ ...filters, minRating: v ? opt.value : 0 })}
                      />
                      <Label htmlFor={`rating-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Price: PKR ${filters.maxPrice.toLocaleString()}/night</Label>
                <input
                  type="range"
                  min={2000}
                  max={200000}
                  step={2000}
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: parseInt(e.target.value) })}
                  className="mt-2 w-full accent-primary"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amenities</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {availableAmenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2">
                      <Checkbox
                        id={`amenity-${amenity}`}
                        checked={filters.amenities[amenity] || false}
                        onCheckedChange={(v) => setFilters({
                          ...filters,
                          amenities: { ...filters.amenities, [amenity]: !!v },
                        })}
                      />
                      <Label htmlFor={`amenity-${amenity}`} className="text-sm cursor-pointer">{amenity}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : `${filteredOffers.length} hotels found`}
            </p>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="rating-desc">Top Rated</SelectItem>
                <SelectItem value="stars-desc">Most Stars</SelectItem>
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
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-32 w-40 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}

          {!loading && !error && filteredOffers.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <BedDouble className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold">No hotels found</h3>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search with different dates.</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/'}>
                New Search
              </Button>
            </div>
          )}

          {!loading && !error && filteredOffers.map((hotel) => (
            <HotelResultCard key={hotel.id} hotel={hotel} nights={Math.max(1, Math.round((new Date(query.checkOut).getTime() - new Date(query.checkIn).getTime()) / 86400000))} onSelect={() => handleSelectHotel(hotel)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HotelResultCard({ hotel, nights, onSelect }: { hotel: HotelOffer; nights: number; onSelect: () => void }) {
  return (
    <Card className="overflow-hidden hover:border-primary/30 hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-48 sm:h-auto sm:w-64 shrink-0">
          <Image
            src={hotel.images[0]}
            alt={hotel.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 256px"
          />
        </div>

        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: hotel.starRating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                ))}
              </div>
              <h3 className="text-lg font-bold">{hotel.name}</h3>
              <p className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                {hotel.address}, {hotel.city}, {hotel.country}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1">
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {hotel.guestRating}
                </span>
                <span className="text-xs text-muted-foreground">({hotel.reviewCount})</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {hotel.amenities.slice(0, 5).map((a) => (
              <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
            ))}
            {hotel.amenities.length > 5 && (
              <Badge variant="outline" className="text-xs">+{hotel.amenities.length - 5} more</Badge>
            )}
          </div>

          <div className="mt-3">
            <p className="text-xs text-muted-foreground">{hotel.rooms.length} room types available</p>
            <p className="text-xs text-muted-foreground mt-0.5">Check-in: {hotel.checkInTime} · Check-out: {hotel.checkOutTime}</p>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">From</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(hotel.startingPrice.amount, hotel.startingPrice.currency)}</p>
              <p className="text-xs text-muted-foreground">per night · {nights} night{nights > 1 ? 's' : ''}</p>
            </div>
            <Button onClick={onSelect}>
              View Rooms
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

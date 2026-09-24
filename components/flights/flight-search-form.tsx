'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TripType, CabinClass } from '@/types/flight';
import { cn } from '@/lib/utils';

export function FlightSearchForm() {
  const router = useRouter();
  const [tripType, setTripType] = useState<TripType>('round-trip');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departDate, setDepartDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [cabinClass, setCabinClass] = useState<CabinClass>('economy');
  const [passengerOpen, setPassengerOpen] = useState(false);
  const [error, setError] = useState('');

  const totalPassengers = adults + children + infants;

  const handleSearch = () => {
    const from = origin.trim().toUpperCase();
    const to = destination.trim().toUpperCase();

    setError('');

    if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) {
      setError('Enter valid 3-letter IATA airport codes, for example ISB and DXB.');
      return;
    }

    if (from === to) {
      setError('Departure and arrival airports must be different.');
      return;
    }

    if (!departDate) {
      setError('Select a departure date.');
      return;
    }

    if (tripType === 'round-trip' && !returnDate) {
      setError('Select a return date for a round trip.');
      return;
    }

    const params = new URLSearchParams({
      tripType,
      origin: from,
      destination: to,
      departDate,
      adults: adults.toString(),
      children: children.toString(),
      infants: infants.toString(),
      cabinClass,
    });

    if (tripType === 'round-trip' && returnDate) {
      params.set('returnDate', returnDate);
    }

    router.push(`/flights/results?${params.toString()}`);
  };

  return (
    <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">
      <Tabs value={tripType} onValueChange={(v) => setTripType(v as TripType)}>
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
          <TabsTrigger value="one-way">One Way</TabsTrigger>
          <TabsTrigger value="multi-city">Multi City</TabsTrigger>
        </TabsList>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="origin">From</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase());
                  setError('');
                }}
                placeholder="IATA code, e.g. ISB"
                maxLength={3}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination">To</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase());
                  setError('');
                }}
                placeholder="IATA code, e.g. DXB"
                maxLength={3}
                autoComplete="off"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Use the airport's 3-letter IATA code. Search results and prices come directly from the configured flight provider.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="departDate">Departure</Label>
              <Input
                id="departDate"
                type="date"
                value={departDate}
                onChange={(e) => setDepartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {tripType === 'round-trip' && (
              <div className="space-y-1.5">
                <Label htmlFor="returnDate">Return</Label>
                <Input
                  id="returnDate"
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  min={departDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            )}

            {tripType === 'one-way' && (
              <CabinSelector id="cabinClass" value={cabinClass} onChange={setCabinClass} />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Passengers</Label>
              <Popover open={passengerOpen} onOpenChange={setPassengerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <Users className="mr-2 h-4 w-4" />
                    {totalPassengers} {totalPassengers === 1 ? 'Passenger' : 'Passengers'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <PassengerRow label="Adults" sublabel="12+ years" value={adults} onChange={setAdults} min={1} max={9} />
                    <PassengerRow label="Children" sublabel="2-11 years" value={children} onChange={setChildren} min={0} max={8} />
                    <PassengerRow label="Infants" sublabel="Under 2 years" value={infants} onChange={setInfants} min={0} max={4} />
                    <Button className="w-full" size="sm" onClick={() => setPassengerOpen(false)}>
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {tripType !== 'one-way' && (
              <CabinSelector id="cabinClass2" value={cabinClass} onChange={setCabinClass} />
            )}
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button size="lg" className="w-full" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search Flights
          </Button>
        </div>
      </Tabs>
    </div>
  );
}

function CabinSelector({
  id,
  value,
  onChange,
}: {
  id: string;
  value: CabinClass;
  onChange: (value: CabinClass) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Cabin Class</Label>
      <Select value={value} onValueChange={(v) => onChange(v as CabinClass)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="economy">Economy</SelectItem>
          <SelectItem value="premium-economy">Premium Economy</SelectItem>
          <SelectItem value="business">Business</SelectItem>
          <SelectItem value="first">First Class</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PassengerRow({
  label,
  sublabel,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  sublabel: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm',
            value <= min && 'cursor-not-allowed opacity-50'
          )}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          -
        </button>
        <span className="w-6 text-center text-sm font-medium">{value}</span>
        <button
          type="button"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm',
            value >= max && 'cursor-not-allowed opacity-50'
          )}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { mockAirports } from '@/lib/providers/flights/mock-data';
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

  const totalPassengers = adults + children + infants;

  const handleSearch = () => {
    if (!origin || !destination || !departDate) return;

    const params = new URLSearchParams({
      tripType,
      origin,
      destination,
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
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger id="origin">
                  <SelectValue placeholder="Departure city" />
                </SelectTrigger>
                <SelectContent>
                  {mockAirports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code}) — {airport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination">To</Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Arrival city" />
                </SelectTrigger>
                <SelectContent>
                  {mockAirports.map((airport) => (
                    <SelectItem key={airport.code} value={airport.code}>
                      {airport.city} ({airport.code}) — {airport.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
              <div className="space-y-1.5">
                <Label htmlFor="cabinClass">Cabin Class</Label>
                <Select value={cabinClass} onValueChange={(v) => setCabinClass(v as CabinClass)}>
                  <SelectTrigger id="cabinClass">
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
                    <PassengerRow
                      label="Adults"
                      sublabel="12+ years"
                      value={adults}
                      onChange={setAdults}
                      min={1}
                      max={9}
                    />
                    <PassengerRow
                      label="Children"
                      sublabel="2-11 years"
                      value={children}
                      onChange={setChildren}
                      min={0}
                      max={8}
                    />
                    <PassengerRow
                      label="Infants"
                      sublabel="Under 2 years"
                      value={infants}
                      onChange={setInfants}
                      min={0}
                      max={4}
                    />
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => setPassengerOpen(false)}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {tripType !== 'one-way' && (
              <div className="space-y-1.5">
                <Label htmlFor="cabinClass2">Cabin Class</Label>
                <Select value={cabinClass} onValueChange={(v) => setCabinClass(v as CabinClass)}>
                  <SelectTrigger id="cabinClass2">
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
            )}
          </div>

          <Button size="lg" className="w-full" onClick={handleSearch}>
            <Search className="mr-2 h-4 w-4" />
            Search Flights
          </Button>
        </div>
      </Tabs>
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
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm',
            value <= min && 'opacity-50 cursor-not-allowed'
          )}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          -
        </button>
        <span className="w-6 text-center text-sm font-medium">{value}</span>
        <button
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm',
            value >= max && 'opacity-50 cursor-not-allowed'
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

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronsUpDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TripType, CabinClass } from '@/types/flight';
import { cn } from '@/lib/utils';

const AIRPORTS = [
  ['ISB', 'Islamabad International Airport', 'Islamabad, Pakistan'],
  ['KHI', 'Jinnah International Airport', 'Karachi, Pakistan'],
  ['LHE', 'Allama Iqbal International Airport', 'Lahore, Pakistan'],
  ['PEW', 'Bacha Khan International Airport', 'Peshawar, Pakistan'],
  ['MUX', 'Multan International Airport', 'Multan, Pakistan'],
  ['SKT', 'Sialkot International Airport', 'Sialkot, Pakistan'],
  ['DXB', 'Dubai International Airport', 'Dubai, UAE'],
  ['AUH', 'Zayed International Airport', 'Abu Dhabi, UAE'],
  ['SHJ', 'Sharjah International Airport', 'Sharjah, UAE'],
  ['DOH', 'Hamad International Airport', 'Doha, Qatar'],
  ['RUH', 'King Khalid International Airport', 'Riyadh, Saudi Arabia'],
  ['JED', 'King Abdulaziz International Airport', 'Jeddah, Saudi Arabia'],
  ['DMM', 'King Fahd International Airport', 'Dammam, Saudi Arabia'],
  ['MED', 'Prince Mohammad bin Abdulaziz International Airport', 'Medina, Saudi Arabia'],
  ['MCT', 'Muscat International Airport', 'Muscat, Oman'],
  ['BAH', 'Bahrain International Airport', 'Manama, Bahrain'],
  ['KWI', 'Kuwait International Airport', 'Kuwait City, Kuwait'],
  ['IST', 'Istanbul Airport', 'Istanbul, Türkiye'],
  ['LHR', 'Heathrow Airport', 'London, UK'],
  ['LGW', 'Gatwick Airport', 'London, UK'],
  ['CDG', 'Charles de Gaulle Airport', 'Paris, France'],
  ['FRA', 'Frankfurt Airport', 'Frankfurt, Germany'],
  ['JFK', 'John F. Kennedy International Airport', 'New York, USA'],
  ['EWR', 'Newark Liberty International Airport', 'Newark, USA'],
  ['ORD', 'O’Hare International Airport', 'Chicago, USA'],
  ['LAX', 'Los Angeles International Airport', 'Los Angeles, USA'],
  ['YYZ', 'Toronto Pearson International Airport', 'Toronto, Canada'],
  ['BKK', 'Suvarnabhumi Airport', 'Bangkok, Thailand'],
  ['KUL', 'Kuala Lumpur International Airport', 'Kuala Lumpur, Malaysia'],
  ['SIN', 'Singapore Changi Airport', 'Singapore'],
  ['SYD', 'Sydney Airport', 'Sydney, Australia'],
] as const;

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
  const [airportOpen, setAirportOpen] = useState<'origin' | 'destination' | null>(null);
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
            <AirportSelector
              label="From"
              value={origin}
              open={airportOpen === 'origin'}
              onOpenChange={(open) => setAirportOpen(open ? 'origin' : null)}
              onChange={(value) => { setOrigin(value); setError(''); }}
            />

            <AirportSelector
              label="To"
              value={destination}
              open={airportOpen === 'destination'}
              onOpenChange={(open) => setAirportOpen(open ? 'destination' : null)}
              onChange={(value) => { setDestination(value); setError(''); }}
            />
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


function AirportSelector({
  label,
  value,
  open,
  onOpenChange,
  onChange,
}: {
  label: string;
  value: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const filteredAirports = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return AIRPORTS;
    return AIRPORTS.filter(([code, name, city]) =>
      code.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      city.toLowerCase().includes(q)
    );
  }, [query]);

  const selected = AIRPORTS.find(([code]) => code === value);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          if (!next) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between px-3 font-normal"
          >
            <span className="flex min-w-0 items-center gap-2 text-left">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? (
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{selected[0]}</span>
                  <span className="text-muted-foreground"> · {selected[2]}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Search airport or city</span>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(420px,calc(100vw-2rem))] p-2" align="start">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, airport or IATA code..."
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredAirports.length ? (
              filteredAirports.map(([code, name, city]) => (
                <button
                  key={code}
                  type="button"
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-muted"
                  onClick={() => {
                    onChange(code);
                    onOpenChange(false);
                    setQuery('');
                  }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{city}</span>
                    <span className="block truncate text-xs text-muted-foreground">{name}</span>
                  </span>
                  <span className="ml-3 shrink-0 text-sm font-semibold">{code}</span>
                </button>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No airports found. You can still enter a 3-letter IATA code below.
              </p>
            )}
          </div>
          <div className="mt-2 border-t pt-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase())}
              placeholder="Or enter IATA code"
              maxLength={3}
              autoComplete="off"
            />
          </div>
        </PopoverContent>
      </Popover>
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

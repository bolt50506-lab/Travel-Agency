'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Calendar, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { mockHotelDestinations } from '@/lib/providers/hotels/mock-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function HotelSearchForm() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);

  const handleSearch = () => {
    if (!destination || !checkIn || !checkOut) return;

    const params = new URLSearchParams({
      destination,
      checkIn,
      checkOut,
      guests: guests.toString(),
      rooms: rooms.toString(),
    });

    router.push(`/hotels/results?${params.toString()}`);
  };

  return (
    <div className="w-full rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="hotelDestination">Destination</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger id="hotelDestination">
              <SelectValue placeholder="Where are you going?" />
            </SelectTrigger>
            <SelectContent>
              {mockHotelDestinations.map((d) => (
                <SelectItem key={d.city} value={d.city}>
                  {d.city}, {d.country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="checkIn">Check-in</Label>
            <Input
              id="checkIn"
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="checkOut">Check-out</Label>
            <Input
              id="checkOut"
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Guests & Rooms</Label>
          <Popover open={guestOpen} onOpenChange={setGuestOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <BedDouble className="mr-2 h-4 w-4" />
                {guests} {guests === 1 ? 'Guest' : 'Guests'}, {rooms} {rooms === 1 ? 'Room' : 'Rooms'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Guests</p>
                    <p className="text-xs text-muted-foreground">Total travelers</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-50"
                      disabled={guests <= 1}
                      onClick={() => setGuests(guests - 1)}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{guests}</span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-50"
                      disabled={guests >= 20}
                      onClick={() => setGuests(guests + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Rooms</p>
                    <p className="text-xs text-muted-foreground">Number of rooms</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-50"
                      disabled={rooms <= 1}
                      onClick={() => setRooms(rooms - 1)}
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{rooms}</span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm disabled:opacity-50"
                      disabled={rooms >= 9}
                      onClick={() => setRooms(rooms + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button className="w-full" size="sm" onClick={() => setGuestOpen(false)}>
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Button size="lg" className="w-full" onClick={handleSearch}>
          <Search className="mr-2 h-4 w-4" />
          Search Hotels
        </Button>
      </div>
    </div>
  );
}

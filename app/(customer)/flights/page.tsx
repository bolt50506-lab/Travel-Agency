'use client';

import { FlightSearchForm } from '@/components/flights/flight-search-form';

export default function FlightsPage() {
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search Flights</h1>
        <p className="text-sm text-muted-foreground mt-1">Find the best deals on flights worldwide.</p>
      </div>
      <div className="max-w-3xl">
        <FlightSearchForm />
      </div>
    </div>
  );
}

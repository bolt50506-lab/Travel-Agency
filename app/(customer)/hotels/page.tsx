'use client';

import { HotelSearchForm } from '@/components/hotels/hotel-search-form';

export default function HotelsPage() {
  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Search Hotels</h1>
        <p className="text-sm text-muted-foreground mt-1">Find and book hotels at the best prices.</p>
      </div>
      <div className="max-w-3xl">
        <HotelSearchForm />
      </div>
    </div>
  );
}

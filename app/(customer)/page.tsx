'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlightSearchForm } from '@/components/flights/flight-search-form';
import { HotelSearchForm } from '@/components/hotels/hotel-search-form';
import { PopularDestinations } from '@/components/home/popular-destinations';
import { PopularRoutes } from '@/components/home/popular-routes';
import { FeaturedHotels } from '@/components/home/featured-hotels';
import { WhyBookWithUs } from '@/components/home/why-book-with-us';
import { CustomerSupport } from '@/components/home/customer-support';

export default function Home() {
  const [activeTab, setActiveTab] = useState('flights');

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/33976726/pexels-photo-33976726.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative container-page py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl text-balance">
              Search. Book. Travel.
            </h1>
            <p className="mt-4 text-lg text-white/80 md:text-xl max-w-xl">
              Compare flights and hotels from hundreds of providers. Find the best deals and book with confidence.
            </p>
          </div>

          <div className="mt-8 max-w-3xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/10 backdrop-blur border border-white/20">
                <TabsTrigger
                  value="flights"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary text-white"
                >
                  Flights
                </TabsTrigger>
                <TabsTrigger
                  value="hotels"
                  className="data-[state=active]:bg-white data-[state=active]:text-primary text-white"
                >
                  Hotels
                </TabsTrigger>
              </TabsList>

              <TabsContent value="flights" className="mt-4">
                <FlightSearchForm />
              </TabsContent>
              <TabsContent value="hotels" className="mt-4">
                <HotelSearchForm />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <div className="container-page py-12 space-y-16">
        <PopularDestinations />
        <PopularRoutes />
        <FeaturedHotels />
        <WhyBookWithUs />
        <CustomerSupport />
      </div>
    </div>
  );
}

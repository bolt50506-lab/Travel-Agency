'use client';

import { useState } from 'react';
import { ArrowRight, BadgeCheck, Hotel, Plane, ShieldCheck, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlightSearchForm } from '@/components/flights/flight-search-form';
import { HotelSearchForm } from '@/components/hotels/hotel-search-form';
import { PopularDestinations } from '@/components/home/popular-destinations';
import { PopularRoutes } from '@/components/home/popular-routes';
import { FeaturedHotels } from '@/components/home/featured-hotels';
import { WhyBookWithUs } from '@/components/home/why-book-with-us';
import { CustomerSupport } from '@/components/home/customer-support';
import { UmrahPackages } from '@/components/home/umrah-packages';

export default function Home() {
  const [activeTab, setActiveTab] = useState('flights');

  return (
    <div className="flex flex-col">
      <section className="relative isolate overflow-hidden bg-[#062f35]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.pexels.com/photos/33976726/pexels-photo-33976726.jpeg?auto=compress&cs=tinysrgb&w=1920)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#062f35]/90 via-[#063b42]/75 to-[#021f24]/95" />
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#20b8b0]/20 blur-3xl animate-float-slow" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#d4af37]/18 blur-3xl animate-drift" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#20b8b0]/15 blur-3xl animate-float-slow" />

        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative container-page py-14 md:py-20 lg:py-24">
          <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div id="hero-workflow-badge" className="!mb-6 !inline-flex !items-center !gap-2 !rounded-full !border !border-[#e5c45b]/60 !bg-[#0a4b50]/90 !px-4 !py-2.5 !text-xs !font-semibold !tracking-[0.12em] !text-[#f4d77b] !uppercase !shadow-lg !shadow-black/20 !backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-[#e5c45b]" />
              <span>FLIGHTS • HOTELS • UMRAH • TRAVEL SERVICES</span>
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-white drop-shadow-2xl sm:text-5xl md:text-6xl lg:text-7xl">
              Travel, planned with
              <span className="block bg-gradient-to-r from-[#f1d06b] via-[#e5bd4f] to-white bg-clip-text pb-2 font-serif italic font-medium text-transparent">
                confidence.
              </span>
            </h1>
            <div className="mt-6 h-px w-24 bg-[#e2bc4d]" />
            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/80 md:text-lg">
              Compare flight and hotel options in PKR, choose what works for you, and complete your booking through a professional travel agency workflow.
            </p>
          </div>

          <div className="relative mt-9 max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            <div className="rounded-3xl border border-white/15 bg-white/[0.08] p-2 shadow-2xl shadow-black/20 backdrop-blur-2xl md:p-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid h-auto w-full max-w-sm grid-cols-2 bg-white/10 p-1">
                  <TabsTrigger value="flights" className="gap-2 rounded-xl py-2.5 text-white data-[state=active]:bg-[#d4af37] data-[state=active]:text-[#062f35]"><Plane className="h-4 w-4" />Flights</TabsTrigger>
                  <TabsTrigger value="hotels" className="gap-2 rounded-xl py-2.5 text-white data-[state=active]:bg-white data-[state=active]:text-primary"><Hotel className="h-4 w-4" />Hotels</TabsTrigger>
                </TabsList>
                <TabsContent value="flights" className="mt-3"><FlightSearchForm /></TabsContent>
                <TabsContent value="hotels" className="mt-3"><HotelSearchForm /></TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="mt-7 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              [ShieldCheck, 'Secure booking', 'Clear PKR pricing and payment tracking'],
              [BadgeCheck, 'Travel agency support', 'Human assistance when your trip needs it'],
              [ArrowRight, 'One place to manage', 'Bookings, documents and status together'],
            ].map(([Icon, title, text]) => (
              <div key={title as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#073f45]/60 p-3.5 text-white/80 backdrop-blur">
                <div className="rounded-xl bg-white/10 p-2"><Icon className="h-4 w-4 text-[#f0cd62]" /></div>
                <div><p className="text-sm font-semibold text-white">{title as string}</p><p className="text-xs text-white/55">{text as string}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page space-y-16 py-12 md:py-16">
        <PopularDestinations />
        <PopularRoutes />
        <FeaturedHotels />
        <UmrahPackages />
        <WhyBookWithUs />
        <CustomerSupport />
      </div>
    </div>
  );
}

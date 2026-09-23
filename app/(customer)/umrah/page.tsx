'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bus, CalendarDays, Check, Hotel, MapPinned, Plane, ShieldCheck, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/api';

type Package = {
  id: string;
  name: string;
  short_description?: string | null;
  badge?: string | null;
  image_url?: string | null;
  makkah_hotel?: string | null;
  madinah_hotel?: string | null;
  transport?: string | null;
  visa_included: boolean;
  flights_included: boolean;
  ziyarat_included: boolean;
  duration_days?: number | null;
  room_sharing?: string | null;
  price_per_pilgrim: number;
  departure_date?: string | null;
  return_date?: string | null;
  seats?: number | null;
};

export default function UmrahPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    setSelectedId(id);
    fetch('/api/umrah-packages')
      .then((res) => res.json())
      .then((data) => setPackages(data.packages || []))
      .catch(() => setPackages([]))
      .finally(() => setLoading(false));
  }, []);

  const selected = packages.find((pkg) => pkg.id === selectedId);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,.16),transparent_30%)]" />
        <div className="relative container-page py-16 md:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> Umrah with Destino Travels</span>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">A peaceful journey, thoughtfully arranged.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70 md:text-lg">Choose from our Umrah packages with transparent PKR pricing, accommodation in Makkah and Madinah, transport and optional travel services clearly shown.</p>
          </div>
        </div>
      </section>

      <div className="container-page py-12 md:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Available departures</p><h2 className="mt-1 text-2xl font-bold md:text-3xl">Find your Umrah package</h2></div>
          <Link href="/" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block"><ArrowLeft className="mr-1 inline h-4 w-4" /> Back to home</Link>
        </div>

        {loading ? <div className="py-20 text-center text-sm text-muted-foreground">Loading Umrah packages...</div> :
          packages.length === 0 ? <Card className="p-12 text-center"><MapPinned className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">Umrah packages are being prepared</h3><p className="mt-1 text-sm text-muted-foreground">Please check again soon or contact our travel team for a tailored Umrah arrangement.</p></Card> :
          <div className="grid gap-6 lg:grid-cols-2">
            {packages.map((pkg) => <PackageDetail key={pkg.id} pkg={pkg} highlighted={pkg.id === selectedId} />)}
          </div>
        }

        {selected && (
          <Card className="mt-8 overflow-hidden border-primary/20 bg-primary/[0.03] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Selected package</p><h3 className="mt-1 text-xl font-bold">{selected.name}</h3><p className="mt-1 text-sm text-muted-foreground">Ready to discuss this package with our travel team?</p></div>
              <Link href={`/register?package=${encodeURIComponent(selected.id)}`}><Button size="lg">Request this package <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function PackageDetail({ pkg, highlighted }: { pkg: Package; highlighted: boolean }) {
  return (
    <Card className={`group overflow-hidden border-border/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${highlighted ? 'ring-2 ring-primary' : ''}`}>
      <div className="relative h-56 overflow-hidden bg-slate-900">
        {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-primary/40"><MapPinned className="h-14 w-14 text-white/35" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
          <div><h3 className="text-2xl font-black">{pkg.name}</h3><p className="mt-1 text-sm text-white/75">{pkg.duration_days || 'Flexible'} days · {pkg.room_sharing || 'Flexible sharing'}</p></div>
          {pkg.badge && <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">{pkg.badge}</span>}
        </div>
      </div>
      <div className="space-y-5 p-5">
        {pkg.short_description && <p className="text-sm leading-6 text-muted-foreground">{pkg.short_description}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Info icon={Hotel} label="Makkah stay" value={pkg.makkah_hotel || 'Included accommodation'} />
          <Info icon={Hotel} label="Madinah stay" value={pkg.madinah_hotel || 'Included accommodation'} />
          <Info icon={Bus} label="Transport" value={pkg.transport || 'Included'} />
          <Info icon={CalendarDays} label="Departure" value={pkg.departure_date ? new Date(pkg.departure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Flexible departure'} />
        </div>
        <div className="flex flex-wrap gap-2">
          {pkg.visa_included && <Pill><ShieldCheck className="h-3.5 w-3.5" /> Visa included</Pill>}
          {pkg.flights_included && <Pill><Plane className="h-3.5 w-3.5" /> Flights included</Pill>}
          {pkg.ziyarat_included && <Pill><Check className="h-3.5 w-3.5" /> Ziyarat included</Pill>}
        </div>
        <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs text-muted-foreground">Package price</p><p className="text-3xl font-black tracking-tight">{formatPrice(Number(pkg.price_per_pilgrim), 'PKR')}</p><p className="text-xs text-muted-foreground">per pilgrim · PKR</p></div>
          <Link href={`/register?package=${encodeURIComponent(pkg.id)}`}><Button size="lg">Request package <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </div>
    </Card>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-2xl border bg-muted/25 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><Icon className="h-4 w-4" />{label}</div><p className="mt-1.5 text-sm font-medium">{value}</p></div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{children}</span>;
}
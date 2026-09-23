'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bus, CalendarDays, Check, Hotel, MapPinned, Plane, ShieldCheck, Sparkles } from 'lucide-react';
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
  seats?: number | null;
};

export function UmrahPackages() {
  const [packages, setPackages] = useState<Package[]>([]);

  useEffect(() => {
    fetch('/api/umrah-packages')
      .then((res) => res.json())
      .then((data) => setPackages((data.packages || []).slice(0, 3)))
      .catch(() => setPackages([]));
  }, []);

  if (!packages.length) return null;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Sparkles className="h-3.5 w-3.5" /> Sacred journey packages</div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Umrah Packages</h2>
          <p className="mt-1 text-sm text-muted-foreground">Carefully arranged Umrah journeys with clear PKR pricing.</p>
        </div>
        <Link href="/umrah" className="hidden text-sm font-semibold text-primary hover:underline sm:block">View all packages <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} />)}
      </div>
    </section>
  );
}

function PackageCard({ pkg }: { pkg: Package }) {
  return (
    <Card className="group overflow-hidden border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-52 overflow-hidden bg-slate-900">
        {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-primary/40"><MapPinned className="h-12 w-12 text-white/40" /></div>}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        {pkg.badge && <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{pkg.badge}</span>}
        <div className="absolute bottom-4 left-4 right-4 text-white"><h3 className="text-xl font-bold">{pkg.name}</h3><p className="mt-1 text-xs text-white/75">{pkg.duration_days || 'Flexible'} days · {pkg.room_sharing || 'Flexible sharing'}</p></div>
      </div>
      <div className="space-y-4 p-4">
        {pkg.short_description && <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{pkg.short_description}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Feature icon={Hotel} title="Makkah" text={pkg.makkah_hotel || 'Hotel included'} />
          <Feature icon={Hotel} title="Madinah" text={pkg.madinah_hotel || 'Hotel included'} />
          <Feature icon={Bus} title="Transport" text={pkg.transport || 'Included'} />
          <Feature icon={CalendarDays} title="Departure" text={pkg.departure_date ? new Date(pkg.departure_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Flexible'} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pkg.visa_included && <Pill><ShieldCheck className="h-3 w-3" /> Visa</Pill>}
          {pkg.flights_included && <Pill><Plane className="h-3 w-3" /> Flights</Pill>}
          {pkg.ziyarat_included && <Pill><Check className="h-3 w-3" /> Ziyarat</Pill>}
        </div>
        <div className="flex items-end justify-between gap-3 border-t pt-4">
          <div><p className="text-xs text-muted-foreground">Starting from</p><p className="text-xl font-black">{formatPrice(Number(pkg.price_per_pilgrim), 'PKR')}</p><p className="text-[11px] text-muted-foreground">per pilgrim</p></div>
          <Link href={`/umrah?id=${encodeURIComponent(pkg.id)}`}><Button>View package <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
        </div>
      </div>
    </Card>
  );
}

function Feature({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <div className="rounded-xl bg-muted/45 p-2.5"><div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary"><Icon className="h-3.5 w-3.5" />{title}</div><p className="mt-1 truncate text-xs font-medium">{text}</p></div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">{children}</span>;
}
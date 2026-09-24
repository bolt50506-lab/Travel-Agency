'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Check, Hotel, Loader2, MapPinned, Pencil, Plus,
  RefreshCw, Sparkles, Bus, Plane,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils/api';

type UmrahPackage = {
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
  makkah_nights?: number | null;
  madinah_nights?: number | null;
  room_sharing?: string | null;
  price_per_pilgrim: number;
  currency: string;
  departure_date?: string | null;
  return_date?: string | null;
  seats?: number | null;
  is_active: boolean;
};

const emptyForm = {
  name: '', short_description: '', badge: 'Popular', image_url: '',
  makkah_hotel: '', madinah_hotel: '', transport: '',
  duration_days: '14', makkah_nights: '7', madinah_nights: '7',
  room_sharing: 'Quad Sharing', price_per_pilgrim: '',
  departure_date: '', return_date: '', seats: '',
  visa_included: true, flights_included: true, ziyarat_included: true,
  is_active: true,
};

export default function AdminUmrahPage() {
  const [packages, setPackages] = useState<UmrahPackage[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/modules?module=umrah_packages');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load packages');
      setPackages(data.rows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load packages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const setField = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  function edit(pkg: UmrahPackage) {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name || '',
      short_description: pkg.short_description || '',
      badge: pkg.badge || '',
      image_url: pkg.image_url || '',
      makkah_hotel: pkg.makkah_hotel || '',
      madinah_hotel: pkg.madinah_hotel || '',
      transport: pkg.transport || '',
      duration_days: String(pkg.duration_days || ''),
      makkah_nights: String(pkg.makkah_nights || ''),
      madinah_nights: String(pkg.madinah_nights || ''),
      room_sharing: pkg.room_sharing || '',
      price_per_pilgrim: String(pkg.price_per_pilgrim || ''),
      departure_date: pkg.departure_date || '',
      return_date: pkg.return_date || '',
      seats: String(pkg.seats || ''),
      visa_included: Boolean(pkg.visa_included),
      flights_included: Boolean(pkg.flights_included),
      ziyarat_included: Boolean(pkg.ziyarat_included),
      is_active: Boolean(pkg.is_active),
    });
    setShowForm(true);
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  }

  async function save() {
    if (!form.name.trim() || Number(form.price_per_pilgrim) <= 0) {
      toast.error('Package name and a valid price are required');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        short_description: form.short_description.trim(),
        badge: form.badge.trim(),
        image_url: form.image_url.trim(),
        makkah_hotel: form.makkah_hotel.trim(),
        madinah_hotel: form.madinah_hotel.trim(),
        transport: form.transport.trim(),
        duration_days: Number(form.duration_days) || null,
        makkah_nights: Number(form.makkah_nights) || null,
        madinah_nights: Number(form.madinah_nights) || null,
        room_sharing: form.room_sharing.trim(),
        price_per_pilgrim: Number(form.price_per_pilgrim),
        currency: 'PKR',
        departure_date: form.departure_date || null,
        return_date: form.return_date || null,
        seats: Number(form.seats) || null,
        visa_included: form.visa_included,
        flights_included: form.flights_included,
        ziyarat_included: form.ziyarat_included,
        is_active: form.is_active,
      };

      const res = await fetch('/api/admin/modules', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId
          ? { module: 'umrah_packages', id: editingId, data }
          : { module: 'umrah_packages', data }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Unable to save package');

      toast.success(editingId ? 'Umrah package updated' : 'Umrah package published');
      reset();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save package');
    } finally {
      setSaving(false);
    }
  }

  const activeCount = useMemo(() => packages.filter((pkg) => pkg.is_active).length, [packages]);

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Umrah package studio
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">Create Umrah packages customers can actually shop.</h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              Build a complete offer with Makkah and Madinah hotels, transport, visa, flights, ziyarat, dates, room sharing and PKR pricing. Active packages appear automatically on the customer website.
            </p>
          </div>
          <Button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} className="bg-white text-slate-950 hover:bg-white/90">
            <Plus className="mr-2 h-4 w-4" /> Create Umrah package
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total packages" value={packages.length} />
        <Stat label="Published" value={activeCount} />
        <Stat label="Customer visibility" value="Live" />
      </div>

      {showForm && (
        <Card className="border-primary/20 p-5 shadow-lg md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Package builder</p>
              <h2 className="mt-1 text-xl font-bold">{editingId ? 'Edit Umrah package' : 'Create Umrah package'}</h2>
            </div>
            <Button variant="ghost" onClick={reset}>Close</Button>
          </div>

          <div className="grid gap-5">
            <section className="rounded-2xl border bg-muted/20 p-4">
              <h3 className="mb-4 font-semibold">Package identity</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Package name" value={form.name} onChange={(v) => setField('name', v)} placeholder="Premium Umrah — 14 Days" />
                <Field label="Badge" value={form.badge} onChange={(v) => setField('badge', v)} placeholder="Best Seller" />
                <Field label="Short description" value={form.short_description} onChange={(v) => setField('short_description', v)} placeholder="A comfortable 14-day Umrah journey..." />
                <Field label="Package image URL" value={form.image_url} onChange={(v) => setField('image_url', v)} placeholder="https://..." />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4">
              <h3 className="mb-4 font-semibold">Stay & transport</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Makkah hotel" value={form.makkah_hotel} onChange={(v) => setField('makkah_hotel', v)} placeholder="Hotel name / distance from Haram" />
                <Field label="Madinah hotel" value={form.madinah_hotel} onChange={(v) => setField('madinah_hotel', v)} placeholder="Hotel name / distance from Masjid an-Nabawi" />
                <Field label="Transport" value={form.transport} onChange={(v) => setField('transport', v)} placeholder="Private / shared AC coach" />
                <Field label="Room sharing" value={form.room_sharing} onChange={(v) => setField('room_sharing', v)} placeholder="Quad / Triple / Double" />
                <Field label="Total days" value={form.duration_days} onChange={(v) => setField('duration_days', v)} type="number" />
                <Field label="Makkah nights" value={form.makkah_nights} onChange={(v) => setField('makkah_nights', v)} type="number" />
                <Field label="Madinah nights" value={form.madinah_nights} onChange={(v) => setField('madinah_nights', v)} type="number" />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4">
              <h3 className="mb-4 font-semibold">Dates, seats & pricing</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field label="Price / pilgrim (PKR)" value={form.price_per_pilgrim} onChange={(v) => setField('price_per_pilgrim', v)} type="number" />
                <Field label="Available seats" value={form.seats} onChange={(v) => setField('seats', v)} type="number" />
                <Field label="Departure" value={form.departure_date} onChange={(v) => setField('departure_date', v)} type="date" />
                <Field label="Return" value={form.return_date} onChange={(v) => setField('return_date', v)} type="date" />
              </div>
            </section>

            <section className="rounded-2xl border bg-muted/20 p-4">
              <h3 className="mb-4 font-semibold">What&apos;s included</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="Visa included" value={form.visa_included} onChange={(v) => setField('visa_included', v)} />
                <Toggle label="Flights included" value={form.flights_included} onChange={(v) => setField('flights_included', v)} />
                <Toggle label="Ziyarat included" value={form.ziyarat_included} onChange={(v) => setField('ziyarat_included', v)} />
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Toggle label="Publish on customer website" value={form.is_active} onChange={(v) => setField('is_active', v)} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={reset}>Cancel</Button>
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  {editingId ? 'Update package' : 'Publish package'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Your Umrah packages</h2>
          <p className="text-sm text-muted-foreground">Published offers are visible to customers immediately.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : packages.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Plane className="h-7 w-7" /></div>
          <h3 className="mt-4 text-lg font-semibold">No Umrah packages yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first package and publish it to the customer website.</p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {packages.map((pkg) => (
            <Card key={pkg.id} className="overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-lg">
              <div className="relative h-40 overflow-hidden bg-slate-900">
                {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 text-white"><MapPinned className="h-10 w-10 opacity-50" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-white">
                  <div><p className="text-lg font-bold">{pkg.name}</p><p className="text-xs text-white/70">{pkg.duration_days || '—'} days · {pkg.room_sharing || 'Room sharing'}</p></div>
                  {pkg.badge && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">{pkg.badge}</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Mini icon={Hotel} label="Makkah" value={pkg.makkah_hotel || 'Not specified'} />
                  <Mini icon={Hotel} label="Madinah" value={pkg.madinah_hotel || 'Not specified'} />
                  <Mini icon={Bus} label="Transport" value={pkg.transport || 'Not specified'} />
                  <Mini icon={CalendarDays} label="Departure" value={pkg.departure_date ? new Date(pkg.departure_date).toLocaleDateString('en-GB') : 'Flexible'} />
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div><p className="text-xs text-muted-foreground">From</p><p className="text-xl font-black">{formatPrice(Number(pkg.price_per_pilgrim), 'PKR')}<span className="text-xs font-normal text-muted-foreground"> / pilgrim</span></p></div>
                  <div className="flex items-center gap-2">
                    <span className={pkg.is_active ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600' : 'rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground'}>{pkg.is_active ? 'Published' : 'Draft'}</span>
                    <Button size="sm" variant="outline" onClick={() => edit(pkg)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-3"><span className="text-sm font-medium">{label}</span><Switch checked={value} onCheckedChange={onChange} /></div>;
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2.5"><Icon className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="truncate text-xs font-medium">{value}</p></div></div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <Card className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>;
}
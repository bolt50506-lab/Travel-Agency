'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, BedDouble, CalendarDays, CheckCircle2, Clock3, Eye,
  Loader2, Plane, Plus, RefreshCw, Search, UserRound, X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/lib/utils/api';

type BookingRow = {
  id: string;
  reference: string;
  type: 'flight' | 'hotel';
  status: string;
  contact_email: string;
  contact_phone: string;
  customer_price: number;
  currency: string;
  supplier_cost: number;
  agency_margin: number;
  created_at: string;
  notes?: string | null;
  customers?: { full_name?: string; email?: string; phone?: string } | null;
};

const statuses = [
  'BOOKING_REQUESTED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED',
  'AGENCY_PROCESSING', 'SUPPLIER_BOOKING_IN_PROGRESS', 'SUPPLIER_CONFIRMED',
  'TICKETED', 'VOUCHER_ISSUED', 'COMPLETED', 'CUSTOMER_ACTION_REQUIRED',
  'CANCELLED', 'REFUND_PROCESSING', 'REFUNDED', 'FAILED',
];

const emptyForm = {
  type: 'flight',
  customerName: '',
  contactEmail: '',
  contactPhone: '',
  customerPrice: '',
  supplierCost: '',
  currency: 'PKR',
  supplierName: '',
  origin: '',
  destination: '',
  travelDate: '',
  hotelName: '',
  roomType: '',
  checkIn: '',
  checkOut: '',
  notes: '',
};

function statusTone(status: string) {
  if (['COMPLETED', 'TICKETED', 'VOUCHER_ISSUED', 'SUPPLIER_CONFIRMED'].includes(status)) return 'default' as const;
  if (['CANCELLED', 'FAILED', 'REFUND_PROCESSING', 'REFUNDED'].includes(status)) return 'destructive' as const;
  return 'secondary' as const;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState<BookingRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch('/api/admin/bookings?' + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load bookings');
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => ['BOOKING_REQUESTED', 'PAYMENT_PENDING'].includes(b.status)).length,
    processing: bookings.filter((b) => ['AGENCY_PROCESSING', 'SUPPLIER_BOOKING_IN_PROGRESS'].includes(b.status)).length,
    completed: bookings.filter((b) => ['COMPLETED', 'TICKETED', 'VOUCHER_ISSUED'].includes(b.status)).length,
  }), [bookings]);

  const setField = (key: keyof typeof emptyForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  async function createBooking() {
    setSaving(true);
    setError(null);
    try {
      const details = form.type === 'flight'
        ? {
            origin: form.origin,
            destination: form.destination,
            travelDate: form.travelDate,
          }
        : {
            hotelName: form.hotelName,
            roomType: form.roomType,
            checkIn: form.checkIn,
            checkOut: form.checkOut,
          };

      const res = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          customerName: form.customerName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          customerPrice: form.customerPrice,
          supplierCost: form.supplierCost || 0,
          currency: form.currency,
          supplierName: form.supplierName,
          notes: form.notes,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create booking');

      setShowCreate(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create booking');
    } finally {
      setSaving(false);
    }
  }

  const marginPreview = Math.max(0, Number(form.customerPrice || 0) - Number(form.supplierCost || 0));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Booking operations
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, review and move every customer order through fulfillment.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreate(true)} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            New booking
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['All bookings', stats.total, CalendarDays],
          ['Needs attention', stats.pending, Clock3],
          ['In processing', stats.processing, Loader2],
          ['Completed', stats.completed, CheckCircle2],
        ].map(([label, value, Icon]: any) => (
          <Card key={label} className="group overflow-hidden border-border/70 bg-card/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold">{value}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-2.5 text-primary transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border/70 bg-card/80 p-3 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search reference, customer, email or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-56"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((status) => <SelectItem key={status} value={status}>{status.replaceAll('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="flight">Flights</SelectItem>
              <SelectItem value="hotel">Hotels</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>Search</Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>
        </div>
      )}

      <Card className="overflow-hidden border-border/70 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="rounded-2xl bg-primary/10 p-4 text-primary"><BookOpenIcon /></div>
            <h3 className="mt-4 text-lg font-semibold">No bookings yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">Create the first booking manually or let a customer complete the flight or hotel checkout.</p>
            <Button className="mt-5" onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Create booking</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left">
                <tr>
                  {['Booking', 'Customer', 'Type', 'Status', 'Amount', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 font-medium text-muted-foreground">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, index) => (
                  <tr key={booking.id} className="border-b last:border-0 transition-colors hover:bg-muted/20 animate-in fade-in slide-in-from-bottom-1" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{booking.reference}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{booking.contact_email}</p>
                    </td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>{booking.customers?.full_name || 'Guest'}</div></td>
                    <td className="px-4 py-4"><div className="flex items-center gap-2">{booking.type === 'flight' ? <Plane className="h-4 w-4 text-primary" /> : <BedDouble className="h-4 w-4 text-primary" />}<span className="capitalize">{booking.type}</span></div></td>
                    <td className="px-4 py-4"><Badge variant={statusTone(booking.status)}>{booking.status.replaceAll('_', ' ')}</Badge></td>
                    <td className="px-4 py-4 font-semibold">{formatPrice(Number(booking.customer_price || 0), booking.currency || 'PKR')}</td>
                    <td className="px-4 py-4 text-muted-foreground">{new Date(booking.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-4 text-right"><Button size="sm" variant="outline" onClick={() => setShowView(booking)}><Eye className="mr-2 h-4 w-4" />View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Create a new booking</DialogTitle>
            <p className="text-sm text-muted-foreground">Create an agency order now. Supplier fulfillment remains a separate step.</p>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant={form.type === 'flight' ? 'default' : 'outline'} onClick={() => setField('type', 'flight')} className="justify-start"><Plane className="mr-2 h-4 w-4" />Flight booking</Button>
              <Button type="button" variant={form.type === 'hotel' ? 'default' : 'outline'} onClick={() => setField('type', 'hotel')} className="justify-start"><BedDouble className="mr-2 h-4 w-4" />Hotel booking</Button>
            </div>

            <section className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-3 font-semibold">Customer</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Full name" value={form.customerName} onChange={(v) => setField('customerName', v)} placeholder="Customer name" />
                <Field label="Email" value={form.contactEmail} onChange={(v) => setField('contactEmail', v)} placeholder="name@example.com" type="email" />
                <Field label="Phone" value={form.contactPhone} onChange={(v) => setField('contactPhone', v)} placeholder="+92..." />
              </div>
            </section>

            <section className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-3 font-semibold">{form.type === 'flight' ? 'Flight details' : 'Hotel details'}</h3>
              {form.type === 'flight' ? (
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Origin" value={form.origin} onChange={(v) => setField('origin', v)} placeholder="ISB" />
                  <Field label="Destination" value={form.destination} onChange={(v) => setField('destination', v)} placeholder="DXB" />
                  <Field label="Travel date" value={form.travelDate} onChange={(v) => setField('travelDate', v)} type="date" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Hotel" value={form.hotelName} onChange={(v) => setField('hotelName', v)} placeholder="Hotel name" />
                  <Field label="Room type" value={form.roomType} onChange={(v) => setField('roomType', v)} placeholder="Deluxe / Suite" />
                  <Field label="Check in" value={form.checkIn} onChange={(v) => setField('checkIn', v)} type="date" />
                  <Field label="Check out" value={form.checkOut} onChange={(v) => setField('checkOut', v)} type="date" />
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-muted/20 p-4">
              <h3 className="mb-3 font-semibold">Pricing & fulfillment</h3>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Customer price" value={form.customerPrice} onChange={(v) => setField('customerPrice', v)} placeholder="0" type="number" />
                <Field label="Supplier cost" value={form.supplierCost} onChange={(v) => setField('supplierCost', v)} placeholder="0" type="number" />
                <div className="space-y-1.5"><Label>Currency</Label><Select value={form.currency} onValueChange={(v) => setField('currency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PKR">PKR</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="AED">AED</SelectItem><SelectItem value="SAR">SAR</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="GBP">GBP</SelectItem></SelectContent></Select></div>
                <Field label="Supplier" value={form.supplierName} onChange={(v) => setField('supplierName', v)} placeholder="Manual / airline / hotel" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Estimated agency margin: <span className="font-semibold text-foreground">{formatPrice(marginPreview, form.currency)}</span></p>
            </section>

            <div className="space-y-1.5"><Label>Internal notes</Label><Textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Passenger notes, supplier instructions, special requests..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</Button>
            <Button onClick={createBooking} disabled={saving}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><Plus className="mr-2 h-4 w-4" />Create booking</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showView} onOpenChange={(open) => !open && setShowView(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Booking {showView?.reference}</DialogTitle></DialogHeader>
          {showView && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Customer" value={showView.customers?.full_name || 'Guest'} />
                <Info label="Type" value={showView.type} />
                <Info label="Status" value={showView.status.replaceAll('_', ' ')} />
                <Info label="Amount" value={formatPrice(Number(showView.customer_price || 0), showView.currency || 'PKR')} />
                <Info label="Email" value={showView.contact_email} />
                <Info label="Phone" value={showView.contact_phone} />
                <Info label="Margin" value={formatPrice(Number(showView.agency_margin || 0), showView.currency || 'PKR')} />
                <Info label="Created" value={new Date(showView.created_at).toLocaleString('en-GB')} />
              </div>
              {showView.notes && <div className="rounded-lg bg-muted/50 p-3 text-sm">{showView.notes}</div>}
              <div className="flex justify-end"><Button onClick={() => { setShowView(null); window.location.href = '/admin/fulfillment'; }}>Open fulfillment</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium capitalize">{value}</p></div>;
}

function BookOpenIcon() {
  return <CalendarDays className="h-8 w-8" />;
}

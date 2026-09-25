'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Search, UserRound, CalendarDays, Mail, Phone, MapPin, CreditCard, Plane, BedDouble, UserPlus, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/lib/utils/api';

type Customer = {
  id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  cnic?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  created_at: string;
  updated_at: string;
  bookingCount: number;
  bookingTotal: number;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; emailSent: boolean } | null>(null);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', phone: '' });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/customers?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load customers');
      setCustomers(data.customers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => ({
    total: customers.length,
    registered: customers.filter((customer) => customer.user_id).length,
    withBookings: customers.filter((customer) => customer.bookingCount > 0).length,
    bookingValue: customers.reduce((sum, customer) => sum + customer.bookingTotal, 0),
  }), [customers]);

  async function createCustomer() {
    setCreating(true);
    setCreateError(null);
    setCreatedCredentials(null);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to create customer');
      setCreatedCredentials({ email: data.customer.email, password: data.temporaryPassword, emailSent: Boolean(data.emailSent) });
      setCreateForm({ fullName: '', email: '', phone: '' });
      await load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create customer');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">View customer profiles, contact details and booking activity from the admin workspace.</p>
          </div>
          <Button onClick={() => { setCreateOpen(true); setCreateError(null); setCreatedCredentials(null); }}><UserPlus className="mr-2 h-4 w-4" /> Create customer login</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={UserRound} label="Customers" value={String(stats.total)} />
        <Stat icon={CreditCard} label="Registered accounts" value={String(stats.registered)} />
        <Stat icon={CalendarDays} label="Customers with bookings" value={String(stats.withBookings)} />
        <Stat icon={CreditCard} label="Booking value" value={formatPrice(stats.bookingValue, 'PKR')} />
      </div>

      <Card className="border-border/70 bg-card/80 p-3 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, phone, CNIC or passport..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
            />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Search
          </Button>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="overflow-hidden border-border/70 shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <UserRound className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No customers found</h3>
            <p className="mt-1 text-sm text-muted-foreground">Registered and guest customers will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Bookings</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">View</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold">{customer.full_name}</p>
                          <p className="text-xs text-muted-foreground">{customer.user_id ? 'Registered customer' : 'Guest customer'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p>{customer.email || '—'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{customer.phone || 'No phone'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{customer.city || '—'}</p>
                      <p className="text-xs text-muted-foreground">{customer.country || 'PK'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{customer.bookingCount}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(customer.bookingTotal, 'PKR')}</p>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(customer)}>
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer details</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-6 w-6" />
                </span>
                <div>
                  <h2 className="font-semibold">{selected.full_name}</h2>
                  <p className="text-sm text-muted-foreground">{selected.user_id ? 'Registered customer' : 'Guest customer'}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Mail} label="Email" value={selected.email || '—'} />
                <Info icon={Phone} label="Phone" value={selected.phone || '—'} />
                <Info icon={MapPin} label="City / Country" value={[selected.city, selected.country].filter(Boolean).join(', ') || '—'} />
                <Info icon={UserRound} label="Nationality" value={selected.nationality || '—'} />
                <Info icon={CreditCard} label="CNIC" value={selected.cnic || '—'} />
                <Info icon={Plane} label="Passport" value={selected.passport_number || '—'} />
                <Info icon={CalendarDays} label="Passport expiry" value={selected.passport_expiry ? new Date(selected.passport_expiry).toLocaleDateString('en-GB') : '—'} />
                <Info icon={CalendarDays} label="Customer since" value={new Date(selected.created_at).toLocaleDateString('en-GB')} />
              </div>

              {selected.address && (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Address</p>
                  <p className="mt-1 text-sm">{selected.address}</p>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={CalendarDays} label="Bookings" value={String(selected.bookingCount)} />
                <Info icon={CreditCard} label="Total booking value" value={formatPrice(selected.bookingTotal, 'PKR')} />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => { setSelected(null); window.location.href = '/admin/bookings'; }}>
                  View bookings
                </Button>
                <Button onClick={() => { setSelected(null); window.location.href = '/admin/fulfillment'; }}>
                  Open fulfillment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setCreateError(null); setCreatedCredentials(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create customer login</DialogTitle>
          </DialogHeader>
          {createdCredentials ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-sm">
                <p className="font-semibold">{createdCredentials.emailSent ? 'Account created and credentials emailed.' : 'Account created, but email could not be sent.'}</p>
                <p className="mt-1 text-muted-foreground">{createdCredentials.emailSent ? 'The customer can use the credentials below to sign in.' : 'Send these credentials to the customer securely.'}</p>
              </div>
              <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{createdCredentials.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Temporary password</p><p className="font-mono font-semibold">{createdCredentials.password}</p></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => navigator.clipboard?.writeText(`Email: ${createdCredentials.email}\\nPassword: ${createdCredentials.password}`)}><Copy className="mr-2 h-4 w-4" />Copy credentials</Button>
                <Button onClick={() => setCreateOpen(false)}><Check className="mr-2 h-4 w-4" />Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {createError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{createError}</div>}
              <div className="space-y-1.5"><label className="text-sm font-medium">Full name</label><Input value={createForm.fullName} onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })} placeholder="Customer name" /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Email</label><Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="customer@example.com" /></div>
              <div className="space-y-1.5"><label className="text-sm font-medium">Phone</label><Input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+92..." /></div>
              <p className="text-xs text-muted-foreground">A temporary password will be generated automatically and emailed to the customer.</p>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={() => void createCustomer()} disabled={creating || !createForm.fullName.trim() || !createForm.email.trim()}>{creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : <><UserPlus className="mr-2 h-4 w-4" />Create & send login</>}</Button></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <Card className="border-border/70 bg-card/80 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

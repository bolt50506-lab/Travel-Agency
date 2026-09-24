'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, Banknote, CheckCircle2, Clock3, CreditCard, Landmark, Loader2, Smartphone, WalletCards, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type PaymentOption = { id: string; label: string; details: string[] };
type Topup = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  payment_reference?: string | null;
  customer_note?: string | null;
  status: string;
  review_note?: string | null;
  created_at: string;
};

const icons: Record<string, any> = {
  bank_transfer: Landmark,
  raast: Smartphone,
  jazzcash: Smartphone,
  easypaisa: Smartphone,
  manual: Banknote,
};

const money = (value: number) => `PKR ${Number(value || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function WalletPage() {
  const [wallet, setWallet] = useState({ balance: 0, currency: 'PKR' });
  const [options, setOptions] = useState<PaymentOption[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/wallet', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load wallet');
      setWallet(data.wallet || { balance: 0, currency: 'PKR' });
      setOptions(data.paymentOptions || []);
      setTopups(data.topups || []);
      if (data.paymentOptions?.[0]?.id) setMethod((current) => data.paymentOptions.some((x: PaymentOption) => x.id === current) ? current : data.paymentOptions[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load wallet');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submitTopup(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method, paymentReference: reference, customerNote: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to submit top-up');
      toast.success('Top-up request submitted. We will verify your payment.');
      setAmount('');
      setReference('');
      setNote('');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit top-up');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelTopup(id: string) {
    try {
      const res = await fetch('/api/wallet', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topupId: id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to cancel');
      toast.success('Top-up cancelled');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to cancel');
    }
  }

  const selected = options.find((option) => option.id === method);

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Customer wallet</p>
          <h1 className="mt-1 text-3xl font-bold">Wallet</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add PKR to your Destino Travels wallet and use your verified balance for eligible bookings.</p>
        </div>
        <Card className="min-w-[220px] bg-primary p-5 text-primary-foreground">
          <div className="flex items-center gap-2 text-sm opacity-90"><WalletCards className="h-4 w-4" />Available balance</div>
          <p className="mt-1 text-3xl font-bold">{loading ? '—' : money(wallet.balance)}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Add money</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">Choose a payment method, transfer the amount, then submit the reference so the agency can verify it.</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const Icon = icons[option.id] || CreditCard;
              const active = option.id === method;
              return (
                <button key={option.id} type="button" onClick={() => setMethod(option.id)} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}>
                  <div className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-primary" />{option.label}</div>
                  {option.details.length > 0 ? <div className="mt-2 space-y-1 text-xs text-muted-foreground">{option.details.map((detail) => <p key={detail}>{detail}</p>)}</div> : <p className="mt-2 text-xs text-muted-foreground">Payment instructions will be shown by the agency.</p>}
                </button>
              );
            })}
          </div>

          <form onSubmit={submitTopup} className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="wallet-amount">Amount (PKR)</Label><Input id="wallet-amount" type="number" min="100" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000" required /></div>
            <div className="space-y-1.5"><Label htmlFor="wallet-reference">Payment reference</Label><Input id="wallet-reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID / receipt number" /></div>
            <div className="space-y-1.5"><Label htmlFor="wallet-note">Note (optional)</Label><Input id="wallet-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any information for the agency" /></div>
            {selected && <div className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Selected:</span> {selected.label}. Keep your payment receipt until the agency confirms the top-up.</div>}
            <Button type="submit" className="w-full" disabled={submitting}>{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit top-up request'}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" /><h2 className="text-lg font-semibold">Top-up history</h2></div>
          <div className="mt-5 space-y-3">
            {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div> : topups.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No top-up requests yet.</p> : topups.map((topup) => (
              <div key={topup.id} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{money(Number(topup.amount))}</p><p className="text-xs capitalize text-muted-foreground">{topup.method.replaceAll('_', ' ')} · {new Date(topup.created_at).toLocaleDateString()}</p></div><Badge variant={topup.status === 'APPROVED' ? 'default' : topup.status === 'REJECTED' ? 'destructive' : 'secondary'}>{topup.status}</Badge></div>
                {topup.payment_reference && <p className="mt-2 text-xs text-muted-foreground">Reference: {topup.payment_reference}</p>}
                {topup.review_note && <p className="mt-2 text-xs text-muted-foreground">Agency note: {topup.review_note}</p>}
                {topup.status === 'PENDING' && <Button variant="ghost" size="sm" className="mt-2" onClick={() => cancelTopup(topup.id)}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

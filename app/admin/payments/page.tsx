'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, WalletCards } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [paymentsRes, topupsRes] = await Promise.all([
        fetch('/api/admin/payments'),
        fetch('/api/admin/wallet-topups?status=PENDING'),
      ]);
      const paymentsData = await paymentsRes.json();
      const topupsData = await topupsRes.json();
      if (!paymentsRes.ok) throw new Error(paymentsData.error || 'Unable to load payments');
      if (!topupsRes.ok) throw new Error(topupsData.error || 'Unable to load wallet top-ups');
      setPayments(paymentsData.payments || []);
      setTopups(topupsData.topups || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function verify(id: string, action: 'verify' | 'reject') {
    try {
      const r = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: id,
          action,
          reason: action === 'reject' ? 'Payment proof/details were not accepted.' : undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast.success(action === 'verify' ? 'Payment verified' : 'Payment rejected');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to update payment');
    }
  }

  async function reviewTopup(id: string, action: 'approve' | 'reject') {
    try {
      const r = await fetch('/api/wallet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topupId: id,
          action,
          reviewNote: action === 'reject' ? 'Payment could not be verified.' : 'Payment verified by Destino Travels.',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unable to review wallet top-up');
      toast.success(action === 'approve' ? 'Wallet credited' : 'Top-up rejected');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Unable to review wallet top-up');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Verify booking payments and customer wallet top-ups.</p>
        </div>
        <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-4">
          <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /><h2 className="font-semibold">Pending wallet top-ups</h2><Badge variant="secondary">{topups.length}</Badge></div>
          <p className="mt-1 text-xs text-muted-foreground">Approve only after confirming the payment has actually been received.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-3">Customer</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Reference</th><th className="p-3">Requested</th><th className="p-3 text-right">Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="p-10 text-center">Loading...</td></tr> : topups.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No pending wallet top-ups.</td></tr> : topups.map((topup) => (
                <tr key={topup.id} className="border-b last:border-0">
                  <td className="p-3"><p className="font-medium">{topup.customers?.full_name || 'Customer'}</p><p className="text-xs text-muted-foreground">{topup.customers?.email || '—'}</p></td>
                  <td className="p-3 capitalize">{String(topup.method).replaceAll('_', ' ')}</td>
                  <td className="p-3 font-semibold">{topup.currency} {Number(topup.amount).toLocaleString()}</td>
                  <td className="p-3">{topup.payment_reference || '—'}</td>
                  <td className="p-3">{new Date(topup.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => reviewTopup(topup.id, 'approve')}><CheckCircle2 className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => reviewTopup(topup.id, 'reject')}><XCircle className="mr-1 h-4 w-4" />Reject</Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b px-4 py-4"><h2 className="font-semibold">Booking payments</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="p-3">Reference</th><th className="p-3">Booking</th><th className="p-3">Method</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="p-10 text-center">Loading...</td></tr> : payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.reference}</td>
                  <td className="p-3">{p.bookings?.reference || '—'}</td>
                  <td className="p-3 capitalize">{String(p.method).replaceAll('_', ' ')}</td>
                  <td className="p-3">{p.currency} {Number(p.amount).toLocaleString()}</td>
                  <td className="p-3"><Badge variant={p.status === 'verified' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>{p.status}</Badge></td>
                  <td className="p-3 text-right">{p.status === 'pending_verification' ? <div className="flex justify-end gap-2"><Button size="sm" onClick={() => verify(p.id, 'verify')}><CheckCircle2 className="mr-1 h-4 w-4" />Verify</Button><Button size="sm" variant="outline" onClick={() => verify(p.id, 'reject')}><XCircle className="mr-1 h-4 w-4" />Reject</Button></div> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

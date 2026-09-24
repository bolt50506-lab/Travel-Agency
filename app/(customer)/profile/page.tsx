'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, UserRound, WalletCards } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Customer = { full_name?: string | null; email?: string | null; phone?: string | null };
type Wallet = { balance: number; currency: string };

export default function ProfilePage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [wallet, setWallet] = useState<Wallet>({ balance: 0, currency: 'PKR' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/wallet', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Unable to load profile');
        setCustomer(data.customer || null);
        setWallet(data.wallet || { balance: 0, currency: 'PKR' });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium text-primary">My account</p>
        <h1 className="mt-1 text-3xl font-bold">Profile</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your Destino Travels customer account and wallet.</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"><UserRound className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Customer</p><h2 className="font-semibold">{loading ? 'Loading...' : customer?.full_name || 'Customer'}</h2></div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{customer?.email || '—'}</span></div>
              <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span>{customer?.phone || 'Not provided'}</span></div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-primary" /><h2 className="font-semibold">Wallet</h2></div>
            <p className="mt-5 text-3xl font-bold">{wallet.currency} {Number(wallet.balance || 0).toLocaleString('en-PK')}</p>
            <p className="mt-1 text-sm text-muted-foreground">Verified wallet balance</p>
            <Link href="/wallet"><Button className="mt-5 w-full">Manage wallet</Button></Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

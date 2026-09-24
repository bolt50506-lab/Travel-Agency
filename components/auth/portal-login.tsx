'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck, BriefcaseBusiness } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Portal = 'agent' | 'admin';

export function PortalLogin({ portal }: { portal: Portal }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = portal === 'admin';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email, password, portal }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login failed');

      toast.success(isAdmin ? 'Employee access granted.' : 'Agent access granted.');

      // Use the server-selected destination and force a real navigation.
      // This guarantees the freshly issued HttpOnly session cookie is used
      // by the first protected page/API request.
      window.location.assign(data.redirectTo || (isAdmin ? '/admin' : '/agent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#062f43]">
      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/brand/login-island.svg')" }} />
      <div aria-hidden="true" className="absolute inset-0 bg-[#062f43]/45" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#062f43]/25 via-[#062f43]/10 to-[#062f43]/70" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <Link href="/" className="rounded-2xl bg-white/95 p-3 shadow-2xl ring-1 ring-white/40 backdrop-blur"><BrandLogo /></Link>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
              {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <BriefcaseBusiness className="h-3.5 w-3.5" />}
              {isAdmin ? 'Employee administration' : 'Agent portal'}
            </div>
          </div>

          <Card className="border-white/25 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <h1 className="text-xl font-bold text-foreground">{isAdmin ? 'Employee login' : 'Agent login'}</h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              {isAdmin ? 'For authorized Destino Travels employees only.' : 'Sign in to manage your customers, quotations and bookings.'}
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="portal-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : 'Sign in to ' + (isAdmin ? 'Admin' : 'Agent') + ' Portal'}
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-xs text-white/85">
            <Link href="/" className="hover:text-white">Back to public website</Link>{' · '}
            <Link href={isAdmin ? '/agent/login' : '/admin/login'} className="hover:text-white">{isAdmin ? 'Agent login' : 'Employee login'}</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

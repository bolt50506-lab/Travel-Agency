'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, ShieldCheck, BriefcaseBusiness } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type Portal = 'agent' | 'admin';

export function PortalLogin({ portal }: { portal: Portal }) {
  const router = useRouter();
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');
      toast.success(isAdmin ? 'Employee access granted.' : 'Agent access granted.');
      router.push(isAdmin ? '/admin' : '/agent');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            {isAdmin ? <ShieldCheck className="h-6 w-6" /> : <BriefcaseBusiness className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-xl font-bold">Destino Travels</p>
            <p className="text-xs text-muted-foreground">{isAdmin ? 'Employee administration' : 'Agent portal'}</p>
          </div>
        </Link>
        <Card className="p-6 shadow-sm">
          <h1 className="text-xl font-bold">{isAdmin ? 'Employee login' : 'Agent login'}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            {isAdmin ? 'For authorized Destino Travels employees only.' : 'Sign in to manage your customers, quotations and bookings.'}
          </p>
          {error && <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><p className="text-sm text-destructive">{error}</p></div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="portal-email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="portal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required /></div></div>
            <div className="space-y-1.5"><Label htmlFor="portal-password">Password</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="portal-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required /></div></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</> : 'Sign in to ' + (isAdmin ? 'Admin' : 'Agent') + ' Portal'}</Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-xs text-muted-foreground"><Link href="/" className="hover:text-foreground">Back to public website</Link>{' · '}<Link href={isAdmin ? '/agent/login' : '/admin/login'} className="hover:text-foreground">{isAdmin ? 'Agent login' : 'Employee login'}</Link></p>
      </div>
    </div>
  );
}

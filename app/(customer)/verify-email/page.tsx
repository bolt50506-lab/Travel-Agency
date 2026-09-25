'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, MailCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const nextPath = (() => {
    const value = params.get('next');
    return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
  })();
  const status = params.get('status');
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to resend verification email');
      setMessage(data.message || 'Verification email sent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to resend verification email');
    } finally {
      setLoading(false);
    }
  }

  const success = status === 'success';
  const invalid = status === 'invalid';

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md p-7 text-center">
        {success ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-4 text-2xl font-bold">Email verified</h1>
            <p className="mt-2 text-sm text-muted-foreground">Your customer account is now active. You can log in.</p>
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go to Login</Link>
          </>
        ) : (
          <>
            <MailCheck className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold">{invalid ? 'Verification link invalid or expired' : 'Check your email'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {invalid ? 'Request a new verification email below.' : 'We sent a verification link to your email address. You must verify it before logging in.'}
            </p>
            <div className="mt-6 space-y-2 text-left">
              <Label htmlFor="verify-email">Email</Label>
              <Input id="verify-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button className="mt-4 w-full" onClick={resend} disabled={loading || !email}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Button>
            {message && <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-left text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
            <p className="mt-5 text-sm text-muted-foreground"><Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-medium text-primary hover:underline">Back to login</Link></p>
          </>
        )}
      </Card>
    </div>
  );
}

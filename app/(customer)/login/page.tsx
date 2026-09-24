'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/logo';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const redirectTo = typeof data?.redirectTo === 'string' ? data.redirectTo : '/';
      toast.success('Welcome back! You are now logged in.');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#062f43]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/login-island.svg')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#062f43]/35" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#062f43]/15 via-transparent to-[#062f43]/70"
      />

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-5 flex flex-col items-center text-center">
            <Link
              href="/"
              className="rounded-2xl bg-white/95 px-5 py-3 shadow-2xl ring-1 ring-white/50 backdrop-blur"
            >
              <BrandLogo />
            </Link>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#062f43]/55 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-[#d2a92f]" />
              Secure customer portal
            </div>
          </div>

          <Card className="border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-xl sm:p-7">
            <h1 className="text-xl font-bold text-foreground">Log in to your account</h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">
              Enter your credentials to access your bookings.
            </p>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-11 w-full bg-[#cda631] text-white hover:bg-[#b99424]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-[#a77f12] hover:underline">
                Sign up
              </Link>
            </p>
          </Card>

          <p className="mt-4 text-center text-xs font-medium text-white/85">
            Secure access to your Destino Travels bookings
          </p>
        </div>
      </div>
    </main>
  );
}

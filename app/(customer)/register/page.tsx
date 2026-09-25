'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, Phone, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/logo';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      toast.success('Account created. Check your email to verify your account.');
      router.push(`/verify-email?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
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
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: "url('/brand/travel-background.svg')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#062f43]/35" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#062f43]/35 via-[#062f43]/20 to-[#062f43]/80"
      />

      <div className="relative z-10 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-white px-5 py-3 shadow-lg ring-1 ring-border">
            <BrandLogo />
          </div>
        </div>

        <Card className="p-6">
          <h1 className="text-xl font-bold mb-1">Create your account</h1>
          <p className="text-sm text-muted-foreground mb-6">Start booking flights and hotels in minutes.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="John"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Smith"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 555 000 0000"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </Card>
        </div>
      </div>
    </main>
  );
}

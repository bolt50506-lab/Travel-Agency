'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Plane, Hotel, Bookmark, HelpCircle, LogIn, UserPlus, Sparkles, WalletCards, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/brand/logo';

const navLinks = [
  { href: '/flights', label: 'Flights', icon: Plane },
  { href: '/hotels', label: 'Hotels', icon: Hotel },
  { href: '/umrah', label: 'Umrah', icon: Sparkles },
  { href: '/bookings', label: 'My bookings', icon: Bookmark },
  { href: '/wallet', label: 'Wallet', icon: WalletCards },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export type CustomerHeader = {
  name: string;
  balance: number;
};

function money(value: number) {
  return `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function Header({ customer }: { customer?: CustomerHeader | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-[4.5rem] items-center justify-between">
        <div className="flex items-center gap-8">
          <BrandLogo />

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {customer ? (
            <>
              <Link href="/wallet" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-colors hover:bg-muted">
                <WalletCards className="h-4 w-4 text-primary" />
                <span>{money(customer.balance)}</span>
              </Link>
              <Link href="/profile" className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <UserRound className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{customer.name}</span>
              </Link>
              <Link href="/api/auth/logout" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                Sign out
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><LogIn className="mr-2 h-4 w-4" />Login</Link>
              <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4" />Get started</Link>
            </>
          )}
        </div>

        <button type="button" className="rounded-xl p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setMobileOpen(false)}>
                  <Icon className="h-4 w-4" />{link.label}
                </Link>
              );
            })}

            {customer ? (
              <>
                <Link href="/wallet" onClick={() => setMobileOpen(false)} className="mt-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold"><WalletCards className="h-4 w-4 text-primary" />Wallet</span>
                  <span className="text-sm font-bold">{money(customer.balance)}</span>
                </Link>
                <div className="flex gap-2 pt-2">
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    {customer.name}
                  </Link>
                  <Link href="/api/auth/logout" className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                    Sign out
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">Login</Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Get started</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

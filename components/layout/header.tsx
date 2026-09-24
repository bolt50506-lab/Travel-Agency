'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Plane, Hotel, Bookmark, HelpCircle, LogIn, UserPlus, Globe2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/logo';

const navLinks = [
  { href: '/flights', label: 'Flights', icon: Plane },
  { href: '/hotels', label: 'Hotels', icon: Hotel },
  { href: '/umrah', label: 'Umrah', icon: Sparkles },
  { href: '/bookings', label: 'My bookings', icon: Bookmark },
  { href: '/help', label: 'Help', icon: HelpCircle },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/agent')) return null;

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
          <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><LogIn className="mr-2 h-4 w-4" />Login</Link>
          <Link href="/register" className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4" />Get started</Link>
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
            <div className="flex gap-2 pt-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">Login</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Get started</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Plane, Hotel, Bookmark, HelpCircle, LogIn, UserPlus, Globe2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
              <Globe2 className="h-5 w-5" />
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-cyan-300" />
            </div>
            <div>
              <span className="block text-lg font-black tracking-tight">Destino Travels</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:block">Travel smarter</span>
            </div>
          </Link>

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
          <Button variant="ghost" size="sm" asChild><Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link></Button>
          <Button size="sm" className="rounded-xl shadow-sm" asChild><Link href="/register"><UserPlus className="mr-2 h-4 w-4" />Get started</Link></Button>
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
              <Button variant="outline" className="flex-1 rounded-xl" asChild><Link href="/login" onClick={() => setMobileOpen(false)}>Login</Link></Button>
              <Button className="flex-1 rounded-xl" asChild><Link href="/register" onClick={() => setMobileOpen(false)}>Get started</Link></Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

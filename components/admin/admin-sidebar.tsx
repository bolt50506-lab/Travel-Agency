'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, Plane, BedDouble, Users, UserCog, CreditCard,
  RefreshCw, Settings, BarChart3, Bell, Percent, DollarSign, ScrollText,
  Building2, ClipboardList, FileText, PlaneTakeoff, BriefcaseBusiness,
  HeartPulse, Repeat2, WalletCards, Network, UserRoundSearch, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/admin/fulfillment', label: 'Fulfillment', icon: ClipboardList },
  { href: '/admin/flights', label: 'Flights', icon: Plane },
  { href: '/admin/hotels', label: 'Hotels', icon: BedDouble },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/travelers', label: 'Travelers', icon: UserRoundSearch },
  { href: '/admin/leads', label: 'CRM / Leads', icon: BriefcaseBusiness },
  { href: '/admin/quotations', label: 'Quotations', icon: FileText },
  { href: '/admin/packages', label: 'Packages', icon: BriefcaseBusiness },
  { href: '/admin/visa', label: 'Visa Services', icon: FileText },
  { href: '/admin/umrah', label: 'Umrah', icon: PlaneTakeoff },
  { href: '/admin/insurance', label: 'Travel Insurance', icon: HeartPulse },
  { href: '/admin/reissues', label: 'Reissues & Changes', icon: Repeat2 },
  { href: '/admin/agents', label: 'Agents', icon: UserCog },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/refunds', label: 'Refunds', icon: RefreshCw },
  { href: '/admin/finance', label: 'Finance', icon: WalletCards },
  { href: '/admin/b2b', label: 'B2B Agencies', icon: Network },
  { href: '/admin/providers', label: 'Providers', icon: Building2 },
  { href: '/admin/markup', label: 'Markup', icon: Percent },
  { href: '/admin/commissions', label: 'Commissions', icon: DollarSign },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border/70 bg-card/95 backdrop-blur md:flex md:flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border/70 px-5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <span className="text-sm font-black">V</span>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight">Voyago</p>
          <p className="text-[11px] text-muted-foreground">Travel operations</p>
        </div>
      </div>

      <div className="border-b border-border/70 px-4 py-3">
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Workspace</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Agency control center</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== '/admin' && pathname?.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105', active && 'text-primary-foreground')} />
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-border/70 p-3">
        <Link href="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          ← View customer site
        </Link>
        <Link href="/api/auth/logout" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          Sign out
        </Link>
      </div>
    </aside>
  );
}

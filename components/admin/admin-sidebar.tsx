'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Plane,
  BedDouble,
  Users,
  UserCog,
  CreditCard,
  RefreshCw,
  Settings,
  BarChart3,
  Bell,
  Percent,
  DollarSign,
  ScrollText,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: BookOpen },
  { href: '/admin/fulfillment', label: 'Fulfillment', icon: ClipboardList },
  { href: '/admin/flights', label: 'Flights', icon: Plane },
  { href: '/admin/hotels', label: 'Hotels', icon: BedDouble },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/agents', label: 'Agents', icon: UserCog },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/refunds', label: 'Refunds', icon: RefreshCw },
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r border-border bg-card overflow-y-auto">
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">V</span>
        </div>
        <span className="text-lg font-bold tracking-tight">Voyago</span>
        <span className="text-xs text-muted-foreground ml-auto">Admin</span>
      </div>

      <nav className="p-3 space-y-0.5">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== '/admin' && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <Link href="/" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
          ← Back to Site
        </Link>
      </div>
    </aside>
  );
}

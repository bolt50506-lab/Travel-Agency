import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getServerActor } from '@/lib/auth/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor();
  if (!actor || !['admin', 'agent'].includes(actor.role)) redirect('/login');

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="md:ml-64">
        <div className="sticky top-0 z-30 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">V</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Voyago</p>
              <p className="text-[10px] text-muted-foreground">Travel operations</p>
            </div>
            <Link href="/admin/bookings" className="ml-auto rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Bookings</Link>
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
            {[
              ['/admin', 'Dashboard'],
              ['/admin/bookings', 'Bookings'],
              ['/admin/fulfillment', 'Fulfillment'],
              ['/admin/customers', 'Customers'],
              ['/admin/payments', 'Payments'],
              ['/admin/leads', 'CRM'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">{label}</Link>
            ))}
          </div>
        </div>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

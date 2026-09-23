import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerActor } from '@/lib/auth/server';
import { BrandLogo } from '@/components/brand/logo';

const navigation = [
  ['/agent', 'Dashboard'],
  ['/agent/customers', 'Customers'],
  ['/agent/travelers', 'Travelers'],
  ['/agent/quotations', 'Quotations'],
  ['/agent/bookings', 'Bookings'],
  ['/agent/payments', 'Payments'],
  ['/agent/commissions', 'Commissions'],
];

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor();
  if (!actor || actor.role !== 'agent') redirect('/agent/login');

  return (
    <div className="min-h-screen bg-muted/20">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background md:block">
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 px-2"><BrandLogo /><p className="ml-14 -mt-2 text-xs text-muted-foreground">Agent Portal</p></div>
          <nav className="space-y-1">{navigation.map(([href, label]) => <Link key={href} href={href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</Link>)}</nav>
          <div className="mt-auto rounded-lg bg-muted p-3"><p className="text-xs font-medium">{actor.profile?.full_name ? String(actor.profile.full_name) : actor.email}</p><p className="text-xs text-muted-foreground">Agent</p></div>
        </div>
      </aside>
      <main className="min-h-screen md:ml-64"><div className="border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden"><div className="flex items-center justify-between"><BrandLogo compact /><Link href="/agent/bookings" className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Bookings</Link></div></div><div className="p-4 md:p-6">{children}</div></main>
    </div>
  );
}

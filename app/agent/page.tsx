import Link from 'next/link';
import { ArrowRight, BookOpen, Calculator, Hotel, Plane, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getServerActor } from '@/lib/auth/server';

export default async function AgentDashboardPage() {
  const actor = await getServerActor();
  const name = actor?.profile?.full_name ? String(actor.profile.full_name) : 'Agent';
  const modules = [
    { href: '/agent/bookings', title: 'Bookings', description: 'Create and manage customer travel bookings.', icon: BookOpen },
    { href: '/agent/customers', title: 'Customers', description: 'Keep customer records organized.', icon: Users },
    { href: '/agent/quotations', title: 'Quotations', description: 'Prepare and send travel quotations.', icon: Calculator },
    { href: '/flights', title: 'Flight search', description: 'Search the public flight workflow.', icon: Plane },
    { href: '/hotels', title: 'Hotel search', description: 'Search the public hotel workflow.', icon: Hotel },
  ];
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-medium text-primary">Agent workspace</p><h1 className="mt-1 text-3xl font-bold">Welcome, {name}</h1><p className="mt-2 text-muted-foreground">A dedicated workspace for sales and booking operations. Employee administration is kept separate.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{modules.map(({ href, title, description, icon: Icon }) => <Link key={href} href={href}><Card className="h-full p-5 transition-colors hover:border-primary/40 hover:bg-muted/30"><div className="flex items-start justify-between"><Icon className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground" /></div><h2 className="mt-5 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></Card></Link>)}</div></div>;
}

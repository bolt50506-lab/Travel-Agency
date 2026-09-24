import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { getServerActor } from '@/lib/auth/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getServerActor();

  // The public/customer route group is never a workspace for staff.
  // If an admin or agent reaches a customer URL, send them back to their own portal.
  if (actor?.role === 'admin') redirect('/admin');
  if (actor?.role === 'agent') redirect('/agent');

  let customerHeader: { name: string; balance: number } | null = null;

  if (actor?.role === 'customer') {
    const name = actor.profile?.full_name ? String(actor.profile.full_name) : actor.email.split('@')[0];

    try {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id,full_name')
        .eq('user_id', actor.id)
        .maybeSingle();

      let balance = 0;
      if (customer) {
        const { data: wallet } = await supabaseAdmin
          .from('customer_wallets')
          .select('balance')
          .eq('customer_id', customer.id)
          .maybeSingle();
        balance = Number(wallet?.balance || 0);
      }

      customerHeader = {
        name: customer?.full_name || name,
        balance: Number.isFinite(balance) ? balance : 0,
      };
    } catch {
      // Keep the customer site usable before the wallet migration is applied.
      customerHeader = { name, balance: 0 };
    }
  }

  return (
    <>
      <Header customer={customerHeader} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { getServerActor } from '@/lib/auth/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getServerActor();
  if (!actor || !['admin','agent'].includes(actor.role)) redirect('/login');

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="ml-60">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

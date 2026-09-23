import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="ml-60">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

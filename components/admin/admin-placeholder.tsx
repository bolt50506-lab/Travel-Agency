'use client';

import AdminModuleManager from '@/components/admin/admin-module-manager';

export default function AdminPlaceholderPage({ title, description, module }: { title: string; description: string; module?: string }) {
  if (module) return <AdminModuleManager module={module} title={title} description={description} />;
  return <div><h1 className="text-2xl font-bold mb-6">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div>;
}

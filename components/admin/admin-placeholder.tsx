'use client';

import { Card } from '@/components/ui/card';

export default function AdminPlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      <Card className="p-8">
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-4">
          This module is part of the Voyago admin panel. Data will be populated when connected to a live database and providers.
        </p>
      </Card>
    </div>
  );
}

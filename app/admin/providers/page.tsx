'use client';

import { useEffect, useState } from 'react';
import { Building2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Provider {
  id: string;
  name: string;
  type: string;
  isMock: boolean;
  status: string;
  configured: boolean;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/providers')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load providers');
        return res.json();
      })
      .then((data) => {
        setProviders(data.providers || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Providers</h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <Card key={provider.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                {provider.isMock && <Badge variant="secondary">Mock</Badge>}
              </div>
              <h3 className="mt-3 text-sm font-semibold">{provider.name}</h3>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{provider.type} provider</p>
              <div className="mt-3 flex items-center gap-2">
                {provider.configured ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Configured
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not configured</span>
                )}
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-green-600 capitalize">{provider.status}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && (
        <Card className="mt-6 p-4">
          <h3 className="text-sm font-semibold mb-2">Integration Ready</h3>
          <p className="text-sm text-muted-foreground">
            The system is designed to connect real supplier APIs by setting environment variables.
            Currently all providers are running in mock mode. To connect a real provider, set the
            appropriate environment variables (e.g. FLIGHT_PROVIDER=amadeus, FLIGHT_API_KEY, etc.)
            and implement the corresponding provider adapter.
          </p>
        </Card>
      )}
    </div>
  );
}

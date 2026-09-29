import { Phone, Mail, MessageSquare } from 'lucide-react';

export function CustomerSupport() {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div>
        <h3 className="mt-3 text-sm font-semibold">Call Us</h3>
        <p className="text-xs text-muted-foreground mt-1">Travel assistance from our team</p>
        <p className="text-sm font-medium mt-2">Contact Destino Travels</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
        <h3 className="mt-3 text-sm font-semibold">Email Support</h3>
        <p className="text-xs text-muted-foreground mt-1">Send us your travel request</p>
        <p className="text-sm font-medium mt-2">Use our official support channel</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><MessageSquare className="h-5 w-5 text-primary" /></div>
        <h3 className="mt-3 text-sm font-semibold">Travel Assistance</h3>
        <p className="text-xs text-muted-foreground mt-1">Need help with your trip?</p>
        <p className="text-sm font-medium mt-2">Talk to the Destino Travels team</p>
      </div>
    </section>
  );
}

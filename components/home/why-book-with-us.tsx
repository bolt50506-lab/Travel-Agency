import { ShieldCheck, Headphones, CreditCard, Globe2 } from 'lucide-react';

const features = [
  { icon: ShieldCheck, title: 'Secure Booking', description: 'Your booking details and payment information are handled through a secure travel booking workflow.' },
  { icon: Headphones, title: 'Personal Travel Support', description: 'Get assistance from our travel team before, during, and after your journey.' },
  { icon: CreditCard, title: 'Flexible Payments', description: 'Choose the payment option available to you and keep your booking and payment status in one place.' },
  { icon: Globe2, title: 'Flights, Hotels & More', description: 'Compare travel options and access flights, hotels, Umrah packages, and other travel services through Destino Travels.' },
];

export function WhyBookWithUs() {
  return (
    <section className="rounded-lg border border-border bg-card p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Why Book With Destino Travels</h2>
        <p className="text-sm text-muted-foreground mt-1">Simple booking, transparent pricing, and support from a real travel agency.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
              <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

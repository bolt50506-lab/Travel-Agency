import { ShieldCheck, Headphones, CreditCard, Globe2 } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Secure Booking',
    description: 'Your data and payments are protected with industry-standard encryption.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Our travel experts are available around the clock to assist you.',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payments',
    description: 'Pay with card, PayPal, or bank transfer. No hidden fees.',
  },
  {
    icon: Globe2,
    title: 'Global Coverage',
    description: 'Search across 500+ airlines and 2M+ hotels in 200+ countries.',
  },
];

export function WhyBookWithUs() {
  return (
    <section className="rounded-lg border border-border bg-card p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Why Book With Voyago</h2>
        <p className="text-sm text-muted-foreground mt-1">We make travel booking simple, transparent, and reliable.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function InfoPage({ title, intro, sections }: { title: string; intro: string; sections: { heading: string; body: string }[] }) {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-primary">Destino Travels</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base text-muted-foreground">{intro}</p>
        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <Card key={section.heading} className="p-6">
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild><Link href="/help">Visit Help Center</Link></Button>
          <Button variant="outline" asChild><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    </div>
  );
}

import { Card } from '@/components/ui/card';

export function AgentModulePage({ title, description }: { title: string; description: string }) {
  return <div className="mx-auto max-w-6xl space-y-6"><div><p className="text-sm font-medium text-primary">Destino Travels · Agent Portal</p><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Card className="p-6"><p className="font-medium">{title} workspace</p><p className="mt-1 text-sm text-muted-foreground">This module is isolated to agent accounts. Shared travel components and database workflows will be connected here without exposing employee administration.</p></Card></div>;
}

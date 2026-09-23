import type { ReactNode } from 'react';

export function ModuleShell({eyebrow,title,description,actions,children}:{eyebrow?:string;title:string;description?:string;actions?:ReactNode;children:ReactNode}) {
  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>{eyebrow&&<p className="text-sm font-medium text-primary">{eyebrow}</p>}<h1 className="text-2xl font-bold">{title}</h1>{description&&<p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}</div>
      {actions&&<div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {children}
  </div>;
}

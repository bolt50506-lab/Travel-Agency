'use client';
import Link from 'next/link';
import { useState } from 'react';
export const DESTINO_FACEBOOK = 'https://www.facebook.com/p/Destino-Travels-61579887292104/';
export const DESTINO_LOGO = '/brand/destino-logo.png';
export function BrandLogo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <Link href="/" className="group flex min-w-0 items-center gap-2.5">
    {!failed ? <img src={DESTINO_LOGO} alt="Destino Travels" onError={() => setFailed(true)} className={compact ? 'h-9 w-9 rounded-xl object-contain bg-white shadow-sm' : 'h-11 w-11 rounded-xl object-contain bg-white p-0.5 shadow-sm'} /> : <span className={compact ? 'flex h-9 w-9 items-center justify-center rounded-xl bg-[#c9a44a] text-sm font-black text-white shadow-sm' : 'flex h-11 w-11 items-center justify-center rounded-xl bg-[#c9a44a] text-lg font-black text-white shadow-sm'}>D</span>}
    {!compact && <span className="min-w-0"><span className={'block truncate text-lg font-black tracking-tight ' + (dark ? 'text-white' : 'text-foreground')}>Destino Travels</span><span className={'hidden text-[10px] font-semibold uppercase tracking-[0.18em] sm:block ' + (dark ? 'text-white/65' : 'text-muted-foreground')}>Travel • Tours • Umrah</span></span>}
  </Link>;
}

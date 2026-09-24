import Link from 'next/link';

export const DESTINO_FACEBOOK = 'https://www.facebook.com/p/Destino-Travels-61579887292104/';
export const DESTINO_LOGO = '/brand/destino-logo.svg';
export const DESTINO_MARK = '/brand/destino-mark.svg';

export function BrandLogo({ compact = false, dark = false }: { compact?: boolean; dark?: boolean }) {
  return (
    <Link href="/" className="group flex min-w-0 items-center">
      <img
        src={compact ? DESTINO_MARK : DESTINO_LOGO}
        alt="Destino Travels"
        className={
          compact
            ? 'h-10 w-10 object-contain'
            : 'h-12 w-auto max-w-[230px] object-contain sm:h-14 sm:max-w-[270px]'
        }
      />
    </Link>
  );
}

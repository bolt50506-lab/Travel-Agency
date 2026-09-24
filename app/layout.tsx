import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Destino Travels — Search. Book. Travel.',
  description:
    'Book flights and hotels from Pakistan with transparent PKR pricing and trusted travel support.',
  icons: {
    icon: '/brand/destino-mark.svg',
    shortcut: '/brand/destino-mark.svg',
  },
  openGraph: {
    title: 'Destino Travels — Search. Book. Travel.',
    description: 'Book flights and hotels from Pakistan with confidence.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
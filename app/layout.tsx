import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Voyago — Search. Book. Travel.',
  description:
    'Book flights and hotels worldwide. Compare prices, choose your seats, and manage your trips all in one place.',
  openGraph: {
    title: 'Voyago — Search. Book. Travel.',
    description: 'Book flights and hotels worldwide with confidence.',
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
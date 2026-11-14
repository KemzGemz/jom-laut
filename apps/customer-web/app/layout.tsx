import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Footer, Header } from '@/components/Header';
import { StoreProvider } from '@/lib/store';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AngleX · Fishing trips and boat charters in Malaysia', template: '%s · AngleX' },
  description: 'Find a fishing trip, check real availability and book the boat in one place.',
  // This is a demo with sample data, so it must not show up in search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <p className="demo-banner" role="note"><strong>Demo.</strong> Trips and operators are samples. No bookings or payments are real.</p>
          <Header />
          <main>{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}

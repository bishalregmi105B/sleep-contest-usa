import type { Metadata, Viewport } from 'next';
import { DM_Sans, Rubik, Space_Mono } from 'next/font/google';
import { SkipLink } from '@/components/layout/SkipLink';
import { SITE } from '@/content/site';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin'],
  weight: ['400', '500', '700', '800', '900'],
  display: 'swap',
  variable: '--font-rubik',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · Win $100,000`,
    template: `%s · ${SITE.name}`,
  },
  description:
    '200,000 Americans lie down in pajamas for 90 minutes while a wake-up squad tries to wake them. The deepest sleeper in America wins $100,000.',
  keywords: [
    'sleep contest',
    'win $100,000',
    'sleep competition',
    'United States',
    'heart rate challenge',
  ],
  authors: [{ name: SITE.organizer }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} · Win $100,000`,
    description:
      'Air horns. Feathers. Bacon. 90 minutes. The deepest sleeper in America wins $100,000.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} · Win $100,000`,
    description: 'The deepest sleeper in America wins $100,000.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0B0620',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${dmSans.variable} ${spaceMono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-midnight text-cream">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
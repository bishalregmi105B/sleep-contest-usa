import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SkipLink } from '@/components/layout/SkipLink';
import { SITE } from '@/content/site';
import './globals.css';

// Self-hosted instead of next/font/google: the Google loader fetches from
// fonts.googleapis.com during the build, and a response Turbopack cannot parse
// fails the whole deploy. scripts/fetch-fonts.mjs downloads these files once and
// they are committed, so the build makes no network call at all.
const rubik = localFont({
  src: './fonts/rubik.woff2',
  weight: '300 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-rubik',
});

const dmSans = localFont({
  src: './fonts/dm-sans.woff2',
  weight: '100 1000',
  style: 'normal',
  display: 'swap',
  variable: '--font-dm-sans',
});

const spaceMono = localFont({
  src: [
    { path: './fonts/space-mono-400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/space-mono-700.woff2', weight: '700', style: 'normal' },
  ],
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
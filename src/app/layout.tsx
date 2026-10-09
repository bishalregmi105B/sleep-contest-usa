import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SkipLink } from '@/components/layout/SkipLink';
import { AnalyticsProvider } from '@/components/layout/AnalyticsProvider';
import { SITE } from '@/content/site';
import './globals.css';

// Self-hosted instead of next/font/google: the Google loader fetches from
// fonts.googleapis.com during the build, and a response Turbopack cannot parse
// fails the whole deploy. scripts/fetch-fonts.mjs downloads these files once and
// they are committed, so the build makes no network call at all.

/** Big Shoulders Display: the condensed title-card face. */
const display = localFont({
  src: './fonts/big-shoulders.woff2',
  weight: '700 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-big-shoulders',
});

const dmSans = localFont({
  src: './fonts/dm-sans.woff2',
  weight: '100 1000',
  style: 'normal',
  display: 'swap',
  variable: '--font-dm-sans',
});

/** JetBrains Mono: every number that changes uses these tabular figures. */
const mono = localFont({
  src: './fonts/jetbrains-mono.woff2',
  weight: '400 700',
  style: 'normal',
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

/**
 * Canonical origin.
 *
 * Falls back through Vercel's own production URL before the public domain, so
 * the canonical link, og:url and og:image can never resolve to localhost on a
 * real deployment. Order: explicit NEXT_PUBLIC_SITE_URL, the Vercel-provided
 * production URL, the known public domain, and only then localhost for local
 * development.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    `https://${SITE.domain}`,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    // A localhost URL is only ever valid in development; keep looking.
    if (value.includes('localhost') && process.env.NODE_ENV === 'production') continue;
    return value.replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

const URL_BASE = siteUrl();

/**
 * Runs before first paint, so a visitor returning in the same session never
 * sees the "lights down" overlay at all. Deliberately tiny and synchronous:
 * if sessionStorage is unavailable (private browsing, blocked cookies) it just
 * plays the animation like any first visit.
 */
const PRELOADER_SCRIPT = `try{if(sessionStorage.getItem('sc-preloader')==='1'){document.documentElement.dataset.preloader='done'}}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
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
    url: URL_BASE,
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
  themeColor: '#07060F',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${dmSans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PRELOADER_SCRIPT }} />
        {/* The preloader marks itself seen once it has played, so the next
            navigation in the session skips it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{sessionStorage.setItem('sc-preloader','1')}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-ink text-paper">
        <SkipLink />
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
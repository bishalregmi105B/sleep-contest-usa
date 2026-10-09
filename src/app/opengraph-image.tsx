import { ImageResponse } from 'next/og';
import { GRAND_PRIZE, HERO, SITE, plain, usd } from '@/content/site';

export const alt = `${SITE.name} — a sleep contest where the deepest sleeper wins $100,000. Concept visuals.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph card.
 *
 * Rendered in code rather than shipped as a file, so the copy can never drift
 * from site.ts and there is nothing to hotlink. Fonts are not embedded here
 * because Satori needs a fetchable font file; the card uses system sans and
 * relies on weight, case and colour for the brand voice.
 *
 * The card carries no emoji and no cartoon: a plain crescent, a real dusk sky
 * gradient, and the money set in the foil colour.
 */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          // Dusk at the bottom, midnight at the top, matching the page.
          background:
            'linear-gradient(165deg, #07060F 0%, #0B0620 40%, #1B1450 72%, #4A2E52 90%, #C9743A 100%)',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="58" height="58" viewBox="0 0 100 100" fill="none">
            <path d="M62 8a44 44 0 1 0 30 74 38 38 0 0 1-30-74Z" fill="#FFB867" />
          </svg>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 700,
              color: '#F3EBDD',
              textTransform: 'uppercase',
              letterSpacing: 3,
            }}
          >
            {SITE.name}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 86,
              fontWeight: 800,
              color: '#F3EBDD',
              lineHeight: 1.02,
              letterSpacing: -2,
              textTransform: 'uppercase',
              maxWidth: 880,
            }}
          >
            {HERO.h1}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              color: '#B9B4D6',
              marginTop: 26,
              maxWidth: 760,
            }}
          >
            {HERO.sub}
          </div>
        </div>

        {/* Prize row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              color: '#F5D77A',
              fontSize: 52,
              fontWeight: 800,
              display: 'flex',
            }}
          >
            {usd(GRAND_PRIZE)}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#B9B4D6' }}>
            {plain(SITE.goal)} sleepers wanted
          </div>
          <div
            style={{
              display: 'flex',
              marginLeft: 'auto',
              fontSize: 16,
              color: '#B9B4D6',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            Concept visuals
          </div>
        </div>
      </div>
    ),
    size,
  );
}
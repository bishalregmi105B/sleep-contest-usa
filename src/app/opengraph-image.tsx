import { ImageResponse } from 'next/og';
import { SITE } from '@/content/site';

export const alt = `${SITE.name} — Win $100,000`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Open Graph card.
 *
 * Rendered in code rather than shipped as a file, so the copy can never drift
 * from site.ts and there is nothing to hotlink. Fonts are not embedded here
 * because Satori needs a fetchable font file; the card uses system sans and
 * relies on weight and colour for the brand voice.
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
            'linear-gradient(160deg, #0B0620 0%, #1B1450 45%, #3A2C78 75%, #FF4F8B 100%)',
        }}
      >
        {/* Brand row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              background: '#FFE14A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
            }}
          >
            🌙
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#FFF8E7',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {SITE.name}
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 900,
              color: '#FFF8E7',
              lineHeight: 1.02,
              letterSpacing: -2,
              textTransform: 'uppercase',
              maxWidth: 900,
            }}
          >
            Can you sleep through anything?
          </div>
          <div style={{ fontSize: 32, color: '#D9D2FF', marginTop: 28 }}>
            Air horns. Feathers. Bacon. 90 minutes.
          </div>
        </div>

        {/* Prize */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              background: '#FFE14A',
              color: '#1A0B12',
              fontSize: 44,
              fontWeight: 900,
              padding: '18px 40px',
              borderRadius: 999,
              display: 'flex',
            }}
          >
            Win $100,000
          </div>
          <div style={{ fontSize: 26, color: '#D9D2FF' }}>
            200,000 sleepers wanted
          </div>
        </div>
      </div>
    ),
    size,
  );
}
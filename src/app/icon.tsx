import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/**
 * Favicon: a plain crescent on the ink background, drawn in code so no binary
 * asset is needed and it always matches the palette.
 *
 * The old mark was a crescent wearing a striped nightcap with a face. A
 * character as the app icon is the clearest cartoon tell the site had left.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07060F',
        }}
      >
        {/* A waxing crescent, cut with a second circle rather than a clip, so
            the terminator is a real curve at every size. */}
        <svg width="300" height="300" viewBox="0 0 100 100" fill="none">
          <path
            d="M62 8a44 44 0 1 0 30 74 38 38 0 0 1-30-74Z"
            fill="#FFB867"
          />
        </svg>
      </div>
    ),
    size,
  );
}
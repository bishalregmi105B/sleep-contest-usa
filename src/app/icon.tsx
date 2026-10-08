import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/**
 * Favicon: the moon in a nightcap, drawn in code so no binary asset is needed
 * and it always matches the palette.
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
          background: '#0B0620',
          fontSize: 380,
        }}
      >
        🌙
      </div>
    ),
    size,
  );
}
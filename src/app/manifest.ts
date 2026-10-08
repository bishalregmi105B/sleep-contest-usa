import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: 'Sleep Contest',
    description:
      '200,000 Americans lie down in pajamas for 90 minutes. The deepest sleeper in America wins $100,000.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0620',
    theme_color: '#0B0620',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
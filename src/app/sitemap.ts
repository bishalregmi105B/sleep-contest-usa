import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';

/**
 * Sitemap.
 *
 * Only public pages are listed. The ticket route is addressed by an unguessable
 * id and is deliberately absent; /admin is gated and excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/friends`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE.url}/rules`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE.url}/refund`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE.url}/privacy`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
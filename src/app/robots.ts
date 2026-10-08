import type { MetadataRoute } from 'next';
import { SITE } from '@/content/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The admin area and per-registrant tickets must never be indexed.
        disallow: ['/admin', '/api/', '/ticket/'],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
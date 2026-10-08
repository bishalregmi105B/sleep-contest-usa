import { SITE } from '@/content/site';

/**
 * Structured data.
 *
 * WebSite and Organization only. Deliberately no Event schema: the contest has
 * no announced date or venue yet, and marking up an Event with invented dates
 * would be a false claim to search engines.
 */
export function JsonLd() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE.url}/#organization`,
      name: SITE.organizer,
      url: SITE.url,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      publisher: { '@id': `${SITE.url}/#organization` },
      inLanguage: 'en-US',
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Content is built from our own constants, not user input. JSON.stringify
      // with the angle brackets escaped keeps it safe inside a script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
          /</g,
          '\\u003c',
        ),
      }}
    />
  );
}
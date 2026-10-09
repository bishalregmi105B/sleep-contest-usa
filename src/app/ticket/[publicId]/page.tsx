import type { Metadata } from 'next';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { findByPublicId } from '@/lib/repository';
import { referralLink } from '@/lib/registrations';
import { SITE, TICKET } from '@/content/site';
import { Ticket } from '@/components/ui/Ticket';

/**
 * Resolving metadata happens before the response status is committed, so this is
 * the only place in a partially-prerendered route where `notFound()` reliably
 * produces a real 404. The body repeats the lookup because it must still decide
 * what to render; the query is a single indexed row read.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const registration = await findByPublicId(publicId);

  if (!registration || registration.status !== 'paid' || registration.matNumber === null) {
    notFound();
  }

  return {
    title: TICKET.title,
    description: 'Your reserved mat for the Great America’s Sleep Contest.',
    robots: { index: false, follow: false },
  };
}

/**
 * Blocking rather than streamed.
 *
 * A streamed partial-prerender shell commits its 200 before the lookup runs, so
 * `notFound()` could never set a real 404: every guessed ticket id would be
 * served as a 200 and indexed. `instant = false` renders the route at request
 * time, and `connection()` in the component body makes that explicit.
 */
export const instant = false;

/**
 * Ticket page, addressed by unguessable publicId rather than the sequential
 * database id.
 *
 * Everything dynamic, including reading the route param, sits inside the
 * Suspense boundary so the route can be prerendered as a shell and streamed.
 * `connection()` inside that boundary forces the lookup to happen per request,
 * which is what lets `notFound()` still set a real 404 status: without it the
 * shell's 200 is already on the wire, and search engines would index an
 * identical "page not found" under every guessed id.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  // Declared first, before any markup: this opts the whole route out of
  // partial prerendering, so the response status is not committed until
  // notFound() has run. A streamed shell would flush a 200 first, and search
  // engines would then index an identical "page not found" under every guessed
  // ticket id.
  await connection();

  const { publicId } = await params;

  const registration = await findByPublicId(publicId);

  // A pending registration has not paid yet, so there is no ticket to show.
  if (!registration || registration.status !== 'paid' || registration.matNumber === null) {
    notFound();
  }

  const firstName = registration.fullName.split(' ')[0] ?? registration.fullName;

  return (
    <main
      id="main"
      className="relative flex min-h-svh flex-col items-center justify-center gap-10 bg-ink px-4 py-16"
    >
      {/* Sky gradient, matching the site's dusk palette without the 3D scene:
          the ticket is a shareable page, not a scroll journey. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, #3A2C78 0%, #1B1450 45%, #0B0620 100%)',
        }}
      />

      <Ticket
        firstName={firstName}
        matNumber={registration.matNumber}
        refCode={registration.refCode}
        referralUrl={referralLink(registration.refCode)}
      />

      <p className="text-center text-sm text-mist">
        <Link href="/" className="underline decoration-dusk underline-offset-4 hover:text-tungsten">
          Back to {SITE.name}
        </Link>
      </p>
    </main>
  );
}

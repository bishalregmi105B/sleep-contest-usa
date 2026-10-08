import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { referralLink } from '@/lib/registrations';
import { SITE, TICKET } from '@/content/site';
import { Ticket } from '@/components/ui/Ticket';

export const metadata: Metadata = {
  title: TICKET.title,
  description: 'Your reserved mat for the Great America’s Sleep Contest.',
  robots: { index: false, follow: false },
};

/**
 * Ticket page, addressed by unguessable publicId rather than the sequential
 * database id.
 */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;

  const registration = await db.registration.findUnique({ where: { publicId } });

  // A pending registration has not paid yet, so there is no ticket to show.
  if (!registration || registration.status !== 'paid' || registration.matNumber === null) {
    notFound();
  }

  const firstName = registration.fullName.split(' ')[0] ?? registration.fullName;

  return (
    <main
      id="main"
      className="relative flex min-h-svh flex-col items-center justify-center gap-10 bg-midnight px-4 py-16"
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

      <p className="text-center text-body-sm text-lavender">
        <Link href="/" className="underline decoration-dusk underline-offset-4 hover:text-zzz">
          Back to {SITE.name}
        </Link>
      </p>
    </main>
  );
}
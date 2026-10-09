import type { Metadata } from 'next';
import { MONEY, SITE, hasDeadline } from '@/content/site';
import { LegalLayout } from '@/components/layout/LegalLayout';

export const metadata: Metadata = {
  title: 'Refund policy',
  description: `When your ${SITE.name} reservation is refunded, and how.`,
  alternates: { canonical: '/refund' },
};

const LAST_UPDATED = '2026-10-09';

export default function RefundPage() {
  return (
    <LegalLayout
      title="Refund policy"
      intro={`When your ${SITE.name} reservation is refunded, how to ask, and how long it takes.`}
      updated={LAST_UPDATED}
      sections={[
        {
          id: 'summary',
          heading: 'In short',
          body: (
            <p>
              Your ${MONEY.reserve} reservation is refunded in full if the
              announced date does not suit you, or if we do not reach{' '}
              {SITE.goal.toLocaleString('en-US')} registered sleepers
              {hasDeadline ? ` by ${SITE.deadline}` : ''}.
            </p>
          ),
        },
        {
          id: 'date-refund',
          heading: 'If the date does not suit you',
          body: (
            <p>
              Once the date and venue are announced, tell us and we refund your
              ${MONEY.reserve} reservation in full. Because the date is only set
              after {SITE.goal.toLocaleString('en-US')} people have registered,
              there is never a booking you cannot get out of.
            </p>
          ),
        },
        {
          id: 'goal-not-reached',
          heading: 'If the contest does not go ahead',
          body: (
            <p>
              If we do not reach {SITE.goal.toLocaleString('en-US')}{' '}
              registrations
              {hasDeadline ? ` by ${SITE.deadline}` : ' by the deadline we announce'},
              every reservation is refunded in full. We do not keep any part of
              it.
            </p>
          ),
        },
        {
          id: 'balance',
          heading: 'The remaining balance',
          body: (
            <p>
              The remaining ${MONEY.balance} is only due after the date is
              announced. If you have already paid it and you ask for a refund, it
              is returned with your reservation.
            </p>
          ),
        },
        {
          id: 'how',
          heading: 'How to ask, and how long it takes',
          body: (
            <p>
              Email us from the address you registered with. Refunds go back to
              the original payment method. Most are returned within a few days;
              how long your bank takes to show the money is up to your bank.
            </p>
          ),
        },
        {
          id: 'not-covered',
          heading: 'What is not refundable',
          body: (
            <p>
              Once you have taken part in the contest, entry fees are not
              refundable, because the mats, staff and event have already been
              paid for.
            </p>
          ),
        },
      ]}
    />
  );
}
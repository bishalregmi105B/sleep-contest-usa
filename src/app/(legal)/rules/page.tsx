import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MONEY, PRIZES, PRIZE_TOTAL, SITE, usd, hasDeadline } from '@/content/site';
import { ClientNote } from '@/components/layout/ClientNote';
import { LegalLayout } from '@/components/layout/LegalLayout';
import { GwrSlot } from '@/components/gwr/GwrSlot';
import { GWR, GWR_CLIENT_INPUTS } from '@/content/gwr';

export const metadata: Metadata = {
  title: 'Official rules',
  description: `How ${SITE.name} works, who can enter, what it costs, and how the winner is chosen.`,
  alternates: { canonical: '/rules' },
};

/**
 * Last substantive change. A literal rather than `new Date()` so the page stays
 * prerenderable and so the date only moves when a human edits it.
 */
const LAST_UPDATED = '2026-10-09';

export default function RulesPage() {
  return (
    <LegalLayout
      title="Official rules"
      intro={`Everything you need to know before entering ${SITE.name}, in plain English.`}
      updated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          heading: 'The contest',
          body: (
            <>
              <p>
                {SITE.name} is organised by {SITE.organizer}.{' '}
                {SITE.goal.toLocaleString('en-US')} people each lie down in pajamas
                for {SITE.sleepMinutes} minutes while a wake-up squad tries to wake
                them.
              </p>
              <p>
                The grand prize is {usd(PRIZES[0]?.amount ?? 0)} and the whole purse
                is {usd(PRIZE_TOTAL)}. Five sleepers are paid.
              </p>
            </>
          ),
        },
        {
          id: 'eligibility',
          heading: 'Who can enter',
          body: (
            <p>
              Entrants must be {SITE.minAge} or older and resident in the United
              States. One entry per person. By entering you confirm you are old
              enough to take part and that the information you give us is accurate.
              Entrants must be able to travel to the announced venue.
            </p>
          ),
        },
        {
          id: 'entry',
          heading: 'Entry and payment',
          body: (
            <>
              <p>
                Entry costs ${MONEY.total} in total. ${MONEY.reserve} is paid at
                registration to reserve a mat. The remaining ${MONEY.balance} is due
                only after the date is announced, and registrants are emailed first.
              </p>
              <p>
                A paid entry can win a prize. Whether a paid entry is lawful in your
                state, and whether a free alternative way to enter must be offered,
                is a question for the contest&rsquo;s lawyer.
              </p>
            </>
          ),
        },
        {
          id: 'dates',
          heading: 'Dates and venues',
          body: (
            <p>
              The date is announced once {SITE.goal.toLocaleString('en-US')} people
              have registered.{' '}
              {hasDeadline
                ? `Registration must reach that number by ${SITE.deadline}.`
                : 'A deadline for reaching that number has not been announced yet; one will be published here before it matters.'}{' '}
              Cities across the USA take part, starting with Dallas, Texas.
            </p>
          ),
        },
        {
          id: 'the-rounds',
          heading: 'The rounds',
          body: (
            <p>
              Rounds begin every {SITE.roundEveryMinutes} minutes. Open your eyes
              and you are out. Sleep aids and alcohol are not allowed. You are
              filmed during the event, and you consent to that when you enter.
            </p>
          ),
        },
        {
          id: 'how-the-winner-is-chosen',
          heading: 'How the winner is chosen',
          body: (
            <>
              <p>
                The winner is the sleeper whose heart rate drops the most from
                their resting rate and stays steady through every wake-up round.
              </p>
              <ClientNote>
                Publish the measurement device, how readings are verified, and the
                tie-break. A contest decided by a number needs a published method
                and a way for an entrant to challenge a reading.
              </ClientNote>
            </>
          ),
        },
        {
          id: 'what-to-bring',
          heading: 'What to bring',
          body: (
            <>
              <p>
                Your pajamas and a photo ID. Mats and pillows are provided. Best
                sleepwear wins a crowd prize.
              </p>
              <ClientNote>
                Confirm whether travel and accommodation are provided, and who pays
                for them.
              </ClientNote>
            </>
          ),
        },
        {
          id: 'refunds',
          heading: 'Refunds',
          body: (
            <p>
              Your ${MONEY.reserve} reservation is refunded in full if the announced
              date does not suit you, or if the contest does not go ahead. See the{' '}
              <a href="/refund">refund policy</a>.
            </p>
          ),
        },
        {
          id: 'disputes',
          heading: 'Ties and disputes',
          body: (
            <ClientNote>
              Confirm the tie-break, who adjudicates a dispute, and the timescale for
              a decision. Until this is written down, a dispute has no published
              route to a resolution.
            </ClientNote>
          ),
        },
        {
          id: 'safety',
          heading: 'Noise, smells and safety',
          body: (
            <>
              <p>
                The noise round uses air horns and alarm clocks, the tickle round
                uses a feather, and the smell round uses bacon and coffee. The safety
                answers to these are published as a draft FAQ and go live only once
                they are approved.
              </p>
              <ClientNote>
                Confirm hearing protection and any sound-level limit, alternatives for
                the smell round for dietary, religious and allergy reasons, who
                should not enter, and what on-site medical support is provided.
              </ClientNote>
            </>
          ),
        },
        {
          id: 'record-attempt',
          heading: GWR.rulesHeading,
          body: (
            <>
              <Suspense fallback={null}>
                <GwrSlot variant="inline" className="mb-6" />
              </Suspense>
              <p>{GWR.rulesIntro}</p>
              <ul className="mt-4 list-disc pl-6">
                {GWR_CLIENT_INPUTS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm opacity-80">{GWR.awaitingClientInput}</p>
            </>
          ),
        },
        {
          id: 'changes',
          heading: 'Changes to these rules',
          body: (
            <p>
              We may change or cancel the contest if it cannot run as described. If
              we cancel, every reservation is refunded in full. We will publish any
              change on this page and email registrants.
            </p>
          ),
        },
      ]}
    />
  );
}
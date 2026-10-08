import type { Metadata } from 'next';
import { MONEY, SITE, hasDeadline } from '@/content/site';
import { LegalLayout } from '@/components/layout/LegalLayout';

export const metadata: Metadata = {
  title: 'Contest rules',
  description: `How ${SITE.name} works, who can enter and how the winner is chosen.`,
  alternates: { canonical: '/rules' },
};

export default function RulesPage() {
  return (
    <LegalLayout
      title="Contest rules"
      updated="Draft"
      sections={[
        {
          id: 'overview',
          heading: 'The contest',
          body: (
            <>
              <p>
                {SITE.name} is organised by {SITE.organizer}.{' '}
                {SITE.goal.toLocaleString('en-US')} Americans each lie down in
                pajamas for {SITE.sleepMinutes} minutes while a wake-up squad
                tries to wake them.
              </p>
              <p>
                The winner is the sleeper whose heart rate drops the most and
                stays steady through every wake-up round. They win $100,000.
              </p>
            </>
          ),
        },
        {
          id: 'dates',
          heading: 'Dates and venues',
          body: (
            <p>
              Dates and venues are announced once {SITE.goal.toLocaleString('en-US')}{' '}
              people have registered. Cities across the USA take part, starting
              with Dallas, Texas.
              {hasDeadline
                ? ` Registration must reach the goal by ${SITE.deadline}.`
                : ' A deadline for reaching the goal has not been announced yet.'}
            </p>
          ),
        },
        {
          id: 'eligibility',
          heading: 'Who can enter',
          body: (
            <p>
              Entrants must be {SITE.minAge} or older. One entry per person. By
              entering you confirm that you are old enough to take part and that
              the information you give us is accurate.
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
                registration to reserve a mat. The remaining ${MONEY.balance} is
                due after the date is announced.
              </p>
              <p>
                A paid entry can win a prize. Whether this contest is lawful in
                your state is a question for the client&rsquo;s lawyer, not for
                this draft; see the notes in our build report.
              </p>
            </>
          ),
        },
        {
          id: 'conduct',
          heading: 'The rounds',
          body: (
            <p>
              Rounds begin every {SITE.roundEveryMinutes} minutes. Open your eyes
              and you are out. Sleep aids and alcohol are not allowed. You are
              filmed during the event, which you consent to when you enter.
            </p>
          ),
        },
        {
          id: 'what-to-bring',
          heading: 'What to bring',
          body: (
            <p>
              Your pajamas and a photo ID. Mats and pillows are provided. Best
              sleepwear wins a crowd prize.
            </p>
          ),
        },
        {
          id: 'changes',
          heading: 'Changes to these rules',
          body: (
            <p>
              We may change or cancel the contest if it cannot run as described.
              If we cancel, every reservation is refunded in full.
            </p>
          ),
        },
      ]}
    />
  );
}
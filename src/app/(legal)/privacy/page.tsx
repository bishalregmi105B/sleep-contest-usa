import type { Metadata } from 'next';
import { SITE } from '@/content/site';
import { ClientNote } from '@/components/layout/ClientNote';
import { LegalLayout } from '@/components/layout/LegalLayout';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `What ${SITE.name} collects, why, and what we never do with it.`,
  alternates: { canonical: '/privacy' },
};

const LAST_UPDATED = '2026-10-09';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy policy"
      intro={`What we collect when you enter ${SITE.name}, why we collect it, and what we never do with it.`}
      updated={LAST_UPDATED}
      sections={[
        {
          id: 'summary',
          heading: 'In short',
          body: (
            <p>
              We collect the details needed to run the contest, we use them for
              that, and we do not sell them to anyone.
            </p>
          ),
        },
        {
          id: 'collect',
          heading: 'What we collect when you register',
          body: (
            <>
              <p>
                When you register we collect your name, email address, mobile
                number, date of birth, and city and state. We collect your date of
                birth only to confirm you are {SITE.minAge} or older, as required
                to enter.
              </p>
              <p>
                We also record whether you entered through a referral code, so we
                can credit the person who referred you.
              </p>
            </>
          ),
        },
        {
          id: 'health-data',
          heading: 'Heart rate and biometric data',
          body: (
            <>
              <p>
                This is health-related data and it is treated differently from
                everything else on this page. A heart rate can reveal things about
                someone&rsquo;s health, so the contest&rsquo;s rules, the waiver and
                this policy need a lawyer&rsquo;s review before the contest is
                announced.
              </p>
              <p>
                What we expect to hold: the heart-rate readings taken during the
                event, and the derived result used to decide the winner. What we
                expect <em>not</em> to hold: any medical history, diagnosis or
                treatment detail, which we never ask for.
              </p>
              <ClientNote>
                Confirm what heart-rate data is collected, how long it is kept, who
                inside the organisation can see it, whether the device stores its
                own copy, and whether entrants can demand deletion afterwards.
              </ClientNote>
            </>
          ),
        },
        {
          id: 'payment',
          heading: 'Payments',
          body: (
            <p>
              Payments are handled by our payment provider. We receive your payment
              status and a reference. We never see or store your card number.
            </p>
          ),
        },
        {
          id: 'use',
          heading: 'Why we use it',
          body: (
            <ul className="list-inside list-disc space-y-2">
              <li>To confirm your registration and issue your ticket.</li>
              <li>To email you the date and venue when they are announced.</li>
              <li>To contact you about the contest if we need to.</li>
              <li>To count registered sleepers towards the contest goal.</li>
              <li>To decide the winner, on the readings taken at the event.</li>
            </ul>
          ),
        },
        {
          id: 'analytics',
          heading: 'Analytics',
          body: (
            <p>
              We measure how the page is used with a cookie-free analytics and
              speed service. It records which buttons are pressed, whether a form
              was started and whether it was submitted. It does not set cookies,
              does not build a profile and does not receive any of the details
              listed above.
            </p>
          ),
        },
        {
          id: 'film',
          heading: 'Filming',
          body: (
            <p>
              The contest is filmed, and you consent to being filmed when you
              enter. Entrants appear in event photography and video published to
              promote the contest.
            </p>
          ),
        },
        {
          id: 'sharing',
          heading: 'Who we share it with',
          body: (
            <p>
              Our payment provider, our email provider, and the event staff who need
              a list of who is attending. We do not sell your details and we do not
              publish your name next to a referral leaderboard.
            </p>
          ),
        },
        {
          id: 'retention',
          heading: 'How long we keep it',
          body: (
            <>
              <p>
                We keep registration details for as long as the contest needs them
                and as long as we are required to keep them. If you ask us to delete
                your details after the contest, we will, except for the few records
                we must keep for legal or accounting reasons.
              </p>
              <ClientNote>
                Confirm the retention period for heart-rate readings specifically.
                They are the one category here that is not obviously covered by the
                contest itself.
              </ClientNote>
            </>
          ),
        },
        {
          id: 'rights',
          heading: 'Your rights',
          body: (
            <p>
              You can ask us what we hold about you, ask us to correct it, or ask
              us to delete it. Email us and we will deal with it.
            </p>
          ),
        },
      ]}
    />
  );
}
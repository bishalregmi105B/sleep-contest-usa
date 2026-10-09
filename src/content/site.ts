import { DEFAULT_SITE_URL } from '@/lib/env-public';

/**
 * Single source of truth for every word and number on the site.
 *
 * Components import from here; no copy is hardcoded in JSX. The Stitch export
 * disagreed with the client brief in a few places, and per the master prompt
 * the brief wins on content while Stitch wins on layout and styling.
 */

const raw = {
  deadline: process.env.NEXT_PUBLIC_CONTEST_DEADLINE ?? '',
  sponsor: process.env.NEXT_PUBLIC_SPONSOR ?? '',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '',
  address: process.env.NEXT_PUBLIC_ORGANIZER_ADDRESS ?? '',
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? '',
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  /**
   * Below this many paid registrations the public counter shows the target and
   * the story instead of the count. "0 / 200,000" reads as a dead campaign;
   * a real number that is simply small reads as honest. The admin view is
   * unaffected and always shows the true total.
   */
  counterMinPublic: Number(process.env.NEXT_PUBLIC_COUNTER_MIN_PUBLIC ?? '500'),
  /**
   * Safety, medical and biometric-data answers are drafted but hidden until the
   * client approves them. Publishing an unapproved promise about hearing
   * protection or heart-rate data is worse than publishing nothing.
   */
  safetyFaqApproved: process.env.NEXT_PUBLIC_SAFETY_FAQ_APPROVED === 'true',
  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM ?? '',
    tiktok: process.env.NEXT_PUBLIC_TIKTOK ?? '',
    x: process.env.NEXT_PUBLIC_X ?? '',
  },
};

/**
 * The canonical origin.
 *
 * Falls through NEXT_PUBLIC_SITE_URL, the Vercel-provided production URL and
 * the public domain, and only then to localhost. The localhost branch is
 * unreachable in production: a deployment without an explicit site URL would
 * otherwise emit `localhost` into the JSON-LD, robots.txt and sitemap.xml,
 * which is a real bug rather than a cosmetic one — it tells a crawler the
 * canonical address of the site is a private machine.
 */
export function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    `https://sleepcontestusa.com`,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    if (value.includes('localhost') && process.env.NODE_ENV === 'production') continue;
    return value.replace(/\/$/, '');
  }

  return DEFAULT_SITE_URL;
}

export const SITE = {
  name: "The Great America's Sleep Contest",
  domain: 'sleepcontestusa.com',
  url: resolveSiteUrl(),
  organizer: 'Sparsha LLC',
  tagline: 'Sleep deeper as you scroll.',
  deadline: raw.deadline,
  sponsor: raw.sponsor,
  email: raw.email,
  address: raw.address,
  phone: raw.phone,
  demoMode: raw.demoMode,
  counterMinPublic: Number.isFinite(raw.counterMinPublic) ? raw.counterMinPublic : 500,
  safetyFaqApproved: raw.safetyFaqApproved,
  social: raw.social,
  /** Registration goal that unlocks the date. */
  goal: 200_000,
  /** Minimum age to enter. */
  minAge: 18,
  /** Duration of the sleep itself, in minutes. */
  sleepMinutes: 90,
  /** Minutes between wake-up squad rounds. */
  roundEveryMinutes: 20,
} as const;

/** True once the client has supplied a sponsor name. */
export const hasSponsor = SITE.sponsor.trim().length > 0;
/** True once the client has supplied a deadline date. */
export const hasDeadline = SITE.deadline.trim().length > 0;
/** True once the client has supplied a contact address. */
export const hasEmail = SITE.email.trim().length > 0;
/** True once the client has supplied a postal address for the organizer. */
export const hasAddress = SITE.address.trim().length > 0;
/** True once the client has supplied a phone number. */
export const hasPhone = SITE.phone.trim().length > 0;

/** Only the values a visitor can act on are exposed as links. */
export const SOCIAL_LINKS = [
  { label: 'Instagram', href: SITE.social.instagram },
  { label: 'TikTok', href: SITE.social.tiktok },
  { label: 'X', href: SITE.social.x },
].filter((link) => link.href.trim().length > 0);

/**
 * The contact line. A `mailto:` whenever an address is configured, and plain
 * text when it is not: the previous version pointed at /friends, which sent
 * someone looking for a mailbox to a referral leaderboard.
 */
export const CONTACT_EMAIL = hasEmail ? SITE.email : 'hello@sleepcontestusa.com';
export const contactHref = hasEmail ? `mailto:${SITE.email}` : null;

export const NAV = [
  { label: 'How it works', href: '#how' },
  { label: 'Wake-up squad', href: '#squad' },
  { label: 'Prizes', href: '#prizes' },
  { label: 'FAQ', href: '#faq' },
] as const;

/**
 * Money. $10 reserves a spot; $29.99 falls due once the date is announced.
 */
export const MONEY = {
  total: '39.99',
  reserve: '10',
  balance: '29.99',
  reserveCents: 1000,
} as const;

/** "$100,000" and friends, formatted once so every surface agrees. */
export const usd = (amount: number): string => `$${amount.toLocaleString('en-US')}`;
export const plain = (amount: number): string => amount.toLocaleString('en-US');

export const TICKER =
  'Registration open / $10 holds your spot / 200,000 sleepers wanted / Win $100,000';

export const HERO = {
  h1: 'Can you sleep through anything?',
  sub: 'Air horns. Feathers. Bacon. 90 minutes. The deepest sleeper in America wins $100,000.',
  cta: 'Reserve my spot · $10',
  secondaryCta: 'See how it works',
  priceLine: '$39.99 total. $10 now, $29.99 after the date is announced.',
  badgeCaption: 'Grand prize',
} as const;

/**
 * The four facts a paid-entry contest has to answer in the first five seconds.
 * Every value here is read from the constants above, so the bar cannot drift
 * out of step with the counter, the money or the rules page.
 */
export const FACTS = {
  label: 'What you need to know',
  cells: [
    {
      label: 'Where',
      value: 'Cities across the USA, starting with Dallas, Texas',
    },
    { label: 'When', value: `Date announced at ${plain(SITE.goal)} registered sleepers` },
    { label: 'Who', value: `Adults ${SITE.minAge} and over` },
    {
      label: 'Entry',
      value: `${usd(Number(MONEY.reserve))} reserves your spot, ${usd(Number(MONEY.total))} total`,
    },
  ],
  cta: `Reserve my spot · ${usd(Number(MONEY.reserve))}`,
  rulesLink: { label: 'Official rules', href: '/rules' },
  refundLink: { label: 'Refund policy', href: '/refund' },
} as const;

export const COUNTER = {
  label: 'Sleepers registered so far.',
  note: 'The second we hit 200,000, the contest is on. Bring a friend and get us there faster.',
  bringFriend: 'Bring a friend',
  demoTag: 'Demo data',
  /**
   * Shown instead of the numeric count while the real number is small. It is
   * true, it invites action, and it never puts a zero on the page.
   */
  belowThreshold: `Registration is open. We need ${plain(SITE.goal)} sleepers to make this happen.`,
  noneYet: 'No sleepers yet. Be the first.',
} as const;

/**
 * The four steps. These are a real sequence, so the numbering is meaningful.
 * `alt` describes the photograph the section expects; it is rewritten for the
 * cinematics rather than describing a picture that is not on the page.
 */
export const STEPS = [
  {
    title: 'Reserve for $10',
    body: 'Lock your spot now. At 200,000 sleepers we set the date and email you first.',
    asset: 'how-1-register',
    alt: 'A hand holding a phone at night, screen light on the face, screen unreadable.',
  },
  {
    title: 'Show up in pajamas',
    body: 'You get a mat, a pillow and a heart-rate clip. Best sleepwear wins a crowd prize.',
    asset: 'how-2-pajamas',
    alt: 'Folded pajamas, a pillow and a rolled mat on a wooden floor under warm lamp light.',
  },
  {
    title: 'Sleep for 90 minutes',
    body: 'Lights drop. A live leaderboard shows who is sleeping deepest.',
    asset: 'how-3-leaderboard',
    alt: 'Macro of a fingertip heart-rate clip glowing softly, shallow depth of field.',
  },
  {
    title: 'Survive the wake-up squad',
    body: 'Every 20 minutes they come for you. Open your eyes and you are out.',
    asset: 'how-4-feather',
    alt: 'A referee in a striped shirt holding an air horn in a mat aisle, backlit.',
  },
] as const;

/** Section 8 fixes the How-it-works subtitle verbatim. */
export const HOW = {
  heading: 'How America’s deepest sleeper wins',
  sub: 'Four steps from reserving your spot to winning the cash. Sleeping for 90 minutes is the easy part.',
} as const;

/**
 * The three rounds. `strip` labels the mini heartbeat that plays with the round.
 */
export const ROUNDS = [
  {
    title: 'The Noise Round',
    body: 'Air horns, alarm clocks and one very loud rooster.',
    asset: 'squad-noise',
    alt: 'A vintage air horn on a dark surface with a hard rim light.',
  },
  {
    title: 'The Tickle Round',
    body: 'A feather on the nose. Do not flinch.',
    asset: 'squad-tickle',
    alt: 'Macro of a feather held above a sleeper’s closed eyelashes.',
  },
  {
    title: 'The Smell Round',
    body: 'Fresh bacon and coffee, wafted right past you.',
    asset: 'squad-smell',
    alt: 'Bacon sizzling in a pan with backlit steam and a steaming coffee cup behind.',
  },
] as const;

export const SQUAD = {
  heading: 'Meet the wake-up squad',
  sub: 'Their only job is to ruin your nap.',
  body: 'Three rounds stand between you and the cash.',
  stripLabel: "Sleeper's heart rate",
  replay: 'Run the rounds again',
  /**
   * The squad's own scoring sentence. An invented chart next to a real claim is
   * how a contest loses trust, so the illustration says plainly that it is not
   * real data and the claim next to it comes from the copy below.
   */
  telemetryTitle: 'What a winning night looks like',
  telemetryCaption: 'Illustrative example, not real data.',
  scoring: 'The winner is the sleeper whose heart rate drops the most and stays steady through every wake-up round.',
} as const;

type Prize = {
  readonly place: number;
  readonly label: string;
  readonly amount: number;
  /** Only the grand prize. Optional so the array can stay a simple literal. */
  readonly grand?: boolean;
};

export const PRIZES: readonly Prize[] = [
  { place: 1, label: '1st Prize', amount: 100_000, grand: true },
  { place: 2, label: '2nd Prize', amount: 50_000 },
  { place: 3, label: '3rd Prize', amount: 10_000 },
  // CONFIRM WITH CLIENT: the client's message said "$5" for 4th place; $5,000 is assumed.
  { place: 4, label: '4th Prize', amount: 5_000 },
  { place: 5, label: '5th Prize', amount: 2_500 },
];

/** Sum of every prize. Drives the section heading. */
export const PRIZE_TOTAL = PRIZES.reduce((sum, prize) => sum + prize.amount, 0);
export const GRAND_PRIZE = PRIZES.find((prize) => prize.grand)?.amount ?? 0;

export const PRIZES_SECTION = {
  heading: `The ${usd(PRIZE_TOTAL)} cash purse`,
  sub: 'The deepest sleeper takes the $100,000 grand prize. Five sleepers get paid.',
  prizeCardTitle: 'For the deepest sleeper in America.',
  grandCaption: 'Grand prize',
  totalCaption: 'Total cash purse',
  ladderCaption: 'The rest of the purse',
} as const;

/** Appends "Presented by {sponsor}." only when a sponsor is configured. */
export const sponsorClause = hasSponsor ? `Presented by ${SITE.sponsor}.` : '';

export const PRICE_CARD = {
  title: 'The price',
  total: `$${MONEY.total}`,
  lines: [
    `$${MONEY.reserve} today to reserve`,
    `$${MONEY.balance} once the date is announced`,
  ],
  refundLine: "Date doesn't suit you? Your $10 comes back in full.",
} as const;

export const GALLERY = {
  heading: 'What it will look like',
  /**
   * Honest in both states. With no generated imagery shipped, this must not
   * claim concept visuals exist; the section shows the night's schedule
   * instead and says plainly that photography follows the first event. Once
   * real images are dropped in, the subheading switches to naming them as
   * concept visuals.
   */
  subNoPhotos:
    'Photography from the first event will appear here. Until then, here is the night you would be reserving a place in.',
  subConcept:
    'Concept visuals generated to show what the night could look like. Real photographs follow the first event.',
  conceptCaption: 'Concept visual',
} as const;

/**
 * Gallery tiles. Two use hover video and fall back to their poster frame.
 * Every tile is illustrative: the event has not happened yet.
 */
export const GALLERY_TILES = [
  { key: 'gallery.1', asset: 'gallery-1', alt: 'A wide aerial view of rows of sleeping mats under aisle lights.', title: 'The field, lights down' },
  { key: 'gallery.2', asset: 'gallery-2', alt: 'Two friends asleep in ordinary pajamas, one hugging a pillow.', title: 'Ordinary pajamas, deep sleep' },
  { key: 'gallery.3', asset: 'gallery-3', alt: "A referee's hand holding a feather over a sleeping contestant, face out of focus.", title: 'Do not flinch' },
  { key: 'gallery.4', asset: 'gallery-4', alt: 'A large dark screen glowing with abstract green heart-rate lines.', title: 'Every heartbeat on one screen' },
  { key: 'gallery.5', asset: 'gallery-5', alt: 'A squad member walking a mat aisle, air horn silhouette backlit.', title: 'The squad, tiptoeing' },
  { key: 'gallery.6', asset: 'gallery-6', alt: 'Steam rising across warm lights at the edge of the field.', title: 'Last light of the night' },
] as const;

export const RESERVE = {
  title: 'Claim your mat.',
  sub: `The contest is confirmed once 200,000 people have registered. You must be ${SITE.minAge} or older to enter.`,
  consent: `I am ${SITE.minAge} or older and agree to the contest rules, waiver and being filmed.`,
  cta: "Pay $10 and I'm in.",
  note: "Full refund if the announced date doesn't suit you or the contest doesn't go ahead.",
  /** Only shown when the client has not supplied a deadline. */
  neutralRefund:
    'If we do not reach 200,000, every reservation is refunded in full.',
  successTitle: "You're in!",
  successBody: 'Check your email for your ticket and the refund promise.',
  submitting: 'Reserving your mat…',
  fields: {
    fullName: 'Full name',
    email: 'Email',
    mobile: 'Mobile',
    dateOfBirth: 'Date of birth',
    cityState: 'City and state',
  } as const,
  errors: {
    fullName: 'Enter your full name (2 to 80 characters).',
    email: 'Enter a valid email address.',
    mobile: 'Enter a mobile number with 7 to 15 digits.',
    dateOfBirth: `You must be ${SITE.minAge} or older to enter.`,
    cityState: 'Enter your city and state.',
    consent: 'You must be 18 or older and agree to the rules to enter.',
    duplicate: 'You are already registered and paid. Check your email for your ticket.',
    generic: 'Something went wrong on our side. Try again in a moment.',
    summary: 'Fix these to continue:',
    offline: 'You appear to be offline. Check your connection and try again.',
  },
} as const;

/**
 * "Rules in 60 seconds". The conversion feature that sits next to the form, and
 * the only version of the rules a first-time visitor is asked to read.
 */
export const RULES_SUMMARY = {
  heading: 'The rules in 60 seconds',
  disclaimer: 'Summary only. The official rules apply.',
  items: [
    { label: 'Who can enter', value: `Adults ${SITE.minAge} and over.` },
    {
      label: 'Cost',
      value: `${usd(Number(MONEY.reserve))} now to reserve, ${usd(Number(MONEY.balance))} after the date is announced, ${usd(Number(MONEY.total))} total.`,
    },
    {
      label: 'When',
      value: `After ${plain(SITE.goal)} sleepers register. Registrants are emailed first.`,
    },
    {
      label: 'How the winner is chosen',
      value:
        'The sleeper whose heart rate drops the most and stays steady through every wake-up round.',
    },
    {
      label: 'Refunds',
      value: "Full refund if the date doesn't suit you or the contest doesn't go ahead.",
    },
  ],
  link: { label: 'Read the official rules', href: '/rules' },
} as const;

/**
 * The trust strip under the submit button. A refund promise next to the payment
 * step is the single highest-value line on a paid-entry page.
 */
export const TRUST = {
  refund: 'Full refund if the date doesn’t suit you or the contest doesn’t go ahead.',
  rules: { label: 'Official rules', href: '/rules' },
  privacy: { label: 'Privacy', href: '/privacy' },
  refundLink: { label: 'Refund policy', href: '/refund' },
  contact: { label: 'Contact', href: '/rules#contact' },
  /**
   * Shown only when Stripe is actually configured. A homemade padlock icon
   * conveys nothing, and claiming a processor we are not using is worse than
   * saying nothing.
   */
  stripeLive: 'Payments are processed by Stripe. We never see or store your card details.',
} as const;

/** "From reserve to wake-up call". One timeline, used in both places it appears. */
export const TIMELINE = {
  heading: 'From reserve to wake-up call',
  steps: [
    { title: `Reserve ${usd(Number(MONEY.reserve))}`, detail: 'Your mat is held and your number is issued.' },
    { title: `We reach ${plain(SITE.goal)}`, detail: 'Registrants are emailed before anyone else.' },
    {
      title: `Date and venue announced, you pay ${usd(Number(MONEY.balance))}`,
      detail: 'Nothing else is due before this point.',
    },
    { title: 'Show up in pajamas', detail: 'Mat, pillow and heart-rate clip are waiting.' },
    { title: `Sleep for ${SITE.sleepMinutes} minutes`, detail: 'Lights drop and the room goes quiet.' },
    { title: 'Survive the squad', detail: `Woken every ${SITE.roundEveryMinutes} minutes. Stay asleep.` },
  ],
  dateAnnouncedAt: `Date announced at ${plain(SITE.goal)}`,
} as const;

type FaqStatus = 'published' | 'draft';

type FaqItem = {
  readonly q: string;
  readonly a: string;
  /**
   * `draft` items exist in the content file so the copy can be reviewed, but
   * never render until the client approves them with
   * NEXT_PUBLIC_SAFETY_FAQ_APPROVED=true.
   */
  readonly status: FaqStatus;
};

export const FAQ: readonly FaqItem[] = [
  {
    q: 'When and where is it?',
    a: `In cities across the USA, starting with Dallas, Texas. Dates and venues are announced once ${plain(SITE.goal)} people have registered.`,
    status: 'published',
  },
  {
    q: 'Can I get my $10 back?',
    // Replaced with neutral wording while no deadline is configured, so the page
    // never shows a literal placeholder.
    a: hasDeadline
      ? `Yes. If the date doesn't work for you, or we don't reach ${plain(SITE.goal)} by ${SITE.deadline}, you get a full refund.`
      : `Yes. If the date doesn't work for you, or we don't reach ${plain(SITE.goal)}, you get a full refund.`,
    status: 'published',
  },
  {
    q: 'How is the winner chosen?',
    a: 'By heart rate. The sleeper whose heart rate drops the most and stays steady through every wake-up round wins.',
    status: 'published',
  },
  {
    q: 'What do I bring?',
    a: 'Your pajamas and a photo ID. Mats and pillows are provided. Sleep aids and alcohol are not allowed.',
    status: 'published',
  },

  /* Safety, access and data. Drafted for the client, hidden until approved. */
  {
    q: 'Is the noise safe for my hearing?',
    a: '[CLIENT: confirm the hearing protection policy and the sound-level limit for the noise round, and whether ear defenders are issued.]',
    status: 'draft',
  },
  {
    q: 'Can I skip a round?',
    a: '[CLIENT: confirm whether the smell round, which uses bacon and coffee, has alternatives for dietary, religious and allergy reasons.]',
    status: 'draft',
  },
  {
    q: 'What if I have a medical condition?',
    a: '[CLIENT: confirm who should not enter, and what on-site medical support is provided.]',
    status: 'draft',
  },
  {
    q: 'Do I have to travel, and is anything provided?',
    a: '[CLIENT: confirm travel arrangements. Mats and pillows are provided.]',
    status: 'draft',
  },
  {
    q: 'Will I be filmed?',
    a: '[CLIENT: confirm how footage is used, for how long it is kept, and whether entrants can opt out of publication.]',
    status: 'draft',
  },
  {
    q: 'What happens to my heart-rate data?',
    a: '[CLIENT: confirm what heart-rate data is collected, how long it is kept, and who can see it. Heart rate is health-related data and this needs a real answer.]',
    status: 'draft',
  },
  {
    q: 'What if I cannot fall asleep?',
    a: '[CLIENT: confirm the disqualification rule and whether the remaining balance is refunded.]',
    status: 'draft',
  },
  {
    q: 'How and when are prizes paid?',
    a: '[CLIENT: confirm the payout method, the timing, and who handles taxes.]',
    status: 'draft',
  },
];

/** Only what is actually approved may reach a visitor. */
export const PUBLISHED_FAQ = FAQ.filter((item) => item.status === 'published');

export const FINAL_CTA = {
  heading: 'Think you can out-sleep America?',
  /**
   * Section 8 fixes this by hand in the component, because the line depends on
   * the live count. These are the two halves.
   */
  withSleepers: (count: number) =>
    `${plain(count)} sleepers have reserved a spot so far. We need ${plain(SITE.goal)}. Lock yours for ${usd(Number(MONEY.reserve))} and pay the rest after the date is announced.`,
  noneYet: `We need ${plain(SITE.goal)} sleepers. Be one of the first to lock a spot for ${usd(Number(MONEY.reserve))}, and pay the rest after the date is announced.`,
  /**
   * Below the public threshold the count is not shown at all, so the line does
   * not leak the number it is meant to be hiding.
   */
  belowThreshold: `We need ${plain(SITE.goal)} sleepers. Reserve your spot for ${usd(Number(MONEY.reserve))} and pay the rest after the date is announced.`,
} as const;

export const FOOTER = {
  blurb: `${SITE.name} is organized by ${SITE.organizer}.`,
  contact: 'Contact',
  legal: 'Legal',
  links: [
    { label: 'Official rules', href: '/rules' },
    { label: 'Refund policy', href: '/refund' },
    { label: 'Privacy', href: '/privacy' },
  ],
  /** Shown wherever imagery appears, so an AI-generated picture is never sold as a photograph. */
  conceptNote: 'Concept visuals. Imagery on this site is illustrative, not photography of a past event.',
} as const;

/** Copy for the pages the Stitch export never provided. */
export const TICKET = {
  title: "You're in!",
  sub: 'Your mat is reserved. We will email you the date and venue first.',
  matLabel: 'Mat No.',
  admitOne: 'Admit one sleeper',
  share: 'Share with friends',
  noCalendar: 'We will email you the date as soon as it is set.',
  emailCta: 'Email my ticket',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  referralHeading: 'Bring a friend, move up the field',
  referralBody: 'Every friend who reserves a mat through your link counts towards the 200,000.',
  nextHeading: 'What happens next',
  yourLink: 'Your link',
  print: 'Print ticket',
} as const;

export const FRIENDS = {
  title: 'Bring a friend',
  sub: 'Share your link. Every friend who reserves a mat moves you closer to the date.',
  yourLink: 'Your referral link',
  copy: 'Copy link',
  copied: 'Copied',
  topRecruiters: 'Top recruiters',
  topRecruitersNote: 'Mat numbers and referral counts only. We never publish names.',
  empty: 'No referrals yet. Be the first to share.',
} as const;

export const ADMIN = {
  title: 'Registrations',
  password: 'Password',
  signIn: 'Sign in',
  signOut: 'Sign out',
  search: 'Search name or email',
  searchSubmit: 'Search',
  total: 'Total paid',
  matRange: 'Mats assigned',
  referrals: 'Referrals',
  export: 'Export CSV',
  wrongPassword: 'That password is not right.',
  notConfigured: 'Admin not configured',
  notConfiguredBody: 'Set ADMIN_PASSWORD and SESSION_SECRET in the environment to enable this page.',
  dailyTitle: 'Registrations by day',
  funnelTitle: 'Funnel',
  leadersTitle: 'Top recruiters',
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  columns: ['Mat', 'Name', 'Email', 'Status', 'Referred by', 'Paid at'],
  empty: 'No registrations match that search.',
} as const;

export const NOT_FOUND = {
  title: 'This page is asleep',
  body: 'We could not find what you were looking for. The mat is still open.',
  cta: 'Back to the contest',
} as const;

export const ERROR_PAGE = {
  title: 'Something woke us up',
  body: 'That did not work. Try again, and if it keeps happening the mat is still open.',
  retry: 'Try again',
} as const;

export const NOSCRIPT = {
  message:
    'This site uses JavaScript to run the registration form and the animation. The contest details, official rules, refund policy and privacy policy are all readable without it.',
} as const;
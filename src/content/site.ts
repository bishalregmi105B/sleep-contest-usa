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
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
};

export const SITE = {
  name: "The Great America's Sleep Contest",
  domain: 'sleepcontestusa.com',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  organizer: 'Sparsha LLC',
  tagline: 'Sleep deeper as you scroll.',
  deadline: raw.deadline,
  sponsor: raw.sponsor,
  email: raw.email,
  demoMode: raw.demoMode,
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

export const CONTACT_EMAIL_FALLBACK = 'hello@sleepcontestusa.com';

/** Where the contact link should point, whatever the client configured. */
export const contactHref = hasEmail ? `mailto:${SITE.email}` : '/friends';

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

export const TICKER =
  'REGISTRATION OPEN ★ $10 HOLDS YOUR SPOT ★ 200,000 SLEEPERS WANTED ★ WIN $100,000';

export const HERO = {
  h1: 'Can you sleep through anything?',
  sub: 'Air horns. Feathers. Bacon. 90 minutes. The deepest sleeper in America wins $100,000.',
  cta: 'Reserve my spot · $10',
  priceLine: '$39.99 total. $10 now, $29.99 after the date is announced.',
  badge: 'WIN $100,000',
} as const;

export const COUNTER = {
  label: 'Sleepers registered so far.',
  note: "The second we hit 200,000, the contest is on. Bring a friend and get us there faster.",
  bringFriend: 'Bring a friend',
  demoTag: 'DEMO DATA',
} as const;

/**
 * The four steps. These are a real sequence, so the numbering is meaningful.
 */
export const STEPS = [
  {
    title: 'Reserve for $10',
    body: 'Lock your spot now. At 200,000 sleepers we set the date and email you first.',
    asset: 'how-1-register',
    alt: 'An arena floor lined with thousands of illuminated inflatable sleeping mats.',
  },
  {
    title: 'Show up in pajamas',
    body: 'You get a mat, a pillow and a heart-rate clip. Best sleepwear wins a crowd prize.',
    asset: 'how-2-pajamas',
    alt: 'Wake-up squad referees in striped shirts carrying oversized horns.',
  },
  {
    title: 'Sleep for 90 minutes',
    body: 'Lights drop. A giant live leaderboard shows who is sleeping deepest.',
    asset: 'how-3-leaderboard',
    alt: 'A referee hovering a long pink feather over a sleeping contestant.',
  },
  {
    title: 'Survive the wake-up squad',
    body: 'Every 20 minutes they come for you. Open your eyes and you are out.',
    asset: 'how-4-feather',
    alt: 'A chef in a nightcap wafting a hot pan of bacon over sleepy contestants.',
  },
] as const;

/**
 * The three rounds. `strip` labels the mini heartbeat that plays with the round.
 */
export const ROUNDS = [
  {
    title: 'The Noise Round',
    body: 'Air horns, alarm clocks and one very loud rooster.',
    asset: 'squad-noise',
    alt: 'A vast arena filled with glowing sleeping mats under purple light.',
  },
  {
    title: 'The Tickle Round',
    body: 'A feather on the nose. Do not flinch.',
    asset: 'squad-tickle',
    alt: 'A referee testing a contestant’s eyelash with a giant yellow feather.',
  },
  {
    title: 'The Smell Round',
    body: 'Fresh bacon and coffee, wafted right past you.',
    asset: 'squad-smell',
    alt: 'A giant arena screen showing sleep telemetry charts and rankings.',
  },
] as const;

export const SQUAD = {
  heading: 'Meet the wake-up squad',
  sub: 'Their only job is to ruin your nap.',
  body: 'Three rounds stand between you and the cash.',
  stripLabel: "Sleeper's heart rate",
  replay: 'Run the rounds again',
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

export const PRIZES_SECTION = {
  heading: `The $${PRIZE_TOTAL.toLocaleString('en-US')} cash purse`,
  sub: `Top 5 sleepers share the prize purse and paid with the grand prize complete.`,
  prizeCardTitle: 'For the deepest sleeper in America.',
  grandRibbon: 'GRAND PRIZE',
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
  sub: 'A high-capacity sleepover, arena-scale. Here is our honest preview of the night.',
  conceptCaption: 'Concept art',
} as const;

/**
 * Gallery tiles. Two use hover video and fall back to their poster frame.
 * Every tile is illustrative: the event has not happened yet.
 */
export const GALLERY_TILES = [
  {
    key: 'gallery.1',
    asset: 'gallery-sleeping-floor',
    alt: 'A contestant in an inflatable marshmallow-monster onesie holding a giant pillow.',
    title: 'The best pajamas in the line-up',
  },
  {
    key: 'gallery.2',
    asset: 'gallery-squad-closeup',
    alt: 'Wake-up squad members carrying giant horns past sleeping contestants.',
    title: 'The squad, tiptoeing',
  },
  {
    key: 'gallery.3',
    asset: 'gallery-judge',
    alt: 'A storm of gold and blue confetti under bright arena stage lights.',
    title: 'The confetti moment',
  },
  {
    key: 'gallery.4',
    asset: 'how-3-leaderboard',
    alt: 'A referee testing a contestant’s eyelash with a long pink feather.',
    title: 'Do not flinch',
  },
  {
    key: 'gallery.5',
    asset: 'squad-noise',
    alt: 'A vast arena packed with glowing sleeping mats.',
    title: '200,000 mats, one arena',
  },
  {
    key: 'gallery.6',
    asset: 'how-2-pajamas',
    alt: 'Referees in striped shirts with oversized horn megaphones.',
    title: 'Every horn accounted for',
  },
] as const;

export const RESERVE = {
  title: 'Claim your mat.',
  sub: `The contest is confirmed once 200,000 people have registered. You must be ${SITE.minAge} or older to enter.`,
  consent:
    `I am ${SITE.minAge} or older and agree to the contest rules, waiver and being filmed.`,
  cta: "Pay $10 and I'm in.",
  note: "Full refund if the announced date doesn't suit you or the contest doesn't go ahead.",
  secure: 'Secure payment. We never store your card details.',
  /** Only shown when the client has not supplied a deadline. */
  neutralRefund:
    'If we do not reach 200,000, every reservation is refunded in full.',
  successTitle: "You're in!",
  successBody: 'Check your email for your ticket and the refund promise.',
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
  },
} as const;

export const FAQ = [
  {
    q: 'When and where is it?',
    a: 'In cities across the USA, starting with Dallas, Texas. Dates and venues are announced once 200,000 people have registered.',
  },
  {
    q: 'Can I get my $10 back?',
    // Replaced with neutral wording while no deadline is configured, so the page
    // never shows a literal placeholder.
    a: hasDeadline
      ? `Yes. If the date doesn't work for you, or we don't reach 200,000 by ${SITE.deadline}, you get a full refund.`
      : `Yes. If the date doesn't work for you, or we don't reach 200,000, you get a full refund.`,
  },
  {
    q: 'How is the winner chosen?',
    a: 'By heart rate. The sleeper whose heart rate drops the most and stays steady through every wake-up round wins.',
  },
  {
    q: 'What do I bring?',
    a: 'Your pajamas and a photo ID. Mats and pillows are provided. Sleep aids and alcohol are not allowed.',
  },
] as const;

export const FINAL_CTA = {
  heading: 'Think you can out-sleep America?',
  note: "Join 200,000 Americans already registered. Lock your spot now, pay the rest later, and sleep your way to $100,000.",
} as const;

export const FOOTER = {
  blurb: `${SITE.name} is organized by ${SITE.organizer}.`,
  contact: 'Contact',
  links: [
    { label: 'Contest rules', href: '/rules' },
    { label: 'Refund policy', href: '/refund' },
    { label: 'Privacy', href: '/privacy' },
  ],
} as const;

/** Copy for the pages the Stitch export never provided. */
export const TICKET = {
  title: "You're in!",
  sub: 'Your mat is reserved. We will email you the date and venue first.',
  matLabel: 'Mat',
  share: 'Share with friends',
  noCalendar: 'We will email you the date as soon as it is set.',
  emailCta: 'Email my ticket',
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
  total: 'Total paid',
  matRange: 'Mats assigned',
  referrals: 'Referrals',
  export: 'Export CSV',
  wrongPassword: 'That password is not right.',
  columns: ['Mat', 'Name', 'Email', 'Status', 'Referred by', 'Paid at'],
  empty: 'No registrations match that search.',
} as const;

export const NOT_FOUND = {
  title: 'This page is asleep',
  body: 'We could not find what you were looking for. The mat is still open.',
  cta: 'Back to the contest',
} as const;
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { normalizeEmail, normalizeMobile } from '../src/lib/privacy';

/**
 * Development seed.
 *
 * Inserts clearly-labelled sample registrations so the admin views have
 * something to render locally. Never run against a database with real
 * registrations: it is additive and will happily add fake rows to a production
 * table, which would corrupt the public count.
 *
 * Refuses to run in production for that reason.
 *
 * Usage: `npm run db:seed` (or `SEED_DEMO=true npm run dev`).
 */

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  throw new Error(
    'db:seed refuses to run with NODE_ENV=production. It would add synthetic rows to the public counter. Set ALLOW_SEED_IN_PRODUCTION=true only against a throwaway database.',
  );
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set to seed.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const FIRST = ['Ada', 'Grace', 'Alan', 'Katherine', 'Linus', 'Barbara', 'Tim', 'Radia', 'Linus', 'Margaret'];
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Johnson', 'Torvalds', 'Liskov', 'Berners-Lee', 'Perlman', 'Chen', 'Hamilton'];
const CITIES = ['Dallas, TX', 'Austin, TX', 'Houston, TX', 'Denver, CO', 'Phoenix, AZ', 'Atlanta, GA', 'Chicago, IL'];

const COUNT = Number(process.env.SEED_COUNT ?? '120');
const DOMAIN = 'example.com';

async function main() {
  const now = Date.now();

  const rows = Array.from({ length: COUNT }, (_, i) => {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7) % LAST.length]!;
    const email = normalizeEmail(`${first}.${last}.${i}@${DOMAIN}`);
    const status = i % 10 < 6 ? 'paid' : i % 10 < 8 ? 'pending' : 'expired';
    const createdAt = new Date(now - (COUNT - i) * 3_600_000);

    return {
      publicId: `seed${i.toString().padStart(12, '0')}`,
      fullName: `${first} ${last}`,
      email,
      emailNormalized: email,
      mobileE164: normalizeMobile(`555010${(i % 10000).toString().padStart(4, '0')}`),
      dateOfBirth: new Date('1990-01-01'),
      cityState: CITIES[i % CITIES.length]!,
      status,
      isInternal: i % 50 === 0,
      // Mat numbers come from the sequence, never from a counter in this file.
      refCode: `S${i.toString(36).toUpperCase().padStart(8, '0')}`,
      referredBy: i % 3 === 0 ? `S${((i % 20) + 1).toString(36).toUpperCase().padStart(8, '0')}` : null,
      paymentProvider: status === 'paid' ? 'stripe' : 'stripe',
      holdExpiresAt: status === 'pending' ? new Date(now + 1_800_000) : null,
      ipHash: null,
      consentAt: createdAt,
      createdAt,
      paidAt: status === 'paid' ? createdAt : null,
    };
  });

  await prisma.registration.createMany({ data: rows, skipDuplicates: true });

  // Keep the denormalised counters consistent with what was just inserted.
  const [paid, reserved] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "Registration"
      WHERE status = 'paid' AND NOT "isInternal"`,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM "Registration"
      WHERE status IN ('pending', 'paid')`,
  ]);

  await prisma.$executeRaw`
    UPDATE "Counter" SET paid = ${Number(paid[0]?.count ?? 0)}, reserved = ${Number(reserved[0]?.count ?? 0)}
    WHERE id = 1`;

  console.log(`seeded ${rows.length} sample registrations (${paid[0]?.count ?? 0} paid, non-internal)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

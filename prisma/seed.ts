/**
 * Demo data for local development.
 *
 * Runs only when SEED_DEMO=true and never in production, so a demo registration
 * count can never reach the live site. The names here are clearly fictional and
 * the emails use a reserved domain (example.com), which cannot receive mail.
 */
import { db } from '../src/lib/db';
import { newPublicId, newRefCode } from '../src/lib/ids';

const FIRST = ['Ada', 'Bo', 'Cleo', 'Dev', 'Esi', 'Finn', 'Gia', 'Hana', 'Iris', 'Jo'];
const LAST = ['Asleep', 'Dozer', 'Napper', 'Snooze', 'Yawner', 'Dreamer'];
const CITIES = ['Dallas, TX', 'Austin, TX', 'Denver, CO', 'Phoenix, AZ', 'Atlanta, GA'];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Refusing to seed in production.');
    return;
  }

  if (process.env.SEED_DEMO !== 'true') {
    console.log('SEED_DEMO is not true. Nothing seeded.');
    return;
  }

  const existing = await db.registration.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} registrations. Nothing seeded.`);
    return;
  }

  const rows = Array.from({ length: 24 }, (_, index) => {
    const first = FIRST[index % FIRST.length]!;
    const last = LAST[index % LAST.length]!;
    return {
      publicId: newPublicId(),
      fullName: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`,
      mobile: `55501${String(index).padStart(2, '0')}`,
      dateOfBirth: new Date(1980 + (index % 25), index % 12, (index % 27) + 1),
      cityState: CITIES[index % CITIES.length]!,
      status: index % 5 === 0 ? 'pending' : 'paid',
      matNumber: index % 5 === 0 ? null : index + 1,
      refCode: newRefCode(),
      referredBy: index % 4 === 0 ? null : 'DEMO1234',
      paymentProvider: 'mock',
      consentAt: new Date(),
      paidAt: index % 5 === 0 ? null : new Date(),
    };
  });

  await db.registration.createMany({ data: rows });

  const paid = rows.filter((row) => row.status === 'paid').length;
  console.log(`Seeded ${rows.length} demo registrations (${paid} paid, ${rows.length - paid} pending).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
import type { Registration, Store } from './types';

/**
 * In-memory store.
 *
 * The demo backend. It needs no database, no migrations and no environment
 * variables, which matters on a hosted platform where a filesystem database is
 * ephemeral and a managed database needs provisioning before anything can be
 * demonstrated.
 *
 * State lives in the module, so it is shared between requests handled by the
 * same instance and is lost when that instance restarts. That is fine for a
 * demo and is exactly the limitation to be aware of; set DATABASE_URL to use
 * the database store instead, which persists properly.
 */
export function memoryStore(): Store {
  // Route handlers and pages are separate bundles that each evaluate this
  // module, so a plain module-level array would give every route its own copy
  // and /api/checkout could not see what /api/register had just written.
  // globalThis makes it one store per process.
  const shared = globalThis as unknown as { __demoRows?: Registration[] };
  const rows = (shared.__demoRows ??= []);

  const find = (publicId: string) => rows.find((row) => row.publicId === publicId) ?? null;

  return {
    kind: 'memory',

    async create(data) {
      const row: Registration = {
        ...data,
        status: 'pending',
        matNumber: null,
        paymentProvider: 'mock',
        createdAt: new Date(),
        paidAt: null,
      };
      rows.push(row);
      return row;
    },

    async findByPublicId(publicId) {
      return find(publicId);
    },

    async findByEmail(email) {
      const target = email.toLowerCase();
      const matches = rows.filter((row) => row.email === target);
      return matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
    },

    async findByRefCode(refCode) {
      return rows.find((row) => row.refCode === refCode) ?? null;
    },

    async markPaid(publicId, payment) {
      const row = find(publicId);
      if (!row) return null;

      // Idempotent: paying twice must not burn a second mat number.
      if (row.status === 'paid' && row.matNumber !== null) return row;

      const highest = rows.reduce((max, item) => Math.max(max, item.matNumber ?? 0), 0);
      row.status = 'paid';
      row.matNumber = highest + 1;
      row.paidAt = new Date();
      row.paymentProvider = payment.provider;
      return row;
    },

    async countPaid() {
      return rows.filter((row) => row.status === 'paid').length;
    },

    async countAll() {
      return rows.length;
    },

    async countReferred() {
      return rows.filter((row) => row.referredBy !== null).length;
    },

    async highestMat() {
      return rows.reduce((max, row) => Math.max(max, row.matNumber ?? 0), 0);
    },

    async updatePending(publicId, patch) {
      const row = find(publicId);
      if (!row) return null;
      Object.assign(row, patch);
      return row;
    },

    async topRecruiters(limit) {
      const tally = new Map<string, number>();
      for (const row of rows) {
        if (!row.referredBy) continue;
        tally.set(row.referredBy, (tally.get(row.referredBy) ?? 0) + 1);
      }

      return [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([refCode, count]) => ({
          refCode,
          count,
          matNumber: rows.find((row) => row.refCode === refCode)?.matNumber ?? null,
        }));
    },

    async list({ query, skip, take }) {
      const filtered = query
        ? rows.filter(
            (row) =>
              row.fullName.toLowerCase().includes(query.toLowerCase()) ||
              row.email.toLowerCase().includes(query.toLowerCase()),
          )
        : rows;
      return [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(skip, skip + take);
    },

    async all() {
      return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
  };
}
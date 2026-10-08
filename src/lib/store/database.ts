import { db } from '@/lib/db';
import type { Registration, Store } from './types';

/**
 * Prisma-backed store.
 *
 * Used when DATABASE_URL points at a real database. Selected automatically, so
 * nothing else in the app needs to know which backend is answering.
 *
 * The mapping to and from the row type happens here, which keeps Prisma's
 * generated types out of the rest of the codebase.
 */

type Row = {
  publicId: string;
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: Date;
  cityState: string;
  status: string;
  matNumber: number | null;
  refCode: string;
  referredBy: string | null;
  paymentProvider: string;
  consentAt: Date;
  createdAt: Date;
  paidAt: Date | null;
};

function toRegistration(row: Row): Registration {
  return {
    ...row,
    status: row.status as Registration['status'],
  };
}

export function databaseStore(): Store {
  return {
    kind: 'database',

    async create(data) {
      const created = await db.registration.create({
        data: {
          publicId: data.publicId,
          fullName: data.fullName,
          email: data.email,
          mobile: data.mobile,
          dateOfBirth: data.dateOfBirth,
          cityState: data.cityState,
          consentAt: data.consentAt,
          refCode: data.refCode,
          referredBy: data.referredBy,
          status: 'pending',
          paymentProvider: 'mock',
        },
      });
      return toRegistration(created);
    },

    async findByPublicId(publicId) {
      const row = await db.registration.findUnique({ where: { publicId } });
      return row ? toRegistration(row) : null;
    },

    async findByEmail(email) {
      const row = await db.registration.findFirst({
        where: { email: email.toLowerCase() },
        orderBy: { createdAt: 'desc' },
      });
      return row ? toRegistration(row) : null;
    },

    async findByRefCode(refCode) {
      const row = await db.registration.findUnique({ where: { refCode } });
      return row ? toRegistration(row) : null;
    },

    async markPaid(publicId, payment) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          return await db.$transaction(async (tx) => {
            const existing = await tx.registration.findUnique({ where: { publicId } });
            if (!existing) return null;

            if (existing.status === 'paid' && existing.matNumber !== null) {
              return toRegistration(existing);
            }

            const last = await tx.registration.findFirst({
              where: { matNumber: { not: null } },
              orderBy: { matNumber: 'desc' },
              select: { matNumber: true },
            });

            const updated = await tx.registration.update({
              where: { publicId },
              data: {
                status: 'paid',
                matNumber: (last?.matNumber ?? 0) + 1,
                paidAt: new Date(),
                paymentProvider: payment.provider,
                paymentRef: payment.ref,
              },
            });
            return toRegistration(updated);
          });
        } catch (err) {
          // P2002: another payment took this mat number. Retry.
          const code = err instanceof Error && 'code' in err ? (err as { code?: string }).code : null;
          if (code === 'P2002' && attempt < 4) continue;
          throw err;
        }
      }
      return null;
    },

    async countPaid() {
      return db.registration.count({ where: { status: 'paid' } });
    },

    async countAll() {
      return db.registration.count();
    },

    async countReferred() {
      return db.registration.count({ where: { referredBy: { not: null } } });
    },

    async highestMat() {
      const last = await db.registration.findFirst({
        where: { matNumber: { not: null } },
        orderBy: { matNumber: 'desc' },
        select: { matNumber: true },
      });
      return last?.matNumber ?? 0;
    },

    async updatePending(publicId, patch) {
      const updated = await db.registration.update({ where: { publicId }, data: patch });
      return toRegistration(updated);
    },

    async topRecruiters(limit) {
      const grouped = await db.registration.groupBy({
        by: ['referredBy'],
        _count: { referredBy: true },
        where: { referredBy: { not: null } },
        orderBy: { _count: { referredBy: 'desc' } },
        take: limit,
      });

      const codes = grouped
        .map((row) => row.referredBy)
        .filter((value): value is string => typeof value === 'string');

      const owners = codes.length
        ? await db.registration.findMany({
            where: { refCode: { in: codes } },
            select: { refCode: true, matNumber: true },
          })
        : [];
      const byCode = new Map(owners.map((row) => [row.refCode, row.matNumber]));

      return grouped.map((row) => ({
        refCode: row.referredBy ?? '',
        count: row._count.referredBy,
        matNumber: byCode.get(row.referredBy ?? '') ?? null,
      }));
    },

    async list({ query, skip, take }) {
      const rows = await db.registration.findMany({
        where: query
          ? {
              OR: [
                { fullName: { contains: query } },
                { email: { contains: query } },
              ],
            }
          : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });
      return rows.map(toRegistration);
    },

    async all() {
      const rows = await db.registration.findMany({ orderBy: { createdAt: 'desc' } });
      return rows.map(toRegistration);
    },
  };
}
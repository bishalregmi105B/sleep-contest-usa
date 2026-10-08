import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

/**
 * GET /api/admin/export
 *
 * CSV of every registration. Admin session required. Nothing here is logged:
 * the response itself is the only place this data appears.
 */

/** Escapes a value for CSV: quotes doubled, wrapped when it contains a comma. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ message: 'Not authorised.' }, { status: 401 });
  }

  const rows = await db.registration.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      matNumber: true,
      fullName: true,
      email: true,
      mobile: true,
      cityState: true,
      status: true,
      refCode: true,
      referredBy: true,
      paymentProvider: true,
      createdAt: true,
      paidAt: true,
    },
  });

  const header = [
    'Mat',
    'Name',
    'Email',
    'Mobile',
    'City/State',
    'Status',
    'Ref code',
    'Referred by',
    'Payment provider',
    'Created at',
    'Paid at',
  ].join(',');

  const body = rows
    .map((row) =>
      [
        row.matNumber ?? '',
        row.fullName,
        row.email,
        row.mobile,
        row.cityState,
        row.status,
        row.refCode,
        row.referredBy ?? '',
        row.paymentProvider,
        row.createdAt.toISOString(),
        row.paidAt?.toISOString() ?? '',
      ]
        .map(csvCell)
        .join(','),
    )
    .join('\n');

  return new NextResponse(`${header}\n${body}\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sleep-contest-registrations.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

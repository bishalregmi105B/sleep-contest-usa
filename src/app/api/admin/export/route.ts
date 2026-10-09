import { connection } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { iterateAllRegistrations } from '@/lib/repository';
import { log } from '@/lib/logger';


/**
 * GET /api/admin/export
 *
 * CSV of every registration, **streamed**.
 *
 * The previous implementation called `store.all()`, which is
 * `findMany({})` with no limit, joined it into one string and returned it. At
 * 200,000 registrations that allocates the entire table plus a second full-size
 * string, and a serverless function dies well before that. This walks the table
 * in keyset-paginated batches and pipes them straight into the response, so
 * memory stays flat regardless of table size.
 *
 * A CSV formula injection guard is applied to every text cell: a registrant who
 * types `=cmd|...` into the name field would otherwise execute when an operator
 * opens the file in Excel. Prefixing with a single quote neutralises it.
 */

const COLUMNS = [
  'Mat',
  'Name',
  'Email',
  'Mobile',
  'City/State',
  'Status',
  'Internal',
  'Ref code',
  'Referred by',
  'Payment provider',
  'Payment ref',
  'Created at',
  'Paid at',
] as const;

/** Escapes a CSV cell and neutralises spreadsheet formula injection. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // A leading = + - @ is interpreted as a formula by Excel, Sheets and
  // LibreOffice. Prefixing with an apostrophe makes it literal text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  // Streams a live table; a prerendered body would be a stale or empty export.
  await connection();

  if (!(await isAuthenticated())) {
    return Response.json({ message: 'Not authorised.' }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const header = `${COLUMNS.join(',')}\n`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(header));
      let rows = 0;
      try {
        for await (const batch of iterateAllRegistrations(1_000)) {
          const chunk =
            batch
              .map((row) =>
                [
                  row.matNumber ?? '',
                  row.fullName,
                  row.email,
                  row.mobileE164,
                  row.cityState,
                  row.status,
                  row.isInternal ? 'yes' : '',
                  row.refCode,
                  row.referredBy ?? '',
                  row.paymentProvider,
                  row.paymentRef ?? '',
                  row.createdAt.toISOString(),
                  row.paidAt?.toISOString() ?? '',
                ]
                  .map(csvCell)
                  .join(','),
              )
              .join('\n') + '\n';
          controller.enqueue(encoder.encode(chunk));
          rows += batch.length;
        }
        // The export contains every registrant's personal data. Recorded so
        // there is an answer to "who exported the list, and when".
        log.info('admin: exported registrations', { rows });
      } catch (err) {
        log.error('admin: export failed', {
          rows,
          error: err instanceof Error ? err.message : 'unknown',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="sleep-contest-registrations.csv"',
      'Cache-Control': 'no-store',
    },
  });
}

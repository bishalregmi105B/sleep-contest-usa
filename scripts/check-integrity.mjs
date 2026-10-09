#!/usr/bin/env node
/**
 * Honesty guardrails. Runs in `prebuild` and in CI, and fails the build.
 *
 * These checks exist because the most damaging thing this project could ship is
 * a number that is not real. The client asked for a capacity display; the brief
 * explicitly ruled out offsets, seeds and multipliers, because advertising a cap
 * of 500 while accepting 200,000 people is false scarcity on a page that takes
 * money — deceptive design under Section 5 of the FTC Act.
 *
 * A lint rule that fails the build is the only version of this rule that holds,
 * because review does not scale and the temptation is invisible once the number
 * is wired up.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');
const CONTENT = path.join(ROOT, 'src/content');
const GWR_DIR = path.join(SRC, 'components/gwr');

/** Property names that would let a real count be faked. */
const FORBIDDEN_IDENTIFIERS = [
  'displayOffset',
  'fakeCount',
  'seedCount',
  'fakePaid',
  'fakeTotal',
  'countOffset',
  'offsetCount',
  'pretendCount',
  'simulatedCount',
];

/** Brand and legal strings that must never appear outside the GWR gate. */
const GUINNESS_TERMS = [/\bguinness\b/i, /world record/i];

const problems = [];

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * 1. No faked-count properties in application code.
 *
 * Tests and the integrity checker itself are exempt: a test needs to be able to
 * assert the property is absent.
 */
{
  const files = (await walk(SRC)).filter((f) => !/\.(test|spec)\./.test(f));
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      for (const name of FORBIDDEN_IDENTIFIERS) {
        if (line.includes(name)) {
          problems.push(
            `${path.relative(ROOT, file)}:${index + 1} references "${name}". ` +
              'The public count must be the real count from the database.',
          );
        }
      }
    });
  }
}

/**
 * 2. Guinness wording may only appear in the GWR component, the content file
 *    behind the flag, tests and docs.
 *
 * With the flag off, no rendered page may contain "Guinness" or "world record".
 * The client has not yet supplied written approval, and Guinness World Records
 * requires a licence for any commercial use of its name or logos.
 */
{
  const files = await walk(SRC);
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (file.startsWith(GWR_DIR)) continue;
    if (rel.startsWith('content/')) continue;          // behind the flag
    if (/\.(test|spec)\./.test(file)) continue;        // asserting absence
    if (file.includes(path.join('lib', 'integrity'))) continue;
    // The settings module *defines* the gate (gwrEnabled, gwrApprovalRef) and
    // enforces its guard, so it necessarily names the brand. It renders
    // nothing; the check that matters for output is the rendered-page test.
    if (rel === path.join('src', 'lib', 'settings.ts')) continue;

    const source = await readFile(file, 'utf8');
    source.split('\n').forEach((line, index) => {
      for (const term of GUINNESS_TERMS) {
        if (term.test(line)) {
          problems.push(
            `${rel}:${index + 1} mentions ${term.source}. ` +
              'It may only appear in src/components/gwr/ or src/content/, both behind the gwrEnabled flag.',
          );
        }
      }
    });
  }
}

/**
 * 3. No production path may construct the mock payment provider.
 *
 * `mockPaymentsAllowed` is already false in production by construction in
 * `lib/env.ts`. This checks the weaker property that the guard still exists:
 * the flag is consulted before the mock provider is reachable.
 */
{
  const checkout = await readFile(path.join(SRC, 'app/api/checkout/route.ts'), 'utf8');
  if (checkout.includes('mockProvider') && !checkout.includes('mockPaymentsAllowed')) {
    problems.push(
      'src/app/api/checkout/route.ts reaches the mock payment provider without consulting mockPaymentsAllowed. ' +
        'A production deploy must never issue a ticket without a payment.',
    );
  }
}

/**
 * 4. `localhost` must not appear in anything a visitor can see.
 *
 * Scoped to content and components rather than the whole of `src`, because
 * `lib/env.ts` legitimately carries `http://localhost:3000` as its documented
 * development default, and `lib/payments` uses it in a type example. What must
 * never happen is a shipped string that sends a visitor to localhost.
 */
{
  const targets = [
    ...(await walk(path.join(SRC, 'content'))),
    ...(await walk(path.join(SRC, 'components'))),
  ];

  for (const file of targets) {
    const source = await readFile(file, 'utf8');
    if (/localhost:3000/.test(source)) {
      problems.push(
        `${path.relative(ROOT, file)} contains a hard-coded localhost:3000 in user-facing content.`,
      );
    }
  }
}

/**
 * 5. The asset referenced by the GWR gate must exist if the component ships it.
 *
 * A missing asset must degrade to rendering nothing, never to a broken image on
 * a page that takes money.
 */
{
  const asset = path.join(ROOT, 'public/assets/brand/gwr-official-attempt.webp');
  const component = path.join(GWR_DIR, 'GwrBadge.tsx');
  try {
    await stat(component);
    const source = await readFile(component, 'utf8');
    if (source.includes('gwr-official-attempt') && !source.includes('existsSync')) {
      problems.push(
        'src/components/gwr/GwrBadge.tsx references the logo without checking it exists. ' +
          'The badge must render nothing when the asset is missing.',
      );
    }
  } catch {
    // Component not built yet. Nothing to check.
  }
  try {
    await stat(asset);
  } catch {
    // Optional: the client has not supplied the file. Documented in
    // CLIENT_INPUTS_NEEDED.md.
  }
}

if (problems.length > 0) {
  console.error('\nIntegrity check FAILED:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`\n${problems.length} problem(s). The public count must be real, and licensed marks must be gated.\n`);
  process.exit(1);
}

console.log('integrity: no faked counts, no ungated licensed marks, no mock payments in production');

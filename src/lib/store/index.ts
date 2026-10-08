import { env } from '@/lib/env';
import type { Store } from './types';
import { memoryStore } from './memory';
import { databaseStore } from './database';

/**
 * Chooses the backend.
 *
 * **The default is in-memory, deliberately.** A hosted platform has an
 * ephemeral filesystem, so a file-based database silently loses every
 * registration between requests, and a managed database has to be provisioned
 * before anything can be shown. For a demo, in-memory means the site works the
 * moment it is deployed, with no database to set up and no migration to run.
 *
 * Set DATABASE_URL to a PostgreSQL connection string to persist properly. The
 * datasource provider in prisma/schema.prisma is switched to match by
 * scripts/set-db-provider.mjs, which runs on postinstall, prebuild and predev.
 *
 * The in-memory store lives in module scope, so it is shared across requests
 * handled by the same instance and resets when that instance restarts.
 */
export function getStore(): Store {
  const isPostgres =
    env.databaseUrl.startsWith('postgres://') || env.databaseUrl.startsWith('postgresql://');

  return isPostgres ? databaseStore() : memoryStore();
}

export type { Registration, Store } from './types';
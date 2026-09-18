import path from 'path';

/**
 * Shared plumbing for the seed files. scripts/seed.mts passes the request as JSON in SEED, and
 * each seed file writes one line per record it created to SEED_LOG, which the script prints.
 */
export const SEED_LOG = path.resolve(__dirname, '../../test-results/seeded.log');

/** The request, if it is for one of `types`; otherwise undefined, and the file adds no tests. */
export function seedRequest<T extends { type: string }>(...types: string[]): T | undefined {
  const req = JSON.parse(process.env.SEED ?? '{}') as T;
  return types.includes(req.type) ? req : undefined;
}

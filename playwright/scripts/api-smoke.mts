/**
 * Check that the API token works, by reading a couple of work orders. Read-only: it only ever
 * issues GETs, so it is safe to run against the shared QA env at any time.
 *
 *     pnpm api:smoke                      # list 2 WOs and read each one's Summary
 *     pnpm api:smoke --count 5            # read more of them
 *     pnpm api:smoke --location 2 --season 13
 *
 *     --count N        how many work orders to read   (default 2, max 20)
 *     --location N     Site id                        (default 2, Colusa)
 *     --season N       Season id                      (default 13, Crop Year 2026)
 *     --category N     work-order category            (default 1, planned)
 *
 * Run it after pasting a fresh token to confirm the token is good before a longer job. It
 * reports which source the token came from, never the token itself. Exit codes:
 * 0 all good, 1 a call failed, 2 bad usage or no usable token.
 */
import { parseArgs } from 'util';
import { ApiClient, ApiError, TOKEN_FILE } from '../api/client.mts';

const { values } = parseArgs({
  options: {
    count: { type: 'string' },
    location: { type: 'string' },
    season: { type: 'string' },
    category: { type: 'string' },
  },
});

const count = num(values.count, 2, 'count');
const locationId = num(values.location, 2, 'location');
const seasonId = num(values.season, 13, 'season');
const category = num(values.category, 1, 'category');
if (count < 1 || count > 20) fail('--count must be between 1 and 20');

let api: ApiClient;
try {
  api = new ApiClient();
} catch (e) {
  // A missing, malformed or expired token lands here; api/client.mts says which.
  fail(`${(e as Error).message}\n  token file: ${TOKEN_FILE}`);
}

await main();

async function main(): Promise<void> {
  let failed = 0;

  const list = await get('WorkOrder', { LocationID: locationId, SeasonID: seasonId, Category: category, Page: 1, Limit: count });
  if (!list) fail('could not list work orders; the token is probably not usable');
  const rows = rowsOf(list);
  console.log(
    `GET /api/WorkOrder  site ${locationId}, season ${seasonId}, category ${category}` +
      `  ->  ${rows.length} row(s), ${(list as Record<string, unknown>).recordsTotal ?? '?'} total`,
  );
  if (!rows.length) fail('the list came back empty; check --location/--season');

  for (const row of rows) {
    const id = Number(row.workOrderID ?? row.id);
    const seq = String(row.sequenceNo ?? '?');
    // locationId/seasonId are lowercase here, and required in practice: omitted, the server
    // binds 0 and answers 403 "Selected site is not valid for this work order!".
    const summary = await get(`WorkOrder/${id}/Summary`, { locationId, seasonId });
    if (!summary) {
      failed++;
      continue;
    }
    const s = (summary as Record<string, unknown>).data ?? summary;
    const detail = s as Record<string, unknown>;
    console.log(
      `  ${seq.padEnd(8)} id ${String(id).padEnd(6)} ${String(row.statusName ?? row.status ?? '?').padEnd(12)} ` +
        `${String(detail.name ?? row.name ?? '')}`,
    );
  }

  console.log(`\n${rows.length - failed} of ${rows.length} work order(s) read. Token OK.`);
  process.exit(failed ? 1 : 0);
}

/** A GET that reports an API error instead of throwing, so one bad row doesn't end the run. */
async function get(route: string, params: Record<string, string | number>): Promise<unknown | null> {
  try {
    return await api.get(route, params);
  } catch (e) {
    const detail = e instanceof ApiError ? `${e.status}${e.body ? ` ${e.body.slice(0, 200)}` : ''}` : (e as Error).message;
    console.error(`  FAILED  GET /api/${route}: ${detail}`);
    return null;
  }
}

function rowsOf(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  const data = (body as Record<string, unknown>)?.data;
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

function num(raw: string | undefined, fallback: number, flag: string): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) fail(`--${flag} must be a whole number`);
  return n;
}

function fail(message: string): never {
  console.error(`api:smoke: ${message}`);
  process.exit(2);
}

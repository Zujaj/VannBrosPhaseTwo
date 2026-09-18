/**
 * Delete work orders on the QA env through the API, e.g. data left behind by seeding.
 *
 *     pnpm wo:delete WO-1258 WO-1260            # dry run: shows what would be deleted
 *     pnpm wo:delete WO-1258 WO-1260 --yes      # deletes them
 *     pnpm wo:delete --name "Seed Planned WO 1789638946606-1" --yes
 *
 *     --name TEXT      also match every WO whose name contains TEXT (repeatable)
 *     --location N     Site id                     (default 2, Colusa)
 *     --season N       Season id                   (default 13, Crop Year 2026)
 *     --yes            actually delete; without it nothing is changed
 *
 * Needs an API token; see api/client.mts. Each WO is looked up first, so a sequence number that
 * matches nothing is reported rather than guessed, and each delete is confirmed by looking the
 * WO up again.
 */
import { parseArgs } from 'util';
import { ApiClient, ApiError } from '../api/client.mts';
import { deleteWorkOrder, findByName, findBySequence, type WorkOrderRef } from '../api/work-orders.mts';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: 'string', multiple: true, default: [] },
    location: { type: 'string' },
    season: { type: 'string' },
    yes: { type: 'boolean', default: false },
  },
});

const sequences = positionals.map((s) => s.trim().toUpperCase());
const bad = sequences.find((s) => !/^WO-\d+$/.test(s));
if (bad) fail(`${bad}: expected a sequence number like WO-1258`);
if (!sequences.length && !values.name.length) fail('give at least one sequence number or --name');

const scope = {
  ...(values.location && { locationId: Number(values.location) }),
  ...(values.season && { seasonId: Number(values.season) }),
};

let api: ApiClient;
try {
  api = new ApiClient();
} catch (e) {
  fail((e as Error).message);
}
const targets = new Map<number, WorkOrderRef>();
let missing = 0;

try {
  await main();
} catch (e) {
  if (e instanceof ApiError && e.status === 401) {
    fail('401 Unauthorized: the API rejected the token. Check it in Swagger with a GET that returns 200.');
  }
  throw e;
}

async function main() {
  for (const seq of sequences) {
    const wo = await findBySequence(api, seq, scope);
    if (wo) targets.set(wo.id, wo);
    else {
      console.log(`not found  ${seq}`);
      missing++;
    }
  }
  for (const name of values.name) {
    const found = await findByName(api, name, scope);
    if (!found.length) {
      console.log(`not found  name contains "${name}"`);
      missing++;
    }
    for (const wo of found) targets.set(wo.id, wo);
  }

  for (const wo of targets.values()) console.log(`${values.yes ? 'deleting ' : 'would delete'}  ${wo.sequenceNo}  (id ${wo.id})  ${wo.name}`);
  if (!values.yes) {
    console.log(`\nDry run: ${targets.size} work order(s) matched. Re-run with --yes to delete them.`);
    process.exit(missing ? 1 : 0);
  }

  let failed = 0;
  for (const wo of targets.values()) {
    try {
      await deleteWorkOrder(api, wo.id);
      const still = await findBySequence(api, wo.sequenceNo, scope);
      if (still) throw new Error('still listed after delete');
      console.log(`deleted    ${wo.sequenceNo}`);
    } catch (e) {
      failed++;
      console.error(`FAILED     ${wo.sequenceNo}: ${(e as Error).message}`);
    }
  }
  console.log(`\n${targets.size - failed} deleted, ${failed} failed, ${missing} not found.`);
  process.exit(failed || missing ? 1 : 0);
}

function fail(message: string): never {
  console.error(`wo:delete: ${message}`);
  process.exit(2);
}

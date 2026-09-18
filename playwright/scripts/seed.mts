/**
 * Create test data on the QA env in bulk.
 *
 *     pnpm seed:planned --count 5 --plots 10 --materials 2 --resources 3 --assets 2
 *     pnpm seed:harvest --count 3 --plots 4 --resources 2 --assets 1
 *     pnpm seed:tickets --tickets 25 --pair "130:LIVINGSTON" --pair "328:WINTERS"
 *
 * Work orders (planned / harvest), all optional:
 *     --count N        work orders to create                       (default 1)
 *     --plots N        plots per WO, at least 1                    (default 1)
 *     --materials N    materials per WO, Planned only              (default planned 1, harvest 0)
 *     --resources N    resources per WO                            (default 1)
 *     --assets N       assets per WO                               (default 1)
 *     --workers N      WOs created at once                         (default 2)
 *     --prefix TEXT    WO name prefix         (default "Seed Planned WO" / "Seed Harvest WO")
 *     --farm LABEL     farm, as the dropdown shows it              (default "Vann Farm (VBSF)")
 *     --task LABEL     task, as the dropdown shows it  (default "Fertilization (1240)" / "Harvest (1610)")
 *
 * Harvest tickets (Harvest Central > Plan Harvest Tickets):
 *     --tickets N          planned tickets per pair                (default 10)
 *     --pair FIELD:VARIETY field and variety as the dropdowns show them; repeat for more pairs
 *                          (default 130:LIVINGSTON). A new pair adds a row to Harvest Central.
 *
 *     --headed         show the browser (all types)
 *     --api            Planned only: POST the WOs straight to the API instead of filling the
 *                      form (api/planned-work-order.mts; needs the API token, see api/client.mts).
 *                      Same body the form sends, minutes faster. --headed does not apply.
 *
 * By default everything goes through the real UI (tests/seed/), so the records match what a
 * person would make. Limits, from the live form on 2026-09-17: plots list all 103 on one page; materials,
 * resources and assets page at 50 and the seed pages through them, so the cap below is only a
 * sanity bound (a panel with fewer usable rows fails with the count it found); Harvest WOs
 * have no materials; one ticket plan takes at most 100, so larger counts are sent in batches
 * of 100.
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { ApiClient, ApiError } from '../api/client.mts';
import { buildPlannedBody, postWorkOrder } from '../api/planned-work-order.mts';

const ROOT = path.resolve(import.meta.dirname, '..');
const LOG = path.join(ROOT, 'test-results', 'seeded.log');
const MAX_PICKS = 200;
const MAX_PLOTS = 103;

const [type, ...rest] = process.argv.slice(2);
if (type !== 'planned' && type !== 'harvest' && type !== 'tickets') {
  fail('first argument must be "planned", "harvest" or "tickets"');
}

const { values } = parseArgs({
  args: rest,
  options: {
    count: { type: 'string', default: '1' },
    plots: { type: 'string', default: '1' },
    materials: { type: 'string', default: type === 'planned' ? '1' : '0' },
    resources: { type: 'string', default: '1' },
    assets: { type: 'string', default: '1' },
    workers: { type: 'string', default: '2' },
    prefix: { type: 'string' },
    farm: { type: 'string' },
    task: { type: 'string' },
    tickets: { type: 'string', default: '10' },
    pair: { type: 'string', multiple: true, default: ['130:LIVINGSTON'] },
    headed: { type: 'boolean', default: false },
    api: { type: 'boolean', default: false },
  },
});

let request: object;
let summary: string;
if (type === 'tickets') {
  const tickets = int('tickets', 1, 1000);
  const pairs = values.pair.map((raw) => {
    const at = raw.indexOf(':');
    const [field, variety] = [raw.slice(0, at).trim(), raw.slice(at + 1).trim()];
    if (at < 0 || !field || !variety) fail(`--pair ${raw}: expected FIELD:VARIETY, e.g. 130:LIVINGSTON`);
    return { field, variety };
  });
  const keys = pairs.map((p) => `${p.field}:${p.variety}`);
  const repeated = keys.find((k, i) => keys.indexOf(k) !== i);
  if (repeated) fail(`--pair ${repeated} is given twice; its before/after count check needs it once`);
  request = { type, tickets, pairs };
  summary = `Planning ${tickets} harvest ticket(s) for each of: ${keys.join(', ')}.`;
} else {
  const count = int('count', 1, 500);
  const wo = {
    plots: int('plots', 1, MAX_PLOTS),
    materials: int('materials', 0, type === 'harvest' ? 0 : MAX_PICKS),
    resources: int('resources', 0, MAX_PICKS),
    assets: int('assets', 0, MAX_PICKS),
  };
  request = { type, count, ...wo, prefix: values.prefix, farm: values.farm, task: values.task };
  summary =
    `Creating ${count} ${type} work order(s): ${wo.plots} plot(s), ${wo.materials} material(s), ` +
    `${wo.resources} resource(s), ${wo.assets} asset(s) each.`;
}
const workers = int('workers', 1, 8);
if (values.api && type !== 'planned') fail('--api supports planned work orders only');

console.log(`${summary}\nThis creates real data on the shared QA env.`);
rmSync(LOG, { force: true });

if (values.api) process.exit(await seedPlannedViaApi(request as PlannedSeed));

const run = spawnSync(
  'playwright',
  ['test', '--project=seed', `--workers=${workers}`, '--reporter=list', ...(values.headed ? ['--headed'] : [])],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      PATH: `${path.join(ROOT, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`,
      PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
      SEED: JSON.stringify(request),
    },
  },
);

const created = existsSync(LOG) ? readFileSync(LOG, 'utf8').trim().split('\n').filter(Boolean) : [];
console.log(`\nCreated (${created.length}):`);
for (const line of created) console.log(`  ${line}`);
process.exit(run.status ?? 1);

interface PlannedSeed {
  count: number;
  plots: number;
  materials: number;
  resources: number;
  assets: number;
  prefix?: string;
  farm?: string;
  task?: string;
}

/**
 * Create the WOs through the API, `workers` at a time. Each POST is sent once and never retried
 * (a timed-out save can still be stored, FINDINGS.md #29). Returns the exit code.
 */
async function seedPlannedViaApi(req: PlannedSeed): Promise<number> {
  let api: ApiClient;
  try {
    api = new ApiClient();
  } catch (e) {
    fail((e as Error).message);
  }
  const prefix = req.prefix ?? 'Seed Planned WO';
  const created: string[] = [];
  let failed = 0;
  let next = 0;
  const one = async () => {
    for (let i = next++; i < req.count; i = next++) {
      const name = `${prefix} ${Date.now()}-${i + 1}`;
      const started = Date.now();
      let posted = false;
      try {
        const body = await buildPlannedBody(api, { ...req, name });
        posted = true;
        const res = await postWorkOrder(api, body);
        const text = JSON.stringify(res) ?? '';
        const sequence = text.match(/WO-\d+/)?.[0] ?? '(no sequence in response)';
        const secs = ((Date.now() - started) / 1000).toFixed(1);
        console.log(`  ✓ ${sequence}  ${name}  (${secs}s)`);
        created.push(`${sequence}  ${name}`);
      } catch (e) {
        failed++;
        console.error(`  ✘ ${name}: ${(e as Error).message}`);
        // A timeout or dropped connection is not a clean refusal: the server may have stored it.
        if (posted && !(e instanceof ApiError && e.status < 500)) {
          console.error('    The save may still be stored, possibly broken (FINDINGS.md #29). Check the');
          console.error('    sequence numbers after the last WO and remove leftovers with pnpm wo:delete.');
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, req.count) }, one));
  console.log(`\nCreated (${created.length}):`);
  for (const line of created) console.log(`  ${line}`);
  return failed ? 1 : 0;
}

function int(name: keyof typeof values, min: number, max: number): number {
  const raw = values[name] as string;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    const why =
      name === 'materials' && type === 'harvest'
        ? 'harvest work orders have no Materials section'
        : `must be a whole number from ${min} to ${max}`;
    fail(`--${name} ${raw}: ${why}`);
  }
  return n;
}

function fail(message: string): never {
  console.error(`seed: ${message}`);
  process.exit(2);
}

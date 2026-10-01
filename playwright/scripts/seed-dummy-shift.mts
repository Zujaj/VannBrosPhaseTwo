/**
 * Seed a fresh In Progress work order for the Dummy Resources v2 shift specs
 * (api/dummy-shifts.mts). Creates real data on QA: each run leaves one `QA DRS <timestamp>` WO in
 * Review — started WOs are never sent back to To Do or deleted.
 *
 *   pnpm seed:dummyshift              human-readable summary
 *   pnpm seed:dummyshift --json       one JSON line on stdout (what dummy-shifts-api.spec.ts reads)
 *   pnpm seed:dummyshift --close 31418   move the WO forward to Review (never back to To Do)
 */
import { parseArgs } from 'util';
import { ApiClient } from '../api/client.mts';
import { closeDummyShiftWorkOrder, seedDummyShiftWorkOrder } from '../api/dummy-shifts.mts';

const { values } = parseArgs({ options: { json: { type: 'boolean', default: false }, close: { type: 'string' } } });

// The client logs its token source to stdout; keep stdout clean for --json.
const log = console.log;
if (values.json) console.log = (...a: unknown[]) => console.error(...a);

try {
  const admin = new ApiClient();
  if (values.close) {
    await closeDummyShiftWorkOrder(admin, Number(values.close));
    log(values.json ? JSON.stringify({ closed: Number(values.close) }) : `WO id ${values.close} is in Review`);
  } else {
    const seed = await seedDummyShiftWorkOrder(admin);
    if (values.json) log(JSON.stringify(seed));
    else {
      log(`${seed.sequenceNo} (id ${seed.workOrderId}) In Progress, plot ${seed.fieldCode} (line ${seed.workOrderLineId})`);
      log(`  dummies: ${seed.dummies.map((d) => `${d.name} (${d.code}) ×${d.noOfResources}`).join(', ')}`);
      log(`  machines: ${seed.machineLabels.join(', ')}`);
    }
  }
} catch (e) {
  console.error(`seed:dummyshift failed: ${(e as Error).message}`);
  process.exit(1);
}

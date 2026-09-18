import { appendFileSync } from 'fs';
import { test } from '../fixtures';
import { seedScenario, type SeedRequest } from '../helpers/workOrderScenarios';
import { SEED_LOG, seedRequest } from './seed';

/**
 * Test-data seeding, not a test: creates `count` real work orders on the shared QA env.
 * Run it through `pnpm seed:planned` / `pnpm seed:harvest` (scripts/seed.mts), which validates
 * the request and passes it here as SEED. The `seed` project only exists while SEED is set, so
 * `pnpm test` never picks this file up.
 *
 * One test per WO, so workers create them in parallel and a failure costs one WO, not the
 * run. Each created WO is appended to the seed log for the wrapper to print.
 */
const req = seedRequest<SeedRequest>('planned', 'harvest');

test.describe.configure({ mode: 'parallel' });

if (req) {
  for (let i = 0; i < req.count; i++) {
    test(`seed ${req.type} work order ${i + 1} of ${req.count}`, async ({ workOrdersPage }) => {
      const rows = req.plots + req.materials + req.resources + req.assets;
      test.setTimeout(240_000 + rows * 3_000); // form + four panels + a save that grows with size
      const wo = seedScenario(req, i);

      const sequence = await workOrdersPage.createWorkOrder(req.type, wo);

      test.info().annotations.push({ type: 'created', description: `${sequence} | ${wo.name}` });
      appendFileSync(SEED_LOG, `${sequence}  ${wo.name}\n`);
    });
  }
}

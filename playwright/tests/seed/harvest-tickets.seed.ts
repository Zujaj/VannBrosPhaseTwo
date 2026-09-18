import { appendFileSync } from 'fs';
import { test, expect } from '../fixtures';
import { SEED_LOG, seedRequest } from './seed';

/**
 * Test-data seeding, not a test: plans harvest tickets in Harvest Central on the shared QA env.
 * Run it through `pnpm seed:tickets` (scripts/seed.mts).
 *
 * One test per field/variety pair. Each one reads the pair's `No Of Planned Tickets` before and
 * after, and fails unless it rose by exactly the number asked for — saving shows no toast, so
 * that count is the only proof the plan went through. Pairs run one at a time because the
 * count is read through a column filter, and those filters are shared across sessions.
 */
interface TicketRequest {
  type: 'tickets';
  tickets: number;
  pairs: { field: string; variety: string }[];
}

const req = seedRequest<TicketRequest>('tickets');

test.describe.configure({ mode: 'default' });

if (req) {
  for (const { field, variety } of req.pairs) {
    test(`seed ${req.tickets} planned tickets for ${field} / ${variety}`, async ({ harvestCentralPage: hc }) => {
      test.setTimeout(120_000 + Math.ceil(req.tickets / 100) * 60_000);
      await hc.open();
      const before = await hc.plannedTickets(field, variety);

      await hc.planTickets(field, variety, req.tickets);

      await expect
        .poll(() => hc.plannedTickets(field, variety), { timeout: 30_000 })
        .toBe(before + req.tickets);
      appendFileSync(SEED_LOG, `${field} / ${variety}: planned tickets ${before} -> ${before + req.tickets}\n`);
    });
  }
}

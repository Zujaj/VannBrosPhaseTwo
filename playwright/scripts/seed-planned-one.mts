/**
 * Create ONE Planned work order straight through the API (seconds, no UI) and print what a spec
 * needs to find it again.
 *
 *     node scripts/seed-planned-one.mts --name "QA Lifecycle 123"   # JSON: {id, sequenceNo, name}
 *
 *     --name TEXT      work order name (default: "Seed Planned WO <timestamp>")
 *     --plots N        plots to add (default 1)
 *
 * The WO lands in To Do, with no materials, resources or assets. Delete it with
 * `pnpm wo:delete <WO-n> --yes`, or `DELETE api/WorkOrder/<id>` while it is Draft / To Do.
 * Used by `work-orders-planned-lifecycle.spec.ts`. Needs an API token; see api/client.mts.
 */
import { parseArgs } from 'util';
import { ApiClient } from '../api/client.mts';
import { buildPlannedBody, postWorkOrder } from '../api/planned-work-order.mts';
import { findByName } from '../api/work-orders.mts';

const { values } = parseArgs({
  options: {
    name: { type: 'string', default: `Seed Planned WO ${Date.now()}` },
    plots: { type: 'string', default: '1' },
  },
});

const api = new ApiClient();
const name = values.name!;
const body = await buildPlannedBody(api, { name, plots: Number(values.plots), materials: 0, resources: 0, assets: 0 });
await postWorkOrder(api, body);

const found = await findByName(api, name);
const wo = found.find((r) => r.name === name);
if (!wo) {
  console.error(`posted "${name}" but the list does not show it`);
  process.exit(1);
}
console.log(JSON.stringify({ id: wo.id, sequenceNo: wo.sequenceNo, name: wo.name }));

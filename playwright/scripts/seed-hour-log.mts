/**
 * Seed a fresh In Progress work order with pending hour log change requests
 * (api/hour-log-requests.mts). Creates real data on QA.
 *
 *   pnpm seed:hourlog            human-readable summary
 *   pnpm seed:hourlog --json     one JSON line on stdout (what the @mutating HLA spec reads)
 *   pnpm seed:hourlog --status 31342 --json   read back each request's status, no writes
 *   pnpm seed:hourlog --delete 31342          move the WO back to To Do and delete it
 *
 * Needs two actors: the admin (api/client.mts) and the operator — `ApiClient.asOperator()` reads
 * the saved `operator` session (bootstrap once with `AUTH_ROLES=operator pnpm auth:qa`; every
 * later `pnpm auth:qa` refreshes it silently), or a pasted `.auth/qa_operator_token.txt`.
 */
import { parseArgs } from 'util';
import { ApiClient } from '../api/client.mts';
import { deleteHourLogWorkOrder, listRequests, seedHourLogWorkOrder } from '../api/hour-log-requests.mts';

const { values } = parseArgs({ options: { json: { type: 'boolean', default: false }, status: { type: 'string' }, delete: { type: 'string' } } });

// The client logs its token source to stdout; keep stdout clean for --json.
const log = console.log;
if (values.json) console.log = (...a: unknown[]) => console.error(...a);

try {
  const admin = new ApiClient();
  if (values.delete) {
    await deleteHourLogWorkOrder(admin, Number(values.delete));
    log(values.json ? JSON.stringify({ deleted: Number(values.delete) }) : `deleted WO id ${values.delete}`);
  } else if (values.status) {
    const rows = (await listRequests(admin, Number(values.status))).map((r) => ({
      id: r.id,
      requestNo: r.requestNo,
      status: r.approvalStatusName,
      approverRemarks: r.approverRemarks,
      rejectionReason: r.rejectionReason,
      decidedBy: r.decidedByName,
    }));
    log(values.json ? JSON.stringify(rows) : rows);
  } else {
    const seed = await seedHourLogWorkOrder(admin, ApiClient.asOperator());
    if (values.json) log(JSON.stringify(seed));
    else {
      log(`${seed.sequenceNo} (id ${seed.workOrderId}) In Progress, field ${seed.fieldCode}, slot ${seed.slotStart}`);
      for (const r of seed.requests) log(`  ${r.requestNo}  ${r.tag.padEnd(8)} (request id ${r.id})`);
    }
  }
} catch (e) {
  console.error(`seed:hourlog failed: ${(e as Error).message}`);
  process.exit(1);
}

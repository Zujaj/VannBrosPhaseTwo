/**
 * Seed a fresh work order with pending hour log change requests, for the Hour Log Adjustment
 * decision specs (knowledge ref `hour-log-adjustment.md`, API tag `WorkOrder`).
 *
 * Two actors, because a request is tied to the token that raised it and the raiser cannot
 * decide it (the operator's `Decide` call answers 401):
 *
 *   admin     POST /api/WorkOrder                      planned WO: 1 plot, operator + 2 machines
 *             POST /api/WorkOrder/Status {statusID: 3}  → In Progress (requests need it)
 *   operator  POST /api/WorkOrder/HourLogChangeRequests one request per `RequestSpec`, all
 *             "new entry" requests inside a time slot the operator has no hour logs in
 *
 * No hour log is seeded for the operator: `POST /api/WorkOrder/HourLogs` intermittently
 * answers 500 ("Invalid response received from cloud function") and, when it works, stores
 * its own times rather than the ones sent.
 *
 * Lifecycle only moves FORWARD, as in production: To Do → In Progress → (decisions) → Review.
 * A WO is never set back to To Do or deleted once started — an approved/started WO cannot return
 * to To Do in the product, and forcing it through the API orphans its decided hours (FINDINGS #36).
 * So: a failure while the WO is still To Do deletes it (legitimate); any later failure, and every
 * finished run, sends it on to **Review** with `closeHourLogWorkOrder` and leaves it there,
 * named `QA HLA <timestamp>`, for a person to close.
 *
 * `PUT /api/WorkOrder/WorkOrderStart` answers 401 for the operator, hence the admin status
 * change. The operator token comes from `ApiClient.asOperator()`.
 */
import { ApiClient } from './client.mts';
import { buildPlannedBody, postWorkOrder } from './planned-work-order.mts';

/** Agrierp 07 (07), Farm Hand, user `f3 agrierp07` — the account behind `asOperator()`. */
export const OPERATOR_RESOURCE_ID = 609;
const LOCATION_ID = 2;
const SEASON_ID = 13;

export interface RequestSpec {
  /** Free label echoed back so specs can find the request they meant. */
  tag: string;
  /** UTC hours after the run's free slot start (see `findFreeSlot`). */
  start: number;
  end: number;
  /** Indexes into the WO's machine assets (0 or 1). */
  machines: number[];
  reason: string;
}

export interface SeededRequest {
  tag: string;
  id: number;
  requestNo: string;
}

export interface HourLogSeed {
  workOrderId: number;
  sequenceNo: string;
  workOrderLineId: number;
  fieldId: number;
  fieldCode: string;
  resourceId: number;
  machineIds: number[];
  /** UTC start of the run's free slot. */
  slotStart: string;
  requests: SeededRequest[];
}

export const DEFAULT_REQUESTS: RequestSpec[] = [
  { tag: 'approve', start: 0, end: 1, machines: [0], reason: 'QA HLA approve case' },
  { tag: 'adjust', start: 1.5, end: 2.5, machines: [1], reason: 'QA HLA adjust case' },
  { tag: 'reject', start: 3, end: 3.5, machines: [0, 1], reason: 'QA HLA reject case' },
  // Left pending on purpose: the completion gate (HLA-B16) needs an undecided request at the end.
  { tag: 'gate', start: 3.5, end: 3.75, machines: [0], reason: 'QA HLA gate case' },
];

/** Hours the default requests span from the slot start. */
const SLOT_HOURS = 4;

/**
 * Decided hours stay on the resource, and a decision cannot override an entry on a work order
 * that is no longer open (every earlier run's WO sits in Review) — the server answers 400 "An
 * existing hour log entry overlaps these hours and cannot be overridden…". Those entries are not
 * visible to any read endpoint the operator or admin can query for a whole resource
 * (`GET /api/WorkOrder/HourLogs` needs a WorkOrderId), so a run cannot look for free time: it picks
 * a random `SLOT_HOURS` window in the last 5 days (~27 candidates) and still skips one the server
 * reports as busy via `existingHourLogsTotalCount`.
 */
const MAX_SLOT_TRIES = 12;

const dataOf = (body: any) => body?.data ?? body;

export async function seedHourLogWorkOrder(
  admin: ApiClient,
  operator: ApiClient,
  { name = `QA HLA ${new Date().toISOString()}`, requests = DEFAULT_REQUESTS } = {},
): Promise<HourLogSeed> {
  const body: any = await buildPlannedBody(admin, { name, plots: 1, materials: 0, resources: 1, assets: 2 });
  body.resources = [
    {
      resourceId: OPERATOR_RESOURCE_ID,
      id: 0,
      resourceGroupId: 4,
      usageUOM: 'hr',
      isDummyResource: false,
      noOfResources: null,
      resourceGroupTypeId: 4,
    },
  ];
  const created = dataOf(await postWorkOrder(admin, body));
  const workOrderId = Number(created?.id);
  if (!workOrderId) throw new Error(`WorkOrder create returned no id: ${JSON.stringify(created).slice(0, 300)}`);

  // Everything readable is read while the WO is still To Do, where deleting it is legitimate.
  let summary: any;
  let line: any;
  let machineIds: number[];
  try {
    summary = dataOf(await admin.get(`WorkOrder/${workOrderId}/Summary`, { locationId: LOCATION_ID, seasonId: SEASON_ID }));
    machineIds = (summary.assets ?? []).map((a: any) => a.resourceId);
    const fields = dataOf(await admin.get(`WorkOrder/${workOrderId}/FieldDetails`, { locationId: LOCATION_ID, seasonId: SEASON_ID }));
    line = fields?.workOrderDetailFields?.[0];
    if (!line) throw new Error('no field lines');
    if (machineIds.length < 2) throw new Error(`needs 2 machine assets, got ${machineIds.length}`);
    await admin.post('WorkOrder/Status', { id: workOrderId, statusID: 3 });
  } catch (e) {
    const cleanup = await admin.delete(`WorkOrder/${workOrderId}`).then(
      () => 'deleted it (still To Do)',
      (d: Error) => `could not delete it: ${d.message.slice(0, 120)}`,
    );
    throw new Error(`seeding WO id ${workOrderId} failed before it started, ${cleanup}: ${(e as Error).message}`);
  }

  try {
    return await raise(admin, operator, workOrderId, summary.sequenceNo, line, machineIds, requests);
  } catch (e) {
    // Started: never back to To Do. Move it on to Review and leave it for a person to close.
    const closed = await closeHourLogWorkOrder(admin, workOrderId).then(
      () => 'moved it to Review',
      (d: Error) => `could not move it to Review: ${d.message.slice(0, 120)}`,
    );
    throw new Error(`seeding ${summary.sequenceNo} (id ${workOrderId}) failed after it started, ${closed}: ${(e as Error).message}`);
  }
}

async function raise(
  admin: ApiClient,
  operator: ApiClient,
  workOrderId: number,
  sequenceNo: string,
  line: any,
  machineIds: number[],
  requests: RequestSpec[],
): Promise<HourLogSeed> {
  const hour = 3600e3;
  const latest = Math.floor(Date.now() / (SLOT_HOURS * hour)) * SLOT_HOURS * hour - 3 * SLOT_HOURS * hour;
  const candidates = Math.floor((4.5 * 24) / SLOT_HOURS);
  const first = Math.floor(Math.random() * candidates);
  for (let attempt = 0; attempt < MAX_SLOT_TRIES; attempt++) {
    const slot = new Date(latest - ((first + attempt) % candidates) * SLOT_HOURS * hour);
    const at = (h: number) => new Date(slot.getTime() + h * hour).toISOString();
    const seeded: SeededRequest[] = [];
    for (const r of requests) {
      const res = dataOf(
        await operator.post('WorkOrder/HourLogChangeRequests', {
          workOrderId,
          workOrderLineId: line.workOrderLineID,
          fieldId: line.fieldID,
          resourceId: OPERATOR_RESOURCE_ID,
          requestedStartDateTime: at(r.start),
          requestedEndDateTime: at(r.end),
          machineResourceIds: r.machines.map((i) => machineIds[i]),
          implementResourceIds: [],
          reason: r.reason,
          mobileDeviceType: 2,
        }),
      );
      seeded.push({ tag: r.tag, id: res.id, requestNo: res.requestNo });
    }
    const listed = await listRequests(admin, workOrderId);
    const clash = listed.some((r) => seeded.some((x) => x.id === r.id) && r.existingHourLogsTotalCount > 0);
    if (!clash) return summaryOf(seeded, slot);
    for (const x of seeded) await operator.delete(`WorkOrder/HourLogChangeRequests/${x.id}`);
  }
  throw new Error(`no ${SLOT_HOURS}h window free of hour logs for resource ${OPERATOR_RESOURCE_ID} after ${MAX_SLOT_TRIES} tries`);

  function summaryOf(seeded: SeededRequest[], slot: Date): HourLogSeed {
    return {
      workOrderId,
      sequenceNo,
      workOrderLineId: line.workOrderLineID,
      fieldId: line.fieldID,
      fieldCode: line.fieldCode,
      resourceId: OPERATOR_RESOURCE_ID,
      machineIds,
      slotStart: slot.toISOString(),
      requests: seeded,
    };
  }
}

/**
 * End a seeded run the way production does: move the WO forward to Review (the step the mobile
 * app takes when the job ends). Never back to To Do. Requests may still be pending — a person
 * closing it decides them, since Done is refused while any is pending.
 */
export async function closeHourLogWorkOrder(admin: ApiClient, workOrderId: number): Promise<void> {
  const summary = dataOf(await admin.get(`WorkOrder/${workOrderId}/Summary`, { locationId: LOCATION_ID, seasonId: SEASON_ID }));
  if (summary?.status === 4 || summary?.status === 5) return;
  if (summary?.status !== 3) throw new Error(`WO ${workOrderId} is ${summary?.statusName}, not In Progress; left as is`);
  await admin.post('WorkOrder/Status', { id: workOrderId, statusID: 4 });
}

/** Every request on the WO, newest first, as the drawer lists them. */
export async function listRequests(api: ApiClient, workOrderId: number): Promise<any[]> {
  return dataOf(await api.get(`WorkOrder/${workOrderId}/HourLogChangeRequests`, { page: 1, limit: 50 })) ?? [];
}

/**
 * Seed a fresh In Progress work order for the Dummy Resources v2 shift specs (PSD
 * `AgriERP FSCM - Dummy Resources v2.pdf`, ADO #26191; API tag `DummyShift`).
 *
 *   admin  POST /api/WorkOrder                       planned WO: 1 plot, the operator (Agrierp 07),
 *                                                    two dummy resources (Dummy Res 04 ×2,
 *                                                    Irrigator ×1) and 2 machines
 *          POST /api/WorkOrder/Status {statusID: 3}  → In Progress (shifts need it)
 *
 * No shift is seeded: the spec starts and resumes them itself, as the operator, the way the mobile
 * app does (`api/DummyShift/*` accepts the operator's token).
 *
 * Lifecycle only moves FORWARD, as in production (see `hour-log-requests.mts`): a failure while
 * the WO is still To Do deletes it; once started it is only ever moved on to **Review** by
 * `closeDummyShiftWorkOrder` and left there, named `QA DRS <timestamp>`, for a person to close.
 * The WO is never completed to Done, which posts to D365.
 */
import { ApiClient } from './client.mts';
import { buildPlannedBody, postWorkOrder } from './planned-work-order.mts';
import { OPERATOR_RESOURCE_ID, closeHourLogWorkOrder } from './hour-log-requests.mts';

const LOCATION_ID = 2;
const SEASON_ID = 13;

/** Dummy register rows used by the seed (FINDINGS #34), with the headcount set on the WO. */
export const SEED_DUMMIES = [
  { resourceId: 671, code: 'DM004', name: 'Dummy Res 04', noOfResources: 2 },
  { resourceId: 669, code: 'DM002', name: 'Irrigator', noOfResources: 1 },
];

export interface DummyShiftSeed {
  workOrderId: number;
  sequenceNo: string;
  workOrderLineId: number;
  fieldCode: string;
  dummies: typeof SEED_DUMMIES;
  machineIds: number[];
  machineLabels: string[];
}

const dataOf = (body: any) => body?.data ?? body;

export async function seedDummyShiftWorkOrder(
  admin: ApiClient,
  { name = `QA DRS ${new Date().toISOString()}` } = {},
): Promise<DummyShiftSeed> {
  const body: any = await buildPlannedBody(admin, { name, plots: 1, materials: 0, resources: 1, assets: 2 });
  const row = (resourceId: number, isDummyResource: boolean, noOfResources: number | null) => ({
    resourceId,
    id: 0,
    resourceGroupId: 4,
    usageUOM: 'hr',
    isDummyResource,
    noOfResources,
    resourceGroupTypeId: 4,
  });
  body.resources = [
    row(OPERATOR_RESOURCE_ID, false, null),
    ...SEED_DUMMIES.map((d) => row(d.resourceId, true, d.noOfResources)),
  ];
  const created = dataOf(await postWorkOrder(admin, body));
  const workOrderId = Number(created?.id);
  if (!workOrderId) throw new Error(`WorkOrder create returned no id: ${JSON.stringify(created).slice(0, 300)}`);

  try {
    const q = { locationId: LOCATION_ID, seasonId: SEASON_ID };
    const summary = dataOf(await admin.get(`WorkOrder/${workOrderId}/Summary`, q));
    const machineIds: number[] = (summary.assets ?? []).map((a: any) => a.resourceId);
    const machineLabels: string[] = (summary.assets ?? []).map((a: any) => `${a.resource.name} (${a.resource.code})`);
    if (machineIds.length < 2) throw new Error(`needs 2 machine assets, got ${machineIds.length}`);
    const line = dataOf(await admin.get(`WorkOrder/${workOrderId}/FieldDetails`, q))?.workOrderDetailFields?.[0];
    if (!line) throw new Error('no field lines');
    await admin.post('WorkOrder/Status', { id: workOrderId, statusID: 3 });
    return {
      workOrderId,
      sequenceNo: summary.sequenceNo,
      workOrderLineId: line.workOrderLineID,
      fieldCode: line.fieldCode,
      dummies: SEED_DUMMIES,
      machineIds,
      machineLabels,
    };
  } catch (e) {
    const cleanup = await admin.delete(`WorkOrder/${workOrderId}`).then(
      () => 'deleted it (still To Do)',
      (d: Error) => `could not delete it: ${d.message.slice(0, 120)}`,
    );
    throw new Error(`seeding WO id ${workOrderId} failed before it started, ${cleanup}: ${(e as Error).message}`);
  }
}

/** Move the WO forward to Review (never back to To Do); a no-op once it is in Review or Done. */
export const closeDummyShiftWorkOrder = closeHourLogWorkOrder;

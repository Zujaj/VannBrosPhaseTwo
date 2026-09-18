/**
 * Create a Planned work order through `POST /api/WorkOrder`, with the same body the web form's
 * Submit sends. Used by `pnpm seed:planned --api`.
 *
 * The body was rebuilt field for field from a Submit captured on 2026-09-17 (99 plots, 50
 * materials, 3 resources, 50 assets). Each row below is derived from the list the form's picker
 * loads, and every derived row matched the captured one:
 *
 *   plots      GET  /api/activity/blocks                  (farm + operation + date window)
 *   materials  POST /api/Material/GetPaginatedMaterials   (50 per page; "DO NOT USE" skipped)
 *   resources  GET  /api/resource/GetPaginatedResources   (group types 1, 4, 5; supervisor skipped)
 *   assets     GET  /api/asset                            (50 per page)
 *
 * Like the UI seed, rows are taken in list order, so an API-seeded WO matches a form-seeded one.
 */
import farms from '../fixtures/farms.json' with { type: 'json' };
import priorities from '../fixtures/priorities.json' with { type: 'json' };
import resourcesFixture from '../fixtures/resources.json' with { type: 'json' };
import tasks from '../fixtures/tasks.json' with { type: 'json' };
import type { ApiClient } from './client.mts';

type Row = Record<string, any>;

export interface PlannedRequest {
  name: string;
  plots: number;
  materials: number;
  resources: number;
  assets: number;
  /** Labels as the form's dropdowns show them. */
  farm?: string;
  task?: string;
  priority?: string;
  supervisor?: string;
}

const LOCATION_ID = 2; // Colusa
const SEASON_ID = 13; // Crop Year 2026
const PAGE = 50;
// The form picks the Resources panel from these group types (metadata/resourceGroups call).
const RESOURCE_GROUP_TYPES = new Set([1, 4, 5]);
const SKIP_MATERIAL = /DO NOT USE/i;

function byLabel<T extends { label: string }>(items: T[], label: string, what: string): T {
  const found = items.find((i) => i.label === label);
  if (!found) throw new Error(`${what} "${label}" is not in fixtures/`);
  return found;
}

const rowsOf = (body: any): Row[] => (Array.isArray(body) ? body : (body?.data ?? []));

/** Naive local date-time string, the way the form sends it. */
function naive(d: Date, time: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${time}`;
}

/**
 * The form's default window is 5 days back to 5 days ahead. It sends the start as the previous
 * day at 19:00 and the due date as the end day at 18:59:59 (local midnight, shifted).
 */
function dateWindow(now = new Date()) {
  const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
  return {
    startDate: naive(day(-6), '19:00:00.000'),
    dueDate: naive(day(5), '18:59:59.000'),
    // What the plot picker asks for (today's window, same shift).
    blocksStart: naive(day(-1), '19:00:00.000'),
    blocksEnd: naive(day(0), '18:59:59.000'),
    assetsStart: naive(day(-5), '00:00:00.000'),
    assetsEnd: naive(day(5), '00:00:00.000'),
  };
}

/** Walk a 50-per-page list until `count` rows pass `keep`. */
async function collect(
  count: number,
  what: string,
  fetchPage: (page: number) => Promise<any>,
  keep: (r: Row) => boolean = () => true,
): Promise<Row[]> {
  const out: Row[] = [];
  for (let page = 1; out.length < count; page++) {
    const body = await fetchPage(page);
    const rows = rowsOf(body);
    out.push(...rows.filter(keep).slice(0, count - out.length));
    const total = body?.recordsTotal ?? rows.length;
    if (rows.length === 0 || page * PAGE >= total) break;
  }
  if (out.length < count) throw new Error(`${what}: only ${out.length} usable rows, ${count} asked for`);
  return out;
}

export async function buildPlannedBody(api: ApiClient, req: PlannedRequest) {
  const farm = byLabel(farms.items, req.farm ?? 'Vann Farm (VBSF)', 'farm');
  const task = byLabel(tasks.workOrder, req.task ?? 'Fertilization (1240)', 'task');
  const supervisor = byLabel(resourcesFixture.items, req.supervisor ?? 'Agrierp 04 (04)', 'supervisor');
  const priority = priorities.items.find((p) => p.name === (req.priority ?? 'High'));
  if (!priority) throw new Error(`priority "${req.priority}" is not in fixtures/priorities.json`);
  const w = dateWindow();

  const blocksBody = await api.get('activity/blocks', {
    page: 1,
    limit: 1000,
    locationId: LOCATION_ID,
    seasonId: SEASON_ID,
    farmId: farm.id,
    operationId: task.id,
    startDate: w.blocksStart,
    endDate: w.blocksEnd,
  });
  const blocks = rowsOf(blocksBody).slice(0, req.plots);
  if (blocks.length < req.plots) throw new Error(`plots: only ${blocks.length} available, ${req.plots} asked for`);

  const materials = req.materials
    ? await collect(
        req.materials,
        'materials',
        (page) =>
          api.post('Material/GetPaginatedMaterials', {
            page,
            limit: PAGE,
            locationId: LOCATION_ID,
            executionType: 1,
            productAttributeIds: [],
            isBlocked: false,
          }),
        (m) => !SKIP_MATERIAL.test(m.name),
      )
    : [];
  const unitTypes = materials.length
    ? new Map<string, number>(
        rowsOf(await api.get('Metadata/MaterialProductUnitType', { page: 1, limit: 1000 })).map((u) => [u.text, u.value]),
      )
    : new Map<string, number>();

  const resources = req.resources
    ? rowsOf(
        await api.get('resource/GetPaginatedResources', {
          page: 1,
          limit: 99999,
          locationId: LOCATION_ID,
          OrderByFieldName: 'Name',
          IsASC: 'true',
          IsDummy: 'false',
        }),
      )
        .filter((r) => RESOURCE_GROUP_TYPES.has(r.resourceGroupTypeId) && r.name !== supervisor.name)
        .slice(0, req.resources)
    : [];
  if (resources.length < req.resources) throw new Error(`resources: only ${resources.length} usable, ${req.resources} asked for`);

  const assets = req.assets
    ? await collect(req.assets, 'assets', (page) =>
        api.get('asset', {
          page,
          limit: PAGE,
          isBlocked: 'false',
          locationId: LOCATION_ID,
          isDummy: 'false',
          startDate: w.assetsStart,
          endDate: w.assetsEnd,
        }),
      )
    : [];

  const resourceRow = (r: Row) => ({
    resourceId: r.id,
    id: 0,
    resourceGroupId: r.resourceGroupID,
    usageUOM: r.usageUOM || r.baseUOM,
    isDummyResource: r.isDummyResource,
    noOfResources: null,
    resourceGroupTypeId: r.resourceGroupTypeId,
  });

  return {
    id: 0,
    name: req.name,
    color: '#000000',
    priority: priority.id,
    priorityName: priority.id,
    startDate: w.startDate,
    dueDate: w.dueDate,
    farmID: farm.id,
    operationID: task.id,
    operationName: task.name,
    cropVarietyIDs: [],
    status: 2,
    statusName: 'ToDo',
    locationId: LOCATION_ID,
    seasonId: SEASON_ID,
    managerID: supervisor.id,
    responsibleID: null,
    materials: materials.map((m, i) => {
      const unit = unitTypes.get(m.usageUnit);
      if (unit === undefined) throw new Error(`material ${m.name}: no unit type for "${m.usageUnit}"`);
      return {
        materialId: m.id,
        quantity: 1,
        id: 0,
        IsHazardous: m.isHazardous,
        unitType: unit,
        materialSyncType: m.type,
        rateUnit: unit,
        unitCost: m.unitCost,
        costPerHectare: 0,
        perQtyId: null,
        materialUnit: m.usageUnit,
        sortOrder: i + 1,
      };
    }),
    resources: resources.map(resourceRow),
    // Same fields as a resource row; the form just orders them differently.
    assets: assets.map((a) => {
      const { resourceId, id, resourceGroupId, resourceGroupTypeId, usageUOM, isDummyResource, noOfResources } = resourceRow(a);
      return { resourceId, id, resourceGroupId, resourceGroupTypeId, usageUOM, isDummyResource, noOfResources };
    }),
    existingActivities: [],
    activities: blocks.map((b) => ({
      type: 'ADHOC',
      fieldAreaDisplay: `${b.fieldArea.toFixed(2)} ${b.fieldAreaUnitName}`,
      activityAreaDisplay: `${b.cropArea.toFixed(2)} ${b.cropAreaUnitName}`,
      effectiveArea: b.cropArea,
      fieldAreaUnitName: b.fieldAreaUnitName,
      isSelected: true,
      estimatedTime: 0,
      cropId: b.cropID,
      fieldId: b.fieldID,
      cropName: b.cropName,
      fieldName: b.fieldName,
      fieldCode: b.fieldCode,
      fieldArea: b.fieldArea,
      batchName: b.batchCode,
      activityId: b.activityID,
      scheme: b.scheme,
      schemeName: b.schemeName,
      activityArea: b.cropArea,
      activityAreaUnitName: b.cropAreaUnitName,
      workOrderBlocksType: b.workOrderBlocksType,
      customerName: b.customerName,
      cultivationId: b.cultivationID,
      statusName: b.statusName,
      status: b.status,
      parentWarehouseId: b.parentWarehouseId,
      varieties: b.varieties,
      varietyDisplay: (b.varieties ?? []).map((v: Row) => v.cropVarietyName).join(', '),
      parentWarehouseCode: b.parentWarehouseCode,
      adhocCompositeKey: `${b.fieldID}_${b.cultivationID}`,
      originalPlannedActivityId: b.activityID,
      isPlanChanging: b.isPlanChanging,
      hasDifferentMaterialRate: false,
      hasDifferentApplicationRate: false,
      hasDifferentBandPercentage: false,
    })),
    activityTemplateID: null,
    notes: '',
    workOrderType: 1,
    inspectionTemplateID: null,
    operationType: 1,
    WorkOrderAssetGroups: [],
    category: 1,
    executionType: 1,
    operationStartDate: null,
    operationEndDate: null,
    teams: [],
  };
}

/**
 * POST the body once, never retried: a large save that times out can still be stored (see
 * FINDINGS.md #29), so a retry risks a duplicate. Returns the raw response.
 */
export function postWorkOrder(api: ApiClient, body: unknown, timeoutMs = 10 * 60_000): Promise<unknown> {
  return api.post('WorkOrder', body, { timeoutMs });
}

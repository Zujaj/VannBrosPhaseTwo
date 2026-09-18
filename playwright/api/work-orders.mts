/**
 * Work-order calls on top of `ApiClient`: find a WO by its sequence number (`WO-1258`) or name,
 * and delete it by internal id.
 *
 * `GET /api/WorkOrder` is scoped to a Site and Season like the web list (the list request
 * carries `locationId=2&seasonId=13&Category=1` for Colusa / Crop Year 2026, seen 2026-09-17).
 * Swagger documents its response only as a "file", so the row fields are read defensively and
 * an unrecognised shape fails loudly instead of matching nothing.
 */
import type { ApiClient } from './client.mts';

export interface WorkOrderRef {
  id: number;
  sequenceNo: string;
  name: string;
}

export interface Scope {
  locationId?: number;
  seasonId?: number;
  category?: number;
}

const DEFAULT_SCOPE: Required<Scope> = { locationId: 2, seasonId: 13, category: 1 };

type Row = Record<string, unknown>;

function rowsOf(body: unknown): Row[] {
  if (Array.isArray(body)) return body as Row[];
  if (body && typeof body === 'object') {
    for (const key of ['data', 'items', 'records', 'result', 'workOrders']) {
      const v = (body as Row)[key];
      if (Array.isArray(v)) return v as Row[];
      if (v && typeof v === 'object') {
        const inner = rowsOf(v);
        if (inner.length) return inner;
      }
    }
  }
  return [];
}

function pick(row: Row, keys: string[]): unknown {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) if (lower[k.toLowerCase()] !== undefined) return lower[k.toLowerCase()];
  return undefined;
}

function toRef(row: Row): WorkOrderRef {
  const id = Number(pick(row, ['workOrderID', 'workOrderId', 'agriWorkOrderID', 'id']));
  const sequenceNo = String(pick(row, ['sequenceNo', 'sequenceNumber', 'workOrderSequenceNo', 'woSequenceNo']) ?? '');
  const name = String(pick(row, ['name', 'workOrderName', 'woName']) ?? '');
  if (!Number.isInteger(id) || id <= 0 || !sequenceNo) {
    throw new Error(`unrecognised work-order row; fields: ${Object.keys(row).join(', ')}`);
  }
  return { id, sequenceNo, name };
}

async function list(api: ApiClient, filter: Record<string, string>, scope: Scope): Promise<WorkOrderRef[]> {
  const s = { ...DEFAULT_SCOPE, ...scope };
  const body = await api.get('WorkOrder', {
    ...filter,
    LocationID: s.locationId,
    SeasonID: s.seasonId,
    Category: s.category,
    Page: 1,
    Limit: 100,
  });
  return rowsOf(body).map(toRef);
}

/** The WO with exactly this sequence number, or null. The API filter is a contains-match. */
export async function findBySequence(api: ApiClient, sequenceNo: string, scope: Scope = {}): Promise<WorkOrderRef | null> {
  const rows = await list(api, { SequenceNo: sequenceNo }, scope);
  return rows.find((r) => r.sequenceNo.toUpperCase() === sequenceNo.toUpperCase()) ?? null;
}

/** Every WO whose name contains `name`. */
export function findByName(api: ApiClient, name: string, scope: Scope = {}): Promise<WorkOrderRef[]> {
  return list(api, { Name: name }, scope);
}

export async function deleteWorkOrder(api: ApiClient, id: number): Promise<void> {
  await api.delete(`WorkOrder/${id}`);
}

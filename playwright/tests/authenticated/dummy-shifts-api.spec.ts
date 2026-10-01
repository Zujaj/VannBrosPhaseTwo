import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { apiAs } from '../helpers/roleApi';
import { authFileFor } from '../helpers/auth';

/**
 * Dummy Resources v2 — the mobile shift rules, checked through the web API `api/DummyShift/*`
 * (ADO #26191) instead of a phone. PSD: `AgriERP FSCM - Dummy Resources v2.pdf`.
 * Plan: `test-plans/authenticated/dummy-resources.md` (DRM-xx cases, "API checks for the mobile
 * cases"). Endpoint reference: `.claude/skills/vannbrosphasetwo-vann-api-qa/reference/DummyShift.md`.
 *
 * `@mutating`: `beforeAll` runs `pnpm seed:dummyshift --json` (api/dummy-shifts.mts), which creates
 * a planned WO on QA with the operator, Dummy Res 04 ×2, Irrigator ×1 and two machines, and moves it
 * to In Progress. Shifts are then started, resumed, corrected and deleted on it as a **supervisor**
 * (the PSD's App User table gives these actions to Supervisors; the Farm Hand operator gets 401 on
 * `POST /api/DummyShift`, FINDINGS #52). With no saved supervisor session
 * (`AUTH_ROLES=supervisor pnpm auth:qa`) the admin stands in, and the logs then read source `Web`. The WO only moves forward: `afterAll` sends it to **Review** and leaves it on QA,
 * named `QA DRS <timestamp>`. It is never sent back to To Do, deleted, or completed to Done.
 *
 * Machines are shared across QA and stay bound by earlier runs' shifts, so each run works in a
 * random past time slot and moves on when Shift 1's machine is already bound there.
 * Serial and ordered: later tests build on earlier shifts. No page is loaded, so it runs on the
 * chromium project only (one seeded WO per run).
 */
const ROOT = path.resolve(__dirname, '../..');
const Q = { locationId: 2, seasonId: 13 };
const HOUR = 3600e3;

interface Seed {
  workOrderId: number;
  sequenceNo: string;
  workOrderLineId: number;
  dummies: { resourceId: number; code: string; name: string; noOfResources: number }[];
  machineIds: number[];
}

interface ShiftAsset { id: number; assetResourceId: number; hoursLogged: number; boundFrom: string; boundTo: string }
interface ShiftResource {
  id: number;
  resourceId: number;
  noOfResources: number;
  standardHoursSnapshot: number;
  hoursLogged: number;
  windowStartDateTime: string;
  windowEndDateTime: string;
  shiftAssets: ShiftAsset[];
}
interface Shift {
  id: number;
  sequenceNo: number;
  shiftStartDateTime: string;
  shiftEndDateTime: string;
  totalResourceHours: number;
  totalAssetHours: number;
  shiftResources: ShiftResource[];
}
interface PlotSummary { shiftCount: number; totalResourceHours: number; totalAssetHours: number; plotTotalHours: number }
interface ShiftLog { actionName: string; performedByName: string; performedAt: string; sourceName: string; deviceName: string; description: string }

function script(args: string[]): string {
  return execFileSync('node', ['scripts/seed-dummy-shift.mts', ...args, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60_000,
  }).trim();
}

/** API times are UTC, usually without the `Z`. */
const ms = (t: string) => Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(t) ? t : `${t}Z`);
const iso = (t: number) => new Date(t).toISOString();
/** Hours compared to the API's two decimals (e.g. 6.55 standard hours). */
const near = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 1);

test.describe('@PSD-dummy-resources @mutating Dummy shifts through api/DummyShift (mobile rules)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(120_000);
  // API-only: one engine is enough, and each run seeds a real WO.
  test.skip(({ browserName }) => browserName !== 'chromium', 'API-only: runs once, on Chromium');

  let seed: Seed;
  let admin: APIRequestContext;
  /** Whoever starts and corrects shifts: the supervisor when a session exists, else the admin. */
  let operator: APIRequestContext;
  /** Start of this run's slot; every shift is placed relative to it. */
  let T: number;
  const std: Record<number, number> = {};

  const dm004 = () => seed.dummies.find((d) => d.code === 'DM004')!;
  const irrigator = () => seed.dummies.find((d) => d.code === 'DM002')!;
  const [M1, M2] = [() => seed.machineIds[0], () => seed.machineIds[1]];

  const shiftBody = (startMs: number, resources: { resourceId: number; noOfResources: number; assets?: number[] }[]) => ({
    workOrderId: seed.workOrderId,
    workOrderLineId: seed.workOrderLineId,
    shiftStartDateTime: iso(startMs),
    resources: resources.map((r) => ({
      resourceId: r.resourceId,
      noOfResources: r.noOfResources,
      assets: (r.assets ?? []).map((assetResourceId) => ({ assetResourceId })),
    })),
    mobileDeviceType: 2,
  });
  const shifts = async (): Promise<Shift[]> =>
    (await (await admin.get(`/api/DummyShift/Line/${seed.workOrderLineId}`, { params: Q })).json()) as Shift[];
  const plot = async (): Promise<PlotSummary> =>
    ((await (await admin.get(`/api/DummyShift/PlotSummary/${seed.workOrderId}`, { params: Q })).json()) as PlotSummary[])[0];
  const bySeq = async (n: number) => (await shifts()).find((s) => s.sequenceNo === n);
  const message = async (res: APIResponse) => ((await res.json()) as { message?: string }).message ?? '';
  const expectOk = async (res: APIResponse) => expect(res.status(), await res.text()).toBe(200);

  test.beforeAll(async () => {
    let out: string;
    try {
      out = script([]);
    } catch (e) {
      const msg = String((e as { stderr?: string }).stderr ?? (e as Error).message);
      test.skip(/no live operator token/.test(msg), 'no live operator token — run `AUTH_ROLES=operator pnpm auth:qa` once');
      throw e;
    }
    seed = JSON.parse(out.split('\n').pop()!) as Seed;
    admin = await apiAs('admin');
    const supervisor = existsSync(authFileFor('supervisor'));
    operator = supervisor ? await apiAs('supervisor') : admin;
    test.info().annotations.push({ type: 'shift actor', description: supervisor ? 'supervisor' : 'admin (no supervisor session)' });
    test.info().annotations.push({ type: 'seeded', description: `${seed.sequenceNo} (id ${seed.workOrderId})` });
    for (const d of seed.dummies) {
      const res = await operator.post('/api/DummyShift/Preview', { data: shiftBody(Date.now(), [{ resourceId: d.resourceId, noOfResources: 1 }]) });
      std[d.resourceId] = (await res.json()).lines[0].standardHours;
    }
  });

  test.afterAll(async () => {
    await admin?.dispose();
    if (operator !== admin) await operator?.dispose();
    // Forward only: leave the WO in Review.
    if (seed) script(['--close', String(seed.workOrderId)]);
  });

  test('DRM-04 (API) a shift with No. of Resources 0 is refused', async () => {
    const res = await operator.post('/api/DummyShift', {
      data: shiftBody(Date.now() - 200 * 24 * HOUR, [{ resourceId: irrigator().resourceId, noOfResources: 0 }]),
    });
    expect(res.status()).toBe(400);
    expect(await message(res)).toMatch(/Number of resources is mandatory and must be greater than zero/);
    expect(await shifts()).toEqual([]);
  });

  test('DRM-08 (API) Preview: hours = No. of Resources × Standard Hours, window = start + hours', async () => {
    const start = Date.now();
    const res = await operator.post('/api/DummyShift/Preview', { data: shiftBody(start, [{ resourceId: dm004().resourceId, noOfResources: 2 }]) });
    await expectOk(res);
    const p = await res.json();
    const line = p.lines[0];
    expect(std[dm004().resourceId]).toBeGreaterThan(0);
    near(line.hoursLogged, 2 * std[dm004().resourceId]);
    expect(ms(line.windowEndDateTime) - ms(line.windowStartDateTime)).toBe(Math.round(line.hoursLogged * HOUR));
    near(p.totalResourceHours, line.hoursLogged);
  });

  test('DRM-07 (API) Start Job creates Shift 1 and binds its machine for the shift window', async () => {
    // A random past slot, 20–120 days back; move on while M1 is already bound there by an earlier run.
    const day = 24 * HOUR;
    const base = Math.floor(Date.now() / day) * day;
    let res: APIResponse | undefined;
    for (let attempt = 0; attempt < 8; attempt++) {
      T = base - (20 + Math.floor(Math.random() * 100)) * day;
      res = await operator.post('/api/DummyShift', {
        data: shiftBody(T, [{ resourceId: dm004().resourceId, noOfResources: 2, assets: [M1()] }]),
      });
      if (res.status() !== 400 || !/already bound/.test(await message(res))) break;
    }
    await expectOk(res!);

    const s1 = await bySeq(1);
    expect(s1, 'Shift 1 listed on the plot').toBeTruthy();
    const r = s1!.shiftResources[0];
    const hours = 2 * std[dm004().resourceId];
    expect(r.noOfResources).toBe(2);
    near(r.hoursLogged, hours);
    expect(ms(r.windowStartDateTime)).toBe(T);
    expect(ms(r.windowEndDateTime)).toBeCloseTo(T + hours * HOUR, -4);
    // The attached machine logs the resource's hours and is bound for the same window.
    const a = r.shiftAssets[0];
    expect(a.assetResourceId).toBe(M1());
    near(a.hoursLogged, hours);
    expect([ms(a.boundFrom), ms(a.boundTo)]).toEqual([ms(r.windowStartDateTime), ms(r.windowEndDateTime)]);
    const p = await plot();
    expect(p.shiftCount).toBe(1);
    near(p.plotTotalHours, p.totalResourceHours + p.totalAssetHours);
  });

  test('DRM-09 (API) a machine bound for any part of the window cannot be used by another shift', async () => {
    const res = await operator.post('/api/DummyShift/Resume', {
      data: shiftBody(T + HOUR, [{ resourceId: irrigator().resourceId, noOfResources: 1, assets: [M1()] }]),
    });
    expect(res.status()).toBe(400);
    expect(await message(res)).toMatch(/is already bound to resource \d+ from .+ to .+/);
    expect((await shifts()).length).toBe(1);
  });

  test('DRM-10 (API) Resume Job appends a new shift and leaves Shift 1 as it was', async () => {
    const before = await bySeq(1);
    await expectOk(
      await operator.post('/api/DummyShift/Resume', {
        data: shiftBody(T + 2 * HOUR, [{ resourceId: irrigator().resourceId, noOfResources: 1, assets: [M2()] }]),
      }),
    );
    const all = await shifts();
    expect(all.map((s) => s.sequenceNo).sort()).toEqual([1, 2]);
    expect(all.find((s) => s.sequenceNo === 1)).toEqual(before);
  });

  test('DRM-17 (API) each shift keeps its own resources, headcount, machine and window', async () => {
    const [s1, s2] = [(await bySeq(1))!, (await bySeq(2))!];
    const [r1, r2] = [s1.shiftResources[0], s2.shiftResources[0]];
    expect([r1.resourceId, r1.noOfResources, r1.shiftAssets[0].assetResourceId]).toEqual([dm004().resourceId, 2, M1()]);
    expect([r2.resourceId, r2.noOfResources, r2.shiftAssets[0].assetResourceId]).toEqual([irrigator().resourceId, 1, M2()]);
    expect(ms(s2.shiftStartDateTime)).toBe(T + 2 * HOUR);
    near(r2.hoursLogged, std[irrigator().resourceId]);
  });

  test('DRM-16 (API) the plot total adds every shift\'s hours', async () => {
    const all = await shifts();
    const p = await plot();
    expect(p.shiftCount).toBe(2);
    near(p.totalResourceHours, all.reduce((n, s) => n + s.totalResourceHours, 0));
    near(p.totalAssetHours, all.reduce((n, s) => n + s.totalAssetHours, 0));
    near(p.plotTotalHours, p.totalResourceHours + p.totalAssetHours);
  });

  test('DRM-15 (API) the work order stays In Progress after Start and Resume', async () => {
    const res = await admin.get(`/api/WorkOrder/${seed.workOrderId}/Summary`, { params: Q });
    const body = await res.json();
    expect((body.data ?? body).statusName).toBe('In Progress');
  });

  test('DRM-13 (API) dummy resources stay available while on a running shift', async () => {
    const ids = seed.dummies.map((d) => d.resourceId);
    const res = await operator.post('/api/DummyShift/ResourceAvailability', { data: ids });
    await expectOk(res);
    const rows = (await res.json()) as { resourceId: number; isAvailable: boolean; isDummyResource: boolean }[];
    for (const id of ids) expect(rows.find((r) => r.resourceId === id)).toMatchObject({ isAvailable: true, isDummyResource: true });
  });

  test('DRM-11 (API) headcount 0 is refused; raising it extends hours and the machine window', async () => {
    const r = (await bySeq(2))!.shiftResources[0];
    const zero = await operator.put(`/api/DummyShift/Resource/${r.id}/Headcount`, { data: { noOfResources: 0 } });
    expect(zero.status()).toBe(400);
    expect(await message(zero)).toMatch(/Number of resources is mandatory and must be greater than zero/);

    await expectOk(await operator.put(`/api/DummyShift/Resource/${r.id}/Headcount`, { data: { noOfResources: 2 } }));
    const after = (await bySeq(2))!.shiftResources[0];
    expect(after.noOfResources).toBe(2);
    near(after.hoursLogged, 2 * std[irrigator().resourceId]);
    expect(ms(after.windowEndDateTime)).toBeGreaterThan(ms(r.windowEndDateTime));
    expect(ms(after.shiftAssets[0].boundTo)).toBe(ms(after.windowEndDateTime));
  });

  test('DRM-11 (API) raising the headcount into another binding of the same machine is blocked', async () => {
    const s2 = (await bySeq(2))!;
    const r = s2.shiftResources[0];
    // Shift 3 takes M2 half an hour after Shift 2's window ends.
    const s3Start = ms(r.windowEndDateTime) + HOUR / 2;
    await expectOk(
      await operator.post('/api/DummyShift/Resume', {
        data: shiftBody(s3Start, [{ resourceId: dm004().resourceId, noOfResources: 1, assets: [M2()] }]),
      }),
    );
    // One more head extends Shift 2 by a full standard-hours block, into Shift 3's binding.
    const res = await operator.put(`/api/DummyShift/Resource/${r.id}/Headcount`, { data: { noOfResources: r.noOfResources + 1 } });
    expect(res.status()).toBe(400);
    expect(await message(res)).toMatch(/is already bound to resource \d+/);
    expect((await bySeq(2))!.shiftResources[0]).toEqual(r);
  });

  test.describe('corrections on a fourth shift', () => {
    let shift4: Shift;

    test('DRM-12 (API) a machine can be attached to and detached from a shift resource', async () => {
      // After every earlier window, so M1 is free.
      const last = Math.max(...(await shifts()).map((s) => ms(s.shiftEndDateTime)));
      await expectOk(
        await operator.post('/api/DummyShift/Resume', {
          data: shiftBody(last + HOUR, [
            { resourceId: irrigator().resourceId, noOfResources: 1 },
            { resourceId: dm004().resourceId, noOfResources: 1 },
          ]),
        }),
      );
      shift4 = (await bySeq(4))!;
      const r = shift4.shiftResources.find((x) => x.resourceId === irrigator().resourceId)!;
      await expectOk(await operator.post(`/api/DummyShift/Resource/${r.id}/Asset/${M1()}`, { data: {} }));
      const attached = (await bySeq(4))!.shiftResources.find((x) => x.id === r.id)!.shiftAssets;
      expect(attached.map((a) => a.assetResourceId)).toEqual([M1()]);
      near(attached[0].hoursLogged, r.hoursLogged);

      await expectOk(await operator.delete(`/api/DummyShift/Asset/${attached[0].id}`));
      expect((await bySeq(4))!.shiftResources.find((x) => x.id === r.id)!.shiftAssets).toEqual([]);
    });

    test('DRM-12 (API) removing a resource keeps the shift; removing the last one deletes it', async () => {
      const before = await plot();
      const [a, b] = shift4.shiftResources;
      await expectOk(await operator.delete(`/api/DummyShift/Resource/${b.id}`));
      const left = (await bySeq(4))!;
      expect(left.shiftResources.map((x) => x.id)).toEqual([a.id]);

      await expectOk(await operator.delete(`/api/DummyShift/Resource/${a.id}`));
      expect(await bySeq(4)).toBeUndefined();
      expect((await admin.get(`/api/DummyShift/${shift4.id}`, { params: Q })).status()).toBe(404);
      const after = await plot();
      expect(after.shiftCount).toBe(before.shiftCount - 1);
      near(after.totalResourceHours, before.totalResourceHours - a.hoursLogged - b.hoursLogged);
    });

    test('DRM-14 (API) every shift change is logged with user, time, source and device', async () => {
      const logs = (await (await admin.get(`/api/DummyShift/${shift4.id}/Logs`, { params: Q })).json()) as ShiftLog[];
      const actions = logs.map((l) => l.actionName);
      for (const a of ['Shift created', 'Resource added to shift', 'Asset attached', 'Resource removed from shift', 'Shift deleted']) {
        expect(actions, a).toContain(a);
      }
      for (const l of logs) {
        expect(l.performedByName).toBeTruthy();
        expect(Number.isNaN(ms(l.performedAt))).toBe(false);
        expect(l.sourceName).toMatch(/^(Web|Mobile)$/);
      }
      // Shift creation carries the device the request sent (mobileDeviceType 2).
      for (const l of logs.filter((x) => /^(Shift created|Resource added to shift)$/.test(x.actionName))) {
        expect(l.deviceName, l.description).toBe('Android');
      }
    });

    test('DRM-14 (API) corrections record the device too', async () => {
      test.fail(true, 'Known QA bug (FINDINGS #53): correction entries have no device (the endpoints take none)');
      const logs = (await (await admin.get(`/api/DummyShift/${shift4.id}/Logs`, { params: Q })).json()) as ShiftLog[];
      const corrections = logs.filter((x) => !/^(Shift created|Resource added to shift)$/.test(x.actionName));
      expect(corrections.length).toBeGreaterThan(0);
      for (const l of corrections) expect(l.deviceName, l.description).toBeTruthy();
    });

    test('DRM-14 (API) detaching a machine is logged', async () => {
      test.fail(true, 'Known QA bug (FINDINGS #50): detaching an asset writes no log entry');
      const logs = (await (await admin.get(`/api/DummyShift/${shift4.id}/Logs`, { params: Q })).json()) as ShiftLog[];
      expect(logs.map((l) => l.actionName)).toContainEqual(expect.stringMatching(/Asset (detached|removed)/));
    });
  });

  test('DRM-12 (API) deleting a shift removes its hours and frees its machine', async () => {
    const s3 = (await bySeq(3))!;
    const before = await plot();
    await expectOk(await operator.delete(`/api/DummyShift/${s3.id}`));
    expect(await bySeq(3)).toBeUndefined();
    const after = await plot();
    near(after.totalResourceHours, before.totalResourceHours - s3.totalResourceHours);
    // M2 is free again in Shift 3's window: Shift 2 can now take the extra head it was refused.
    const r = (await bySeq(2))!.shiftResources[0];
    await expectOk(await operator.put(`/api/DummyShift/Resource/${r.id}/Headcount`, { data: { noOfResources: r.noOfResources + 1 } }));
  });

  test('DR-08 (API) posting readiness: a WO whose plot is linked to an ERP project can post', async () => {
    const res = await admin.get(`/api/DummyShift/PostingReadiness/${seed.workOrderId}`, { params: Q });
    await expectOk(res);
    expect(await res.json()).toMatchObject({ workOrderId: seed.workOrderId, canPost: true, unlinkedWorkOrderLineIds: [] });
  });

  test('(API) a successful DummyShift call reports isSuccess: true', async () => {
    test.fail(true, 'Known QA bug (FINDINGS #51): isSuccess is false on every 200 and true on every 400');
    const r = (await bySeq(2))!.shiftResources[0];
    const res = await operator.put(`/api/DummyShift/Resource/${r.id}/Headcount`, { data: { noOfResources: r.noOfResources } });
    await expectOk(res);
    expect((await res.json()).isSuccess).toBe(true);
  });
});

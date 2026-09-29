import { execFileSync } from 'child_process';
import path from 'path';
import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../fixtures';
import { apiAs } from '../helpers/roleApi';
import { authFileFor } from '../helpers/auth';
import { routes } from '../constants/routes';

/**
 * Hour Log Adjustment on a FRESH work order: the manager's decisions (Approve / Adjust / Reject)
 * in the web drawer, the Create Adjustment overlap prompt, and the rules around them checked
 * against the API as the right user.
 * Plan: `test-plans/authenticated/hour-log-adjustment.md` (HLA-B*, C03, the API halves of A08–A15)
 * and the QA workbook's web cases (`@TC:HLA-…`, see the plan's "Workbook alignment (web)").
 *
 * `@mutating`: `beforeAll` runs `pnpm seed:hourlog --json` (api/hour-log-requests.mts), which
 * creates a planned WO on QA with the operator (Agrierp 07), a second Farm Hand who raises nothing
 * and two machines, moves it to In Progress, and has the operator raise one request per case below
 * (tags in `DEFAULT_REQUESTS`) plus a `gate` left pending. A request cannot be decided by the user
 * who raised it, so the seed needs the operator's token as well as the admin's.
 * The WO only moves forward, as in production: each run ends with it in **Review** (the A15 + B16
 * test moves it there; `afterAll` runs `seed:hourlog --close` in case it didn't) and leaves it on
 * QA, named `QA HLA <timestamp>`. Started WOs are never sent back to To Do or deleted (FINDINGS #36),
 * and the run never completes it to Done, which posts to D365.
 *
 * The tests are serial and ordered: later ones rely on earlier decisions (e.g. the overlap case
 * needs `approve` approved). Tests titled `(API)` talk to the backend only and skip the page load.
 */
const OPERATOR = 'Agrierp 07';
const ROOT = path.resolve(__dirname, '../..');

type Tag = 'approve' | 'adjust' | 'reject' | 'gate' | 'overlap' | 'othermachine' | 'double' | 'nomachine' | 'adjustoverlap';

interface Seed {
  workOrderId: number;
  sequenceNo: string;
  workOrderLineId: number;
  fieldId: number;
  resourceId: number;
  otherResource: { id: number; name: string };
  machineIds: number[];
  machineLabels: string[];
  requests: { tag: Tag; id: number; requestNo: string; start: string; end: string; machineIds: number[] }[];
}

/** A request as `GET /api/WorkOrder/{id}/HourLogChangeRequests` returns it (fields used here). */
interface RequestRow {
  id: number;
  requestNo: string;
  approvalStatusName: string;
  requestedStartDateTime: string;
  requestedEndDateTime: string;
  requestedDuration: number;
  decidedStartDateTime: string | null;
  decidedEndDateTime: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  raisedByName: string;
  approverRemarks: string | null;
  rejectionReason: string | null;
  overrideConfirmed: boolean;
  machineResources: { resourceId: number }[];
}

interface HourLog {
  jobId: string;
  startDateTime: string;
  endDateTime: string;
  hours: number;
  approvalStatusName: string;
  isVoid: boolean;
}

function script(args: string[]): string {
  return execFileSync('node', ['scripts/seed-hour-log.mts', ...args, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60_000,
  }).trim();
}

/** API times are UTC, sometimes without the `Z`. */
const ms = (t: string) => Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(t) ? t : `${t}Z`);
/** How the web app shows a time: browser-local `hh:mm AM`. */
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
/** `MM/DD/YYYY`, browser-local. */
const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
/** Button / Requested-panel duration, e.g. `1h:00m`. */
const duration = (start: string, end: string) => {
  const m = Math.round((ms(end) - ms(start)) / 60000);
  return `${Math.floor(m / 60)}h:${String(m % 60).padStart(2, '0')}m`;
};
/** Spent Hours cell (`00h:00m`, `1h:45m`) in minutes. */
const minutes = (text: string) => {
  const [, h, m] = text.match(/(\d+)h:(\d+)m/)!;
  return Number(h) * 60 + Number(m);
};

test.describe('@HLA @mutating Hour Log Change Requests — manager decisions on a fresh WO', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  let seed: Seed;
  let admin: APIRequestContext;
  const req = (tag: Tag) => seed.requests.find((r) => r.tag === tag)!;

  const rows = async (): Promise<RequestRow[]> => {
    const res = await admin.get(`/api/WorkOrder/${seed.workOrderId}/HourLogChangeRequests`, { params: { page: 1, limit: 50 } });
    return (await res.json()).data;
  };
  const row = async (tag: Tag) => (await rows()).find((r) => r.id === req(tag).id)!;
  const hourLogs = async (resourceId = seed.resourceId): Promise<HourLog[]> => {
    const res = await admin.get('/api/WorkOrder/HourLogs', {
      params: {
        WorkOrderId: seed.workOrderId,
        WorkOrderLineId: seed.workOrderLineId,
        ResourceId: resourceId,
        OrderByFieldName: 'StartDateTime',
        IsASC: true,
        Page: 1,
        Limit: 100,
      },
    });
    return ((await res.json()).data ?? []).filter((l: HourLog) => !l.isVoid);
  };
  /** HistoryLog events for one request, payload parsed. */
  const events = async (tag: Tag) => {
    const res = await admin.get('/api/HistoryLog', { params: { EntityID: req(tag).id, Page: 1, Limit: 50 } });
    return ((await res.json()).data ?? [])
      .filter((e: { eventTypeName: string }) => /^HourLogChangeRequest/.test(e.eventTypeName))
      .map((e: { id: number; eventTypeName: string; platformName: string; eventPayload: string }) => ({
        ...e,
        payload: JSON.parse(e.eventPayload) as Record<string, unknown>,
      }));
  };
  const decisionEvents = async (tag: Tag) =>
    (await events(tag)).filter((e: { eventTypeName: string }) => e.eventTypeName !== 'HourLogChangeRequestRaised');
  const startsAt = (logs: HourLog[], iso: string) => logs.filter((l) => ms(l.startDateTime) === ms(iso));

  test.beforeAll(async () => {
    let out: string;
    try {
      out = script([]);
    } catch (e) {
      // The operator's token is pasted by a person and lasts ~1 h; without it nothing can be seeded.
      const msg = String((e as { stderr?: string }).stderr ?? (e as Error).message);
      test.skip(/no live operator token/.test(msg), 'no live operator token — run `AUTH_ROLES=operator pnpm auth:qa` once');
      throw e;
    }
    seed = JSON.parse(out.split('\n').pop()!) as Seed;
    admin = await apiAs('admin');
    test.info().annotations.push({ type: 'seeded', description: `${seed.sequenceNo} (id ${seed.workOrderId})` });
  });

  test.afterAll(async () => {
    await admin?.dispose();
    // Forward only: leave the WO in Review (a no-op when the A15 + B16 test already moved it there).
    if (seed) script(['--close', String(seed.workOrderId)]);
  });

  test.beforeEach(async ({ hourLogRequestsPage }) => {
    if (/\((API|operator)\)/.test(test.info().title)) return;
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toBeVisible({ timeout: 30_000 });
  });

  /** A request body in a free-ish slot: 30 min, 6 days back (clear of the seed's own slot). */
  const rawRequest = (patch: Record<string, unknown> = {}) => {
    const t0 = new Date(Date.now() - 6 * 24 * 3600e3);
    t0.setUTCMinutes(0, 0, 0);
    return {
      workOrderId: seed.workOrderId,
      workOrderLineId: seed.workOrderLineId,
      fieldId: seed.fieldId,
      resourceId: seed.resourceId,
      requestedStartDateTime: t0.toISOString(),
      requestedEndDateTime: new Date(t0.getTime() + 1800e3).toISOString(),
      machineResourceIds: [seed.machineIds[0]],
      implementResourceIds: [],
      reason: 'QA HLA api check',
      mobileDeviceType: 2,
      ...patch,
    };
  };
  const setStatus = async (statusID: number) => {
    const res = await admin.post('/api/WorkOrder/Status', { data: { id: seed.workOrderId, statusID } });
    return { ok: res.ok(), status: res.status(), text: await res.text() };
  };

  test('HLA-B17 (API) request numbers are REQ-nnnn and run in sequence', () => {
    const numbers = seed.requests.map((r) => r.requestNo);
    for (const n of numbers) expect(n).toMatch(/^REQ-\d{4}$/);
    const seq = numbers.map((n) => Number(n.slice(4)));
    expect(seq, `raised in order: ${numbers.join(', ')}`).toEqual([...seq].sort((a, b) => a - b));
    expect(new Set(seq).size).toBe(seq.length);
  });

  test('HLA-B15 @TC-partial:HLA-RL-010 @TC-partial:HLA-RL-011 @TC-partial:HLA-RL-012 (API) the operator cannot approve, adjust or reject their own request', async () => {
    const operator = await apiAs('operator');
    const r = req('approve');
    const bodies = {
      approve: { outcome: 2, confirmOverride: false },
      adjust: {
        outcome: 4,
        confirmOverride: false,
        adjustedStartDateTime: r.start,
        adjustedEndDateTime: r.end,
        machineResourceIds: r.machineIds,
        implementResourceIds: [],
        approverRemarks: 'QA HLA self-adjust',
      },
      reject: { outcome: 3, confirmOverride: false, rejectionReason: 'QA HLA self-reject' },
    };
    for (const [name, data] of Object.entries(bodies)) {
      const res = await operator.put(`/api/WorkOrder/HourLogChangeRequests/${r.id}/Decide`, { data });
      expect(res.status(), name).toBe(401);
    }
    await operator.dispose();
    expect((await row('approve')).approvalStatusName).toBe('Unapproved');
    expect(await decisionEvents('approve'), 'no audit entry for a refused self-decision').toHaveLength(0);
  });

  test('HLA-RL-008 @TC:HLA-RL-008 (operator) the operator cannot reach the decision actions on web', async ({ browser }) => {
    const context = await browser.newContext({ storageState: authFileFor('operator') });
    const page = await context.newPage();
    try {
      // Verified 2026-09-29: the operator is sent from the WO detail back to the list.
      await page.goto(routes.workorders.detail.replace(':id', String(seed.workOrderId)), { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/workorders\/?$/, { timeout: 60_000 });
      await expect(page.getByRole('link', { name: /\d+ To Review/ })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Approve \d+h:\d{2}m$/ })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('HLA-B01 @TC:HLA-WR-001 @TC:HLA-WR-002 @TC:HLA-WR-003 @TC:HLA-WR-004 the Resources table shows Hour Log Changes, the pending count and only approved Spent Hours', async ({ hourLogRequestsPage }) => {
    const table = hourLogRequestsPage.resourcesTable();
    for (const column of ['Resource Name', 'Resource Type', 'No Of Resource', 'Company', 'Tracking Log', 'Progress', 'Spent Hours', 'Hour Log Changes']) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(new RegExp(`^\\s*${seed.requests.length} To Review\\s*$`));
    // The other Farm Hand raised nothing: a dash and no chip.
    const other = hourLogRequestsPage.resourceRow(seed.otherResource.name);
    await expect(other.getByRole('link', { name: /To Review/ })).toHaveCount(0);
    await expect(other.getByRole('cell').last()).toHaveText(/^\s*[—–-]\s*$/);
    // Every request is still pending, so no hours count yet.
    expect(minutes(await hourLogRequestsPage.spentHours(OPERATOR))).toBe(0);
  });

  test('HLA-B02-partial @TC:HLA-FS-003 @TC:HLA-WR-005 @TC:HLA-WD-001 @TC:HLA-WD-005 @TC:HLA-WD-006 @TC:HLA-WD-007 @TC:HLA-WD-008 @TC:HLA-WD-011 @TC-partial:HLA-WD-002 @TC-partial:HLA-WD-010 the drawer lists each pending request with its details', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const drawer = hourLogRequestsPage.drawer();
    await expect(hourLogRequestsPage.drawerHeading()).toBeVisible();
    await expect(hourLogRequestsPage.drawerClose()).toBeVisible();
    await expect(drawer.getByText(new RegExp(`${OPERATOR} \\(07\\)`))).toBeVisible();
    await expect(drawer.getByText(new RegExp(`${seed.sequenceNo}\\W*${seed.requests.length} Needs Review`))).toBeVisible();
    await expect(hourLogRequestsPage.requestCards()).toHaveCount(seed.requests.length);
    // Newest first.
    const order = await hourLogRequestsPage.requestCards().getByText(/^REQ-\d{4}$/).allInnerTexts();
    expect(order.map((t) => t.trim())).toEqual(seed.requests.map((r) => r.requestNo).reverse());
    for (const r of seed.requests) {
      const card = hourLogRequestsPage.card(r.requestNo);
      await expect(card.getByText(r.requestNo, { exact: true })).toBeVisible();
      await expect(card.getByText(/Android\s*$/i)).toBeVisible(); // seeded with mobileDeviceType 2
      await expect(card.getByText('Machine:')).toBeVisible();
      for (const id of r.machineIds) {
        await expect(card.getByText(seed.machineLabels[seed.machineIds.indexOf(id)], { exact: true })).toBeVisible();
      }
      await expect(card.getByText('Requested', { exact: true })).toBeVisible();
      await expect(card.getByText(`${clock(r.start)} - ${clock(r.end)}`, { exact: true })).toBeVisible();
      await expect(card.getByText(`QA HLA ${r.tag} case`, { exact: true })).toBeVisible();
      await expect(card.getByRole('button', { name: `Approve ${duration(r.start, r.end)}` })).toBeEnabled();
      await expect(card.getByRole('button', { name: 'Adjust' })).toBeEnabled();
      await expect(card.getByRole('button', { name: 'Reject', exact: true })).toBeEnabled();
    }
    // Close (X) shuts the drawer and changes nothing.
    await hourLogRequestsPage.drawerClose().click();
    await expect(hourLogRequestsPage.drawerHeading()).toBeHidden();
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(new RegExp(`^\\s*${seed.requests.length} To Review\\s*$`));
  });

  test('HLA-B06 @TC:HLA-AD-010 @TC:HLA-AD-011 @TC:HLA-AD-013 @TC:HLA-AD-016 @TC-partial:HLA-AD-001 Adjust refuses a job end that is not after the job start', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(req('adjust').requestNo);
    await hourLogRequestsPage.openAdjust(card);
    // Machine / Implement multi-selects carry zero-height (`line-height-0`) labels: present, not visible.
    for (const label of ['Machine', 'Implement']) await expect(card.getByText(label, { exact: true })).toBeAttached();
    for (const label of ['Job Start*', 'Job End*', 'Remarks*']) await expect(card.getByText(label, { exact: true })).toBeVisible();
    await expect(card.getByText(/^Field\*?$/), 'the field cannot be changed on web').toHaveCount(0);
    const approve = card.getByRole('button', { name: 'Approve Hours' });
    await expect(approve).toBeDisabled(); // Remarks* is required (CL-20)
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA automation — not submitted');
    await expect(approve).toBeEnabled();

    await hourLogRequestsPage.makeEndEqualStart(card);
    await expect(card.getByText('The Job End Must Be After The Job Start')).toBeVisible();
    await expect(approve).toBeDisabled();

    // End before start: the adjust request starts at :30 (slot is hour-aligned + 1.5 h), so :00 is earlier.
    const mm = card.getByRole('textbox', { name: 'MM' });
    await expect(mm.nth(0)).toHaveValue('30');
    await mm.nth(1).fill('00');
    await mm.nth(1).press('Tab');
    await expect(card.getByText('The Job End Must Be After The Job Start')).toBeVisible();
    await expect(approve).toBeDisabled();
  });

  test('HLA-B07 @TC:HLA-AD-002 @TC:HLA-AD-014 Adjust opens pre-filled, and Cancel leaves the request as it was', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const r = req('adjust');
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openAdjust(card);

    // Pre-filled from the request: its machine as a chip, its times.
    await expect(card.locator('.selected-item', { hasText: seed.machineLabels[1] })).toBeVisible();
    const [hh, mm] = [card.getByRole('textbox', { name: 'HH' }), card.getByRole('textbox', { name: 'MM' })];
    const [sh, sm] = clock(r.start).split(/[: ]/);
    const [eh, em] = clock(r.end).split(/[: ]/);
    await expect(hh.nth(0)).toHaveValue(sh);
    await expect(mm.nth(0)).toHaveValue(sm);
    await expect(hh.nth(1)).toHaveValue(eh);
    await expect(mm.nth(1)).toHaveValue(em);

    // Change values, then Cancel.
    await mm.nth(0).fill('45');
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA automation — cancelled');
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Set The Hours Yourself' })).toBeHidden();
    await expect(card.getByRole('button', { name: /Approve \d+h:\d{2}m/ })).toBeVisible();

    const after = await row('adjust');
    expect(after.approvalStatusName).toBe('Unapproved');
    expect(ms(after.requestedStartDateTime)).toBe(ms(r.start));
    expect(ms(after.requestedEndDateTime)).toBe(ms(r.end));
  });

  test('HLA-B08 @TC:HLA-RJ-002 @TC:HLA-RJ-003 @TC:HLA-RJ-007 @TC-partial:HLA-RJ-001 Confirm Reject needs a real reason; Cancel keeps the request', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(req('reject').requestNo);
    await hourLogRequestsPage.openReject(card);
    await expect(card.getByText('Logged Hours Stay As The Spent Hours')).toBeVisible();
    const confirm = card.getByRole('button', { name: 'Confirm Reject' });
    const reason = card.getByRole('textbox', { name: 'Reason Shown To The Operator' });
    await expect(confirm).toBeDisabled();

    // Spaces only: the button wakes up, but Confirm is refused on the spot.
    await reason.fill('   ');
    await confirm.click();
    await expect(card.getByText('Reason Is Required')).toBeVisible();
    await expect(confirm).toBeDisabled();

    await reason.fill('QA automation — not submitted');
    await expect(confirm).toBeEnabled();
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Reject This Change' })).toBeHidden();
    expect((await row('reject')).approvalStatusName).toBe('Unapproved');
    expect(await decisionEvents('reject')).toHaveLength(0);
  });

  test('HLA-UI-006 @TC-partial:HLA-UI-006 a network failure on Approve leaves the request pending and retryable', async ({ page, hourLogRequestsPage }) => {
    // Known QA defect (2026-09-29, FINDINGS #46): the failed call opens the Create Adjustment overlap
    // prompt (empty table) instead of an error. The pending/retry checks below still run first.
    test.fail(true, 'network error shown as the overlap prompt (FINDINGS #46)');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const r = req('gate');
    const card = hourLogRequestsPage.card(r.requestNo);
    await page.route(/\/HourLogChangeRequests\/\d+\/decide/i, (route) => route.abort('internetdisconnected'));
    try {
      const failed = page.waitForEvent('requestfailed', (q) => /\/decide/i.test(q.url()));
      await card.getByRole('button', { name: `Approve ${duration(r.start, r.end)}` }).click();
      await failed;
      await hourLogRequestsPage.waitForLoaderGone();
    } finally {
      await page.unroute(/\/HourLogChangeRequests\/\d+\/decide/i);
    }
    const dialog = hourLogRequestsPage.overlapDialog();
    const prompted = await dialog.waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    if (prompted) {
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).toBeHidden();
    }
    await expect(card.getByText(r.requestNo, { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: `Approve ${duration(r.start, r.end)}` })).toBeEnabled();
    expect((await row('gate')).approvalStatusName).toBe('Unapproved');
    expect(prompted, 'a network error must not be shown as the Create Adjustment prompt').toBe(false);
  });

  test('HLA-B04 @TC:HLA-AP-001 @TC:HLA-AP-002 @TC:HLA-AP-003 @TC:HLA-WR-006 @TC:HLA-WR-008 @TC:HLA-WR-011 @TC:HLA-WD-009 @TC:HLA-OV-015 @TC:HLA-PR-001 @TC-partial:HLA-AP-005 @TC-partial:HLA-RL-009 @TC-partial:HLA-AP-007 Approve accepts the requested hours and updates Spent Hours', async ({ hourLogRequestsPage }) => {
    const r = req('approve');
    const before = minutes(await hourLogRequestsPage.spentHours(OPERATOR));
    const otherBefore = minutes(await hourLogRequestsPage.spentHours(seed.otherResource.name));
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const pending = await hourLogRequestsPage.needsReviewCount(seed.sequenceNo);

    // `overlap` and `othermachine` overlap this one but are still pending: they don't count (OV-015).
    await hourLogRequestsPage.decide(hourLogRequestsPage.card(r.requestNo).getByRole('button', { name: `Approve ${duration(r.start, r.end)}` }), 'none');
    await expect(hourLogRequestsPage.drawer().getByText(r.requestNo, { exact: true })).toBeHidden({ timeout: 20_000 });
    await expect.poll(() => hourLogRequestsPage.needsReviewCount(seed.sequenceNo)).toBe(pending - 1);

    // Spent Hours moves by exactly the request, without a reload.
    await hourLogRequestsPage.drawerClose().click();
    await expect(hourLogRequestsPage.drawerHeading()).toBeHidden();
    await expect.poll(async () => minutes(await hourLogRequestsPage.spentHours(OPERATOR)), { timeout: 30_000 }).toBe(before + 60);

    const decided = await row('approve');
    expect(decided.approvalStatusName).toBe('Approved');
    expect(ms(decided.decidedStartDateTime!)).toBe(ms(r.start));
    expect(ms(decided.decidedEndDateTime!)).toBe(ms(r.end));
    expect(decided.decidedByName).toBeTruthy();
    expect(decided.decidedByName).not.toBe(decided.raisedByName);
    expect(Date.now() - ms(decided.decidedAt!)).toBeLessThan(15 * 60_000);
    // A new entry for the operator and for the requested machine, at the requested times.
    expect(startsAt(await hourLogs(), r.start).map((l) => ms(l.endDateTime))).toEqual([ms(r.end)]);
    expect(startsAt(await hourLogs(r.machineIds[0]), r.start)).toHaveLength(1);
    // The other resource is untouched.
    expect(await hourLogs(seed.otherResource.id)).toHaveLength(0);

    // A second decision on a decided request is refused (another manager acting on a stale drawer).
    const again = await admin.put(`/api/WorkOrder/HourLogChangeRequests/${r.id}/Decide`, {
      data: { outcome: 3, confirmOverride: false, rejectionReason: 'QA HLA late reject' },
    });
    expect(again.ok(), await again.text()).toBe(false);
    expect((await row('approve')).approvalStatusName).toBe('Approved');

    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(new RegExp(`^\\s*${pending - 1} To Review\\s*$`), { timeout: 30_000 });
    expect(minutes(await hourLogRequestsPage.spentHours(OPERATOR))).toBe(before + 60);
    expect(minutes(await hourLogRequestsPage.spentHours(seed.otherResource.name))).toBe(otherBefore);

    // Hours Logged shows the new entry.
    const spent = await hourLogRequestsPage.openHoursLogged(OPERATOR);
    await expect(spent.getByText(/^LogAdj-\d+$/).first()).toBeVisible();
    await expect(spent.getByText(`${day(r.start)} ${clock(r.start)}`, { exact: true })).toBeVisible();
    await expect(spent.getByText(`${day(r.end)} ${clock(r.end)}`, { exact: true })).toBeVisible();
  });

  test('HLA-B13 @TC:HLA-OV-006 no Create Adjustment prompt when the overlap is on a different machine', async ({ hourLogRequestsPage }) => {
    // Known QA defect (2026-09-29, FINDINGS #45): the operator's own entry counts as an overlap even
    // though the machine differs, so the prompt appears. Drop this line once it doesn't.
    test.fail(true, 'prompt shown for a different machine (FINDINGS #45)');
    const r = req('othermachine');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    await hourLogRequestsPage.decide(hourLogRequestsPage.card(r.requestNo).getByRole('button', { name: `Approve ${duration(r.start, r.end)}` }), 'none');
    expect((await row('othermachine')).approvalStatusName).toBe('Approved');
  });

  test('HLA-RJ-009 @TC:HLA-RJ-009 rejecting an overlapping request never prompts', async ({ hourLogRequestsPage }) => {
    const r = req('othermachine');
    const before = minutes(await hourLogRequestsPage.spentHours(OPERATOR));
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openReject(card);
    await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill('QA HLA reject overlapping');
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Confirm Reject' }), 'none');
    expect((await row('othermachine')).approvalStatusName).toBe('Rejected');
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    expect(minutes(await hourLogRequestsPage.spentHours(OPERATOR))).toBe(before);
  });

  test('HLA-B11 + HLA-B12 @TC:HLA-OV-003 @TC:HLA-OV-004 @TC:HLA-OV-017 @TC:HLA-AU-006 @TC:HLA-PR-002 @TC:HLA-OV-008 @TC-partial:HLA-OV-001 overlapping time prompts Create Adjustment; Cancel decides nothing, Continue redistributes', async ({ hourLogRequestsPage }) => {
    const r = req('overlap');
    const clash = req('approve');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const approve = hourLogRequestsPage.card(r.requestNo).getByRole('button', { name: `Approve ${duration(r.start, r.end)}` });

    // The prompt, then Cancel.
    await hourLogRequestsPage.openOverlapPrompt(approve);
    const dialog = hourLogRequestsPage.overlapDialog();
    await expect(dialog.getByText(/The Selected Time Overlaps with Existing Job Time For The Same Resource And Machine/i)).toBeVisible();
    await expect(dialog.getByText(/If You Continue The System Will Redistribute Hours For All Impacted Overlapping Entries/i)).toBeVisible();
    for (const column of ['Work Order', 'Plot', 'Machine', 'Start Date', 'End Date']) {
      await expect(dialog.getByRole('columnheader', { name: column })).toBeVisible();
    }
    const clashRow = dialog.getByRole('row').filter({ hasText: seed.machineLabels[0].replace(/ \([^)]*\)$/, '') });
    await expect(clashRow).toContainText(`${day(clash.start)} ${clock(clash.start)}`);
    await expect(clashRow).toContainText(`${day(clash.end)} ${clock(clash.end)}`);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    expect((await row('overlap')).approvalStatusName).toBe('Unapproved');
    expect(await decisionEvents('overlap'), 'Cancel writes no audit entry').toHaveLength(0);

    // Again, and Continue.
    expect(await hourLogRequestsPage.decide(approve, 'continue')).toBe(true);
    const decided = await row('overlap');
    expect(decided.approvalStatusName).toBe('Approved');

    // No minute counted twice: the operator's approved entries no longer overlap.
    const logs = (await hourLogs()).sort((a, b) => ms(a.startDateTime) - ms(b.startDateTime));
    for (let i = 1; i < logs.length; i++) {
      expect(ms(logs[i].startDateTime), `${logs[i - 1].jobId} / ${logs[i].jobId}`).toBeGreaterThanOrEqual(ms(logs[i - 1].endDateTime));
    }
    expect(startsAt(logs, r.start)).toHaveLength(1);
    // The superseded entry is recorded, and the decision carries the override.
    const history = await admin.get('/api/WorkOrder/HourAdjustmentsHistory', {
      params: { WorkOrderId: seed.workOrderId, ResourceId: seed.resourceId, Page: 1, Limit: 50 },
    });
    const superseded = ((await history.json()).data ?? []) as { startDateTime: string }[];
    expect(superseded.some((h) => ms(h.startDateTime) === ms(clash.start))).toBe(true);
    expect((await decisionEvents('overlap'))[0].payload.OverrideConfirmed).toBe(true);
    expect((await decisionEvents('approve'))[0].payload.OverrideConfirmed).toBe(false);
    // Only this resource's hours were touched.
    expect(await hourLogs(seed.otherResource.id)).toHaveLength(0);

    // Spent Hours equals what is left in the log.
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    const total = Math.round((await hourLogs()).reduce((sum, l) => sum + l.hours, 0) * 60);
    expect(minutes(await hourLogRequestsPage.spentHours(OPERATOR))).toBe(total);
  });

  test('HLA-AP-006 @TC:HLA-AP-006 a double click on Approve decides once', async ({ page, hourLogRequestsPage }) => {
    const r = req('double');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const calls: number[] = [];
    page.on('response', (res) => {
      if (/\/HourLogChangeRequests\/\d+\/decide/i.test(res.url())) calls.push(res.status());
    });
    await hourLogRequestsPage.card(r.requestNo).getByRole('button', { name: `Approve ${duration(r.start, r.end)}` }).dblclick();
    await expect.poll(async () => (await row('double')).approvalStatusName, { timeout: 30_000 }).toBe('Approved');
    await hourLogRequestsPage.waitForLoaderGone();
    expect(calls.filter((s) => s >= 200 && s < 300), `decide responses: ${calls.join(', ')}`).toHaveLength(1);
    expect(await decisionEvents('double')).toHaveLength(1);
    expect(startsAt(await hourLogs(), r.start)).toHaveLength(1);
  });

  test('HLA-OV-012 @TC:HLA-OV-010 @TC:HLA-OV-012 Adjust into approved time prompts on the adjusted times, even for one minute', async ({ hourLogRequestsPage }) => {
    // `adjustoverlap` starts where `double` (approved, same machine) ends; Adjust moves its start
    // one minute earlier (:45 → :44), inside `double`.
    const r = req('adjustoverlap');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openAdjust(card);
    const mm = card.getByRole('textbox', { name: 'MM' });
    await expect(mm.nth(0)).toHaveValue('45');
    await mm.nth(0).fill('44');
    await mm.nth(0).press('Tab');
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA HLA one-minute overlap');
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Approve Hours' }), 'cancel');
    expect((await row('adjustoverlap')).approvalStatusName).toBe('Unapproved');
  });

  test('HLA-B05 @TC:HLA-AD-003 @TC:HLA-AD-006 @TC:HLA-AD-015 @TC:HLA-OV-009 Adjust approves the manager\'s times and machines and keeps the note', async ({ hourLogRequestsPage }) => {
    const r = req('adjust');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openAdjust(card);

    // Add the other machine: the existing one stays selected.
    await hourLogRequestsPage.toggleMachine(card, seed.machineLabels[0]);
    for (const label of seed.machineLabels) await expect(card.locator('.selected-item', { hasText: label })).toBeVisible();
    // Start 15 min later (:30 → :45); the end stays, and now touches `double`'s start (no overlap).
    const mm = card.getByRole('textbox', { name: 'MM' });
    await mm.nth(0).fill('45');
    await mm.nth(0).press('Tab');
    const note = `QA HLA adjust ${Date.now()}`;
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill(note);
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Approve Hours' }), 'none');
    await expect(hourLogRequestsPage.drawer().getByText(r.requestNo, { exact: true })).toBeHidden({ timeout: 20_000 });

    const decided = await row('adjust');
    const start = new Date(ms(r.start) + 15 * 60_000).toISOString();
    expect(decided.approvalStatusName).toBe('Adjusted');
    expect(decided.approverRemarks).toBe(note);
    expect(ms(decided.decidedStartDateTime!)).toBe(ms(start));
    expect(ms(decided.decidedEndDateTime!)).toBe(ms(r.end));
    expect(decided.machineResources.map((m) => m.resourceId).sort()).toEqual([...seed.machineIds].sort());
    const entry = startsAt(await hourLogs(), start);
    expect(entry).toHaveLength(1);
    expect(entry[0].hours).toBe(0.75);
  });

  test('HLA-AD-008 @TC:HLA-AD-008 Adjust with every machine removed cannot be approved', async ({ hourLogRequestsPage }) => {
    // Known QA defect (2026-09-29, FINDINGS #43): Approve Hours stays enabled and the server saves
    // the entry with no machine. Nothing is decided here: the test stops at the button.
    test.fail(true, 'Adjust accepts no machine (FINDINGS #43)');
    const r = req('nomachine');
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openAdjust(card);
    await hourLogRequestsPage.removeMachineChip(card, seed.machineLabels[1]);
    await expect(card.locator('.selected-item')).toHaveCount(0);
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA automation — not submitted');
    await expect(card.getByRole('button', { name: 'Approve Hours' })).toBeDisabled({ timeout: 5_000 });
  });

  test('HLA-B09 @TC:HLA-RJ-005 @TC-partial:HLA-RJ-004 Reject keeps the logged hours, adds no entry and records the reason', async ({ hourLogRequestsPage }) => {
    const r = req('reject');
    const before = minutes(await hourLogRequestsPage.spentHours(OPERATOR));
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(r.requestNo);
    await hourLogRequestsPage.openReject(card);

    const reason = `QA HLA reject ${Date.now()}`;
    await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill(reason);
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Confirm Reject' }), 'none');

    const decided = await row('reject');
    expect(decided.approvalStatusName).toBe('Rejected');
    expect(decided.rejectionReason).toBe(reason);
    expect(decided.decidedStartDateTime).toBeNull();
    expect(startsAt(await hourLogs(), r.start)).toHaveLength(0);

    const stillPending = (await rows()).filter((x) => x.approvalStatusName === 'Unapproved').length;
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(new RegExp(`^\\s*${stillPending} To Review\\s*$`), { timeout: 30_000 });
    expect(minutes(await hourLogRequestsPage.spentHours(OPERATOR))).toBe(before);
  });

  test('HLA-C03 @TC:HLA-AU-001 @TC:HLA-AU-002 @TC:HLA-AU-003 @TC:HLA-AU-007 @TC:HLA-DD-001 @TC:HLA-DD-002 @TC-partial:HLA-AU-004 @TC-partial:HLA-AU-005 @TC-partial:HLA-DD-003 (API) every raise and decision is written to the audit history', async () => {
    const expected: Partial<Record<Tag, string>> = {
      approve: 'Approved',
      adjust: 'Adjusted',
      reject: 'Rejected',
      overlap: 'Approved',
      othermachine: 'Rejected',
      double: 'Approved',
    };
    const all = await rows();
    for (const [tag, status] of Object.entries(expected) as [Tag, string][]) {
      const r = req(tag);
      const evs = await events(tag);
      const raised = evs.filter((e: { eventTypeName: string }) => e.eventTypeName === 'HourLogChangeRequestRaised');
      const decisions = evs.filter((e: { eventTypeName: string }) => e.eventTypeName !== 'HourLogChangeRequestRaised');
      expect(raised, `${r.requestNo} raised`).toHaveLength(1);
      expect(raised[0].platformName).toBe('Mobile');
      // Exactly one decision: the cancelled Adjust/Reject/overlap attempts wrote nothing.
      expect(decisions.map((e: { eventTypeName: string }) => e.eventTypeName), r.requestNo).toEqual([`HourLogChangeRequest${status}`]);
      const d = decisions[0];
      expect(d.platformName).toBe('Web');
      const p = d.payload;
      expect(ms(String(p.RequestedStartDateTime))).toBe(ms(r.start));
      expect(ms(String(p.RequestedEndDateTime))).toBe(ms(r.end));
      expect(p.RequesterComments).toBe(`QA HLA ${tag} case`);
      expect(p.DecidedBy).toBeTruthy();
      expect(p.DecidedAt).toBeTruthy();
      const now = all.find((x) => x.id === r.id)!;
      if (status === 'Rejected') {
        expect(p.RejectionReason).toBe(now.rejectionReason);
        expect(p.DecidedStartDateTime).toBeNull();
      } else {
        expect(ms(String(p.DecidedStartDateTime))).toBe(ms(now.decidedStartDateTime!));
        expect(ms(String(p.DecidedEndDateTime))).toBe(ms(now.decidedEndDateTime!));
      }
      if (status === 'Adjusted') expect(p.ApproverRemarks).toBe(now.approverRemarks);
      // Final times by decision: Approve = requested, Adjust = the manager's, Reject = none added.
      if (status === 'Approved') expect(ms(now.decidedStartDateTime!)).toBe(ms(r.start));
      if (status === 'Adjusted') expect(ms(now.decidedStartDateTime!)).not.toBe(ms(r.start));
      // A new entry has no original, so its change equals the requested duration.
      expect(now.requestedDuration).toBe((ms(r.end) - ms(r.start)) / 3600e3);
    }
    for (const x of all) expect(['Unapproved', 'Approved', 'Adjusted', 'Rejected']).toContain(x.approvalStatusName);

    // The audit is read-only: the API offers no way to change or remove an entry.
    const entry = (await decisionEvents('approve'))[0];
    for (const method of ['put', 'delete'] as const) {
      const res = await admin[method](`/api/HistoryLog/${entry.id}`, method === 'put' ? { data: { id: entry.id } } : {});
      expect(res.ok(), `${method.toUpperCase()} /api/HistoryLog/${entry.id} → ${res.status()}`).toBe(false);
    }
    expect((await decisionEvents('approve'))[0].eventPayload).toBe(entry.eventPayload);
  });

  test('HLA-A09 + HLA-A10 (API) the server refuses end <= start and a missing reason with the spec wording', async () => {
    const operator = await apiAs('operator');
    const endEqualsStart = rawRequest();
    endEqualsStart.requestedEndDateTime = endEqualsStart.requestedStartDateTime;
    const cases: [Record<string, unknown>, string][] = [
      [endEqualsStart, 'The job end must be after the job start.'],
      [rawRequest({ reason: '' }), 'Add a short reason — your manager needs it to approve.'],
    ];
    for (const [body, message] of cases) {
      const res = await operator.post('/api/WorkOrder/HourLogChangeRequests', { data: body });
      const text = await res.text();
      expect(res.status(), text).toBe(400);
      expect(text).toContain(message);
    }
    await operator.dispose();
  });

  test('HLA-A08 (API) a request without a machine is refused', async () => {
    // Known QA defect (2026-09-28): accepted — see knowledge ref "QA findings" #2. Flips to a
    // failure ("unexpectedly passed") once the backend validates it; then drop this line.
    test.fail(true, 'QA accepts requests with no machine (defect #2)');
    const operator = await apiAs('operator');
    const res = await operator.post('/api/WorkOrder/HourLogChangeRequests', { data: rawRequest({ machineResourceIds: [] }) });
    if (res.ok()) {
      const id = (await res.json())?.id ?? (await res.json())?.data?.id;
      if (id) await operator.delete(`/api/WorkOrder/HourLogChangeRequests/${id}`);
    }
    await operator.dispose();
    expect(res.status()).toBe(400);
  });

  test('HLA-A15 + HLA-B16 (API) in Review no request can be raised and the WO cannot complete while one is pending', async () => {
    // The WO moves forward to Review and stays there (never back to To Do / In Progress). The
    // `gate` request is still pending, so Done must be refused.
    expect((await setStatus(4)).ok, 'move WO to Review').toBe(true);
    const operator = await apiAs('operator');
    const raised = await operator.post('/api/WorkOrder/HourLogChangeRequests', { data: rawRequest() });
    const raisedBody = await raised.text();
    await operator.dispose();
    expect(raised.status(), raisedBody).toBe(400);
    expect(raisedBody).toContain('This job can only be adjusted while the work order is In Progress.');

    const done = await setStatus(5);
    expect(done.status).toBe(400);
    expect(done.text).toContain(
      'This work order has a pending hour-log change request. Decide it before completing or posting this work order.',
    );
    expect((await row('gate')).approvalStatusName).toBe('Unapproved');
  });

  test('HLA-B16 @TC:HLA-WC-001 Mark As Done is refused while a request is pending', async ({ page, hourLogRequestsPage }) => {
    // The `gate` request is still pending, so the server refuses and the WO stays in Review.
    const res = await hourLogRequestsPage.markAsDone('QA HLA completion gate');
    expect(res.status()).toBe(400);
    await expect(
      page.getByRole('alertdialog').filter({
        hasText: 'This work order has a pending hour-log change request. Decide it before completing or posting this work order.',
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark As Done' })).toBeVisible();
    const summary = await admin.get(`/api/WorkOrder/${seed.workOrderId}/Summary`, { params: { locationId: 2, seasonId: 13 } });
    const body = await summary.json();
    expect((body.data ?? body).statusName).toBe('Review');
  });

  test('HLA-WS-006 @TC:HLA-WS-006 @TC:HLA-WR-007 pending requests can still be decided in Review; the chip goes once all are', async ({ hourLogRequestsPage }) => {
    // Runs after the WO moved to Review. Decide whatever is still pending (`gate`, and `nomachine`
    // while FINDINGS #43 keeps AD-008 from deciding it) by rejecting it.
    const pending = (await rows()).filter((x) => x.approvalStatusName === 'Unapproved');
    expect(pending.map((x) => x.id)).toContain(req('gate').id);
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    for (const p of pending) {
      const card = hourLogRequestsPage.card(p.requestNo);
      await hourLogRequestsPage.openReject(card);
      await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill('QA HLA decided in Review');
      await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Confirm Reject' }), 'none');
      await expect(hourLogRequestsPage.drawer().getByText(p.requestNo, { exact: true })).toBeHidden({ timeout: 20_000 });
    }
    expect((await rows()).filter((x) => x.approvalStatusName === 'Unapproved')).toHaveLength(0);
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveCount(0, { timeout: 30_000 });
    await expect(hourLogRequestsPage.resourceRow(OPERATOR).getByRole('cell').last()).toHaveText(/^\s*[—–-]\s*$/);
  });
});

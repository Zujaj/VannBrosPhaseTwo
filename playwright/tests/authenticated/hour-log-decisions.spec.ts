import { execFileSync } from 'child_process';
import path from 'path';
import { test, expect } from '../fixtures';
import { apiAs } from '../helpers/roleApi';

/**
 * Hour Log Adjustment on a FRESH work order: the manager's decisions (Approve / Adjust / Reject)
 * in the web drawer, plus the rules around them checked against the API as the right user.
 * Plan: `test-plans/authenticated/hour-log-adjustment.md` — HLA-B17, B15, A15, B16 (API, before
 * any decision), B01, B02, B06, B07, B08 (UI, nothing decided), B04, B05, B09 (UI decisions),
 * then C03 and A08/A09/A10 (API).
 *
 * `@mutating`: `beforeAll` runs `pnpm seed:hourlog --json` (api/hour-log-requests.mts), which
 * creates a planned WO on QA, moves it to In Progress, and has the operator (Agrierp 07) raise
 * three requests — one per decision. A request cannot be decided by the user who raised it, so
 * the seed needs the operator's token as well as the admin's (see scripts/seed-hour-log.mts).
 * `afterAll` deletes the WO (`seed:hourlog --delete`: back to To Do, then delete — QA refuses to
 * delete an In Progress WO). If a run dies first, leftovers are named `QA HLA <timestamp>`.
 *
 * Outcomes are checked in the UI and against the API (`seed:hourlog --status`); tests titled
 * `(API)` talk to the backend only (tests/helpers/roleApi.ts) and skip the page load.
 */
const OPERATOR = 'Agrierp 07';
const ROOT = path.resolve(__dirname, '../..');

interface Seed {
  workOrderId: number;
  sequenceNo: string;
  workOrderLineId: number;
  fieldId: number;
  resourceId: number;
  machineIds: number[];
  requests: { tag: 'approve' | 'adjust' | 'reject'; id: number; requestNo: string }[];
}

function script(args: string[]): string {
  return execFileSync('node', ['scripts/seed-hour-log.mts', ...args, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 5 * 60_000,
  }).trim();
}

function statusOf(workOrderId: number, requestId: number) {
  const rows = JSON.parse(script(['--status', String(workOrderId)])) as {
    id: number;
    status: string;
    approverRemarks: string | null;
    rejectionReason: string | null;
  }[];
  return rows.find((r) => r.id === requestId)!;
}

test.describe('@HLA @mutating Hour Log Change Requests — manager decisions on a fresh WO', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(240_000);

  let seed: Seed;
  const req = (tag: Seed['requests'][number]['tag']) => seed.requests.find((r) => r.tag === tag)!;

  test.beforeAll(() => {
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
    test.info().annotations.push({ type: 'seeded', description: `${seed.sequenceNo} (id ${seed.workOrderId})` });
  });

  test.afterAll(() => {
    if (seed) script(['--delete', String(seed.workOrderId)]);
  });

  test.beforeEach(async ({ hourLogRequestsPage }) => {
    if (test.info().title.includes('(API)')) return;
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toBeVisible({ timeout: 30_000 });
  });

  /** A request body in a free-ish slot: 30 min, 2 days before the seed's own slot. */
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
    const admin = await apiAs('admin');
    const res = await admin.post('/api/WorkOrder/Status', { data: { id: seed.workOrderId, statusID } });
    const out = { ok: res.ok(), status: res.status(), text: await res.text() };
    await admin.dispose();
    return out;
  };

  test('HLA-B17 (API) request numbers are REQ-nnnn and run in sequence', () => {
    const numbers = seed.requests.map((r) => r.requestNo);
    for (const n of numbers) expect(n).toMatch(/^REQ-\d{4}$/);
    const seq = numbers.map((n) => Number(n.slice(4)));
    expect(seq, `raised in order: ${numbers.join(', ')}`).toEqual([...seq].sort((a, b) => a - b));
    expect(new Set(seq).size).toBe(seq.length);
  });

  test('HLA-B15 (API) the operator cannot decide their own request', async () => {
    const operator = await apiAs('operator');
    const res = await operator.put(`/api/WorkOrder/HourLogChangeRequests/${req('approve').id}/Decide`, {
      data: { outcome: 2, confirmOverride: false },
    });
    await operator.dispose();
    expect(res.status()).toBe(401);
    expect(statusOf(seed.workOrderId, req('approve').id).status).toBe('Unapproved');
  });

  test('HLA-A15 + HLA-B16 (API) in Review no request can be raised and the WO cannot complete while one is pending', async () => {
    expect((await setStatus(4)).ok, 'move WO to Review').toBe(true);
    try {
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
    } finally {
      expect((await setStatus(3)).ok, 'back to In Progress for the UI decisions').toBe(true);
    }
  });

  test('HLA-B01 the Resources table shows Hour Log Changes with "3 To Review" for the operator', async ({ hourLogRequestsPage }) => {
    const table = hourLogRequestsPage.resourcesTable();
    for (const column of ['Resource Name', 'Resource Type', 'Tracking Log', 'Progress', 'Spent Hours', 'Hour Log Changes']) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(/^\s*3 To Review\s*$/);
  });

  test('HLA-B02-partial the drawer lists each pending request with its details', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const drawer = hourLogRequestsPage.drawer();
    await expect(drawer.getByText(new RegExp(`${OPERATOR} \\(07\\)`))).toBeVisible();
    await expect(drawer.getByText(new RegExp(`${seed.sequenceNo}\\W*3 Needs Review`))).toBeVisible();
    await expect(hourLogRequestsPage.requestCards()).toHaveCount(3);
    for (const r of seed.requests) {
      const card = hourLogRequestsPage.card(r.requestNo);
      await expect(card.getByText(r.requestNo, { exact: true })).toBeVisible();
      await expect(card.getByText(/Android\s*$/i)).toBeVisible(); // seeded with mobileDeviceType 2
      await expect(card.getByText('Machine:')).toBeVisible();
      await expect(card.getByText('Requested', { exact: true })).toBeVisible();
      await expect(card.getByText(/^\d{2}:\d{2} [AP]M - \d{2}:\d{2} [AP]M$/)).toBeVisible();
      await expect(card.getByText(`QA HLA ${r.tag} case`)).toBeVisible();
    }
    await expect(hourLogRequestsPage.card(req('approve').requestNo).getByRole('button', { name: /Approve 1h:00m/ })).toBeEnabled();
    await expect(hourLogRequestsPage.card(req('reject').requestNo).getByRole('button', { name: /Approve 0h:30m/ })).toBeEnabled();
  });

  test('HLA-B06 Adjust refuses a job end that is not after the job start', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(req('adjust').requestNo);
    await hourLogRequestsPage.openAdjust(card);
    // Machine / Implement multi-selects carry zero-height (`line-height-0`) labels: present, not visible.
    for (const label of ['Machine', 'Implement']) await expect(card.getByText(label, { exact: true })).toBeAttached();
    for (const label of ['Job Start*', 'Job End*', 'Remarks*']) await expect(card.getByText(label, { exact: true })).toBeVisible();
    const approve = card.getByRole('button', { name: 'Approve Hours' });
    await expect(approve).toBeDisabled(); // Remarks* is required
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA automation — not submitted');
    await expect(approve).toBeEnabled();
    await hourLogRequestsPage.makeEndEqualStart(card);
    await expect(card.getByText('The Job End Must Be After The Job Start')).toBeVisible();
    await expect(approve).toBeDisabled();
  });

  test('HLA-B07 Cancel on Adjust closes the form and leaves the request pending', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(req('adjust').requestNo);
    await hourLogRequestsPage.openAdjust(card);
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Set The Hours Yourself' })).toBeHidden();
    await expect(card.getByRole('button', { name: /Approve \d+h:\d{2}m/ })).toBeVisible();
    expect(statusOf(seed.workOrderId, req('adjust').id).status).toBe('Unapproved');
  });

  test('HLA-B08 Confirm Reject stays disabled until a reason is entered', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const card = hourLogRequestsPage.card(req('reject').requestNo);
    await hourLogRequestsPage.openReject(card);
    await expect(card.getByText('Logged Hours Stay As The Spent Hours')).toBeVisible();
    const confirm = card.getByRole('button', { name: 'Confirm Reject' });
    await expect(confirm).toBeDisabled();
    await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill('QA automation — not submitted');
    await expect(confirm).toBeEnabled();
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Reject This Change' })).toBeHidden();
    expect(statusOf(seed.workOrderId, req('reject').id).status).toBe('Unapproved');
  });

  test('HLA-B04 Approve accepts the requested hours and updates Spent Hours', async ({ hourLogRequestsPage }) => {
    const before = await hourLogRequestsPage.spentHours(OPERATOR);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(/^\s*3 To Review\s*$/);
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));

    const { requestNo, id } = req('approve');
    const card = hourLogRequestsPage.card(requestNo);
    // The approve request is seeded 1 h long → the button states 1h:00m.
    await hourLogRequestsPage.decide(card.getByRole('button', { name: /Approve 1h:00m/ }));

    await expect(hourLogRequestsPage.drawer().getByText(requestNo, { exact: true })).toBeHidden({ timeout: 20_000 });
    expect(statusOf(seed.workOrderId, id).status).toBe('Approved');

    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveText(/^\s*2 To Review\s*$/, { timeout: 30_000 });
    expect(await hourLogRequestsPage.spentHours(OPERATOR)).not.toBe(before);
  });

  test('HLA-B05 Adjust approves the manager\'s hours and keeps the note', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const { requestNo, id } = req('adjust');
    const card = hourLogRequestsPage.card(requestNo);
    await hourLogRequestsPage.openAdjust(card);

    const note = `QA HLA adjust ${Date.now()}`;
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill(note);
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Approve Hours' }));

    await expect(hourLogRequestsPage.drawer().getByText(requestNo, { exact: true })).toBeHidden({ timeout: 20_000 });
    const row = statusOf(seed.workOrderId, id);
    expect(row.status).toBe('Adjusted');
    expect(row.approverRemarks).toBe(note);
  });

  test('HLA-B09 Reject keeps the logged hours and records the reason', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.chipFor(OPERATOR));
    const { requestNo, id } = req('reject');
    const card = hourLogRequestsPage.card(requestNo);
    await hourLogRequestsPage.openReject(card);

    const reason = `QA HLA reject ${Date.now()}`;
    await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill(reason);
    await hourLogRequestsPage.decide(card.getByRole('button', { name: 'Confirm Reject' }));

    const row = statusOf(seed.workOrderId, id);
    expect(row.status).toBe('Rejected');
    expect(row.rejectionReason).toBe(reason);

    // Last pending request decided → the operator's chip is gone.
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toHaveCount(0, { timeout: 30_000 });
  });

  test('HLA-C03 (API) every raise and decision is written to the audit history', async () => {
    const admin = await apiAs('admin');
    const expected = { approve: 'Approved', adjust: 'Adjusted', reject: 'Rejected' } as const;
    for (const r of seed.requests) {
      const res = await admin.get('/api/HistoryLog', { params: { EntityID: r.id, Page: 1, Limit: 20 } });
      const rows = ((await res.json()).data ?? []) as { eventTypeName: string; platformName: string }[];
      const events = rows.filter((x) => /^HourLogChangeRequest/.test(x.eventTypeName));
      expect(events.map((e) => e.eventTypeName), r.requestNo).toEqual(
        expect.arrayContaining(['HourLogChangeRequestRaised', `HourLogChangeRequest${expected[r.tag]}`]),
      );
      expect(events.find((e) => e.eventTypeName === `HourLogChangeRequest${expected[r.tag]}`)?.platformName).toBe('Web');
    }
    await admin.dispose();
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
});

import { execFileSync } from 'child_process';
import path from 'path';
import { test, expect } from '../fixtures';

/**
 * Hour Log Adjustment — the manager's decisions (Approve / Adjust / Reject) on a FRESH work
 * order. Plan: `test-plans/authenticated/hour-log-adjustment.md` (HLA-B04, B05, B09).
 *
 * `@mutating`: `beforeAll` runs `pnpm seed:hourlog --json` (api/hour-log-requests.mts), which
 * creates a planned WO on QA, moves it to In Progress, and has the operator (Agrierp 07) raise
 * three requests — one per decision. A request cannot be decided by the user who raised it, so
 * the seed needs the operator's token as well as the admin's (see scripts/seed-hour-log.mts).
 * `afterAll` deletes the WO (`seed:hourlog --delete`: back to To Do, then delete — QA refuses to
 * delete an In Progress WO). If a run dies first, leftovers are named `QA HLA <timestamp>`.
 *
 * Outcomes are checked in the UI and against the API (`seed:hourlog --status`).
 */
const OPERATOR = 'Agrierp 07';
const ROOT = path.resolve(__dirname, '../..');

interface Seed {
  workOrderId: number;
  sequenceNo: string;
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
    await hourLogRequestsPage.gotoWorkOrder(seed.workOrderId);
    await expect(hourLogRequestsPage.chipFor(OPERATOR)).toBeVisible({ timeout: 30_000 });
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
});

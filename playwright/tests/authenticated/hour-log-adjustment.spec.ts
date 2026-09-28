import { test, expect } from '../fixtures';
import { HourLogRequestsPage } from '../pages/hour-log-requests.page';

/**
 * Hour Log Adjustment — the manager reviewing hour log change requests on web.
 * Plan: `test-plans/authenticated/hour-log-adjustment.md` (HLA-B*). Tag `@HLA`.
 *
 * All non-mutating: the requests are raised by operators on mobile, and these cases only open
 * the review drawer and its Adjust / Reject panels — nothing is approved or rejected.
 *
 * Opt-in: runs only when `HLA_WORK_ORDER_ID` names a work order with at least one pending
 * request (31307 = WO-1283 had some on 2026-09-28); find one with
 * `GET /api/WorkOrder/{id}/HourLogChangeRequests/PendingByResource` (`pendingCount > 0`).
 */
const WORK_ORDER_ID = process.env.HLA_WORK_ORDER_ID;

test.describe('@HLA Hour Log Change Requests — manager review (web)', () => {
  // Opt-in: the same checks run deterministically on a fresh seeded WO in
  // hour-log-decisions.spec.ts. This file is for spot-checking a REAL work order during UAT.
  test.skip(!WORK_ORDER_ID, 'set HLA_WORK_ORDER_ID to review a real work order (e.g. 31307 = WO-1283)');
  // One heavy WO detail page shared by every case; five workers loading it at once time out on QA.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.gotoWorkOrder(WORK_ORDER_ID!);
    test.skip(
      !(await hourLogRequestsPage.hasPendingRequests()),
      `WO id ${WORK_ORDER_ID} has no pending hour log requests; set HLA_WORK_ORDER_ID`,
    );
  });

  test('HLA-B01 Resources table shows Hour Log Changes with an "N To Review" chip', async ({
    hourLogRequestsPage,
  }) => {
    const table = hourLogRequestsPage.resourcesTable();
    for (const column of ['Resource Name', 'Resource Type', 'Tracking Log', 'Progress', 'Spent Hours', 'Hour Log Changes']) {
      await expect(table.getByRole('columnheader', { name: column })).toBeVisible();
    }
    await expect(hourLogRequestsPage.toReviewChips().first()).toHaveText(/^\s*[1-9]\d* To Review\s*$/);
  });

  test('HLA-B02-partial the chip opens the drawer with one card per pending request', async ({
    page,
    hourLogRequestsPage,
  }) => {
    const chip = hourLogRequestsPage.toReviewChips().first();
    const pending = Number((await chip.innerText()).match(/\d+/)![0]);
    await hourLogRequestsPage.openDrawer(chip);

    const drawer = hourLogRequestsPage.drawer();
    // Subtitle `<Resource (code)> · WO-nnnn · N Needs Review`; the `·` separators are CSS, not text.
    await expect(drawer.getByText(new RegExp(`WO-\\d+\\W*${pending} Needs Review`))).toBeVisible();
    await expect(hourLogRequestsPage.requestCards()).toHaveCount(pending);

    const card = hourLogRequestsPage.requestCards().first();
    await expect(card.getByText(/^REQ-\d{4}$/)).toBeVisible();
    await expect(card.getByText(/(IOS|Android)\s*$/i) /* icon glyph precedes the label */).toBeVisible();
    await expect(card.getByText('Machine:')).toBeVisible();
    await expect(card.getByText('Requested', { exact: true })).toBeVisible();
    await expect(card.getByText(/^\d{2}:\d{2} [AP]M - \d{2}:\d{2} [AP]M$/).first()).toBeVisible();
    // The Approve button states the duration it will approve, e.g. "Approve 4h:45m".
    await expect(card.getByRole('button', { name: /Approve \d+h:\d{2}m/ })).toBeEnabled();
    await expect(card.getByRole('button', { name: 'Adjust' })).toBeEnabled();
    await expect(card.getByRole('button', { name: 'Reject', exact: true })).toBeEnabled();

    await page.getByText('Close').or(page.locator('[title="Close"]')).first().click().catch(() => {});
  });

  test('HLA-B06 Adjust refuses a job end that is not after the job start', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.toReviewChips().first());
    const { card } = await hourLogRequestsPage.firstCard();
    await hourLogRequestsPage.openAdjust(card);

    // Machine / Implement multi-selects carry zero-height (`line-height-0`) labels: present, not visible.
    for (const label of ['Machine', 'Implement']) {
      await expect(card.getByText(label, { exact: true })).toBeAttached();
    }
    for (const label of ['Job Start*', 'Job End*', 'Remarks*']) {
      await expect(card.getByText(label, { exact: true })).toBeVisible();
    }
    const approve = card.getByRole('button', { name: 'Approve Hours' });
    await expect(approve).toBeDisabled(); // Remarks* is required
    await card.getByRole('textbox', { name: 'Note For The Operator' }).fill('QA automation — not submitted');
    await expect(approve).toBeEnabled();

    await hourLogRequestsPage.makeEndEqualStart(card);
    await expect(card.getByText(HourLogRequestsPage.END_AFTER_START)).toBeVisible();
    await expect(approve).toBeDisabled();
  });

  test('HLA-B07 Cancel on Adjust closes the form and leaves the request pending', async ({ hourLogRequestsPage }) => {
    const chip = hourLogRequestsPage.toReviewChips().first();
    const before = await chip.innerText();
    await hourLogRequestsPage.openDrawer(chip);
    const { reqNo, card } = await hourLogRequestsPage.firstCard();

    await hourLogRequestsPage.openAdjust(card);
    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Set The Hours Yourself' })).toBeHidden();
    await expect(hourLogRequestsPage.drawer().getByText(reqNo, { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: /Approve \d+h:\d{2}m/ })).toBeVisible();

    await hourLogRequestsPage.gotoWorkOrder(WORK_ORDER_ID!);
    await expect(hourLogRequestsPage.toReviewChips().first()).toHaveText(before);
  });

  test('HLA-B08 Confirm Reject stays disabled until a reason is entered', async ({ hourLogRequestsPage }) => {
    await hourLogRequestsPage.openDrawer(hourLogRequestsPage.toReviewChips().first());
    const { card } = await hourLogRequestsPage.firstCard();
    await hourLogRequestsPage.openReject(card);

    await expect(card.getByText('Logged Hours Stay As The Spent Hours')).toBeVisible();
    const confirm = card.getByRole('button', { name: 'Confirm Reject' });
    await expect(confirm).toBeDisabled();
    await card.getByRole('textbox', { name: 'Reason Shown To The Operator' }).fill('QA automation — not submitted');
    await expect(confirm).toBeEnabled();

    await card.getByRole('button', { name: 'Cancel' }).click();
    await expect(card.getByRole('heading', { name: 'Reject This Change' })).toBeHidden();
  });
});

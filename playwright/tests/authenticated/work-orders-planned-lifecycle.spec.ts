import { execFileSync } from 'child_process';
import path from 'path';
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { savedToast, type WorkOrdersPage } from '../pages/work-orders.page';
import type { ListPage } from '../pages/list.page';
import { routes } from '../constants/routes';
import { plannedScenario, type WoScenario } from '../helpers/workOrderScenarios';
import { apiAs } from '../helpers/roleApi';

/**
 * Work Orders — Planned WO lifecycle after authoring: Draft, Edit, Submit-from-Draft, Recall,
 * Delete. Plan: test-plans/authenticated/work-orders-planned.md (TC-8).
 *
 * State is set up and read back through the API (a seeded WO takes seconds; the same chain through
 * the UI took ~9 minutes). The UI is used only for what the UI uniquely proves: Save As Draft, the
 * Edit form, the Update confirm and the Delete dialog.
 *
 * Live wording, verified on QA 2026-10-14:
 *  - Create form: `Save As` (dropdown: `Queue` / `Draft`) -> `Create Work Order` confirm -> toast
 *    `Work Order WO-n | <name> saved successfully`. A Draft needs a Supervisor and one plot.
 *  - Edit form (`Edit Work Order`): `Save As` / `Submit`, confirm `Update Work Order` -> toast
 *    `Work Order updated successfully`. Submitting a Draft moves it to To Do. Farm and Task are
 *    disabled inputs here (`#selected-farm` shows the farm name without its code).
 *  - Delete (list row): `Are You Sure You Want To Delete This Work Order` / `Yes`.
 *  - Recall: `POST /api/WorkOrder/Recall` with `statusID` = the WO's CURRENT status (2, To Do).
 *    `statusID: 1` answers success with status 1 but leaves the WO in To Do, so a recall is only
 *    proven by reading the status back. The web `Recall` button is not covered: the admin used
 *    here has no User Role, and Recall is a role permission (see FINDINGS #56).
 *
 * @mutating: every run creates real work orders on the shared QA env; teardown deletes them.
 */

const ROOT = path.resolve(__dirname, '..', '..');
const DRAFT = 1; // WorkOrderStatus
const TODO = 2;

interface Seeded {
  id: number;
  sequenceNo: string;
  name: string;
}

/** One To Do Planned WO (1 plot) created straight through the API. */
function seedPlanned(name: string): Seeded {
  const out = execFileSync('node', ['scripts/seed-planned-one.mts', '--name', name], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 3 * 60_000,
  });
  return JSON.parse(out.trim().split('\n').pop()!);
}

/** Delete by name through the shared script; no-op when nothing matches. Draft / To Do only. */
function deleteByName(name: string): void {
  try {
    execFileSync('node', ['scripts/delete-work-orders.mts', '--name', name, '--yes'], { cwd: ROOT, stdio: 'ignore', timeout: 3 * 60_000 });
  } catch {
    /* already gone */
  }
}

async function detail(api: APIRequestContext, id: number): Promise<{ status: number }> {
  const res = await api.get(`api/workOrder/${id}/Detail?locationId=2&seasonId=13`);
  expect(res.ok(), `GET detail ${id}`).toBeTruthy();
  const body = await res.json();
  const d = body.data ?? body;
  return { status: d.status };
}

async function recall(api: APIRequestContext, id: number): Promise<void> {
  const res = await api.post('api/WorkOrder/Recall', { data: { id, statusID: TODO } });
  expect(res.ok(), `recall ${id}`).toBeTruthy();
  // The response alone proves nothing (see header): read the status back.
  await expect.poll(async () => (await detail(api, id)).status, { message: 'status after recall' }).toBe(DRAFT);
}

/** Fill the Create form with one plot and Supervisor, leaving the final action to the caller. */
async function fillMinimalPlanned(page: Page, workOrdersPage: WorkOrdersPage, wo: WoScenario) {
  await workOrdersPage.openCreateForm('planned');
  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], wo.task);
  await workOrdersPage.addFirstFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/);
  // Supervisor last: section saves re-render the form and wipe an earlier pick.
  await workOrdersPage.selectFromDropdown(['Supervisor*'], wo.supervisor!);
}

/** The grid row for a WO name under one status chip, from a fresh page load. */
async function rowUnder(page: Page, listPage: ListPage, chip: string, name: string): Promise<Locator> {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await listPage.filterByStatus(chip);
  // The grid keeps the last column filter across a reload, and a filtered column shows a reset
  // icon instead of the search one, so a second search in the same test would wait forever.
  await listPage.clearColumnSearch('WO Name');
  await listPage.searchColumn('WO Name', name);
  return listPage.rows.filter({ hasText: name });
}

test.describe('Planned work order lifecycle (API-seeded)', () => {
  test.setTimeout(240000);

  let api: APIRequestContext;
  let wo: Seeded;

  test.beforeAll(async () => {
    api = await apiAs('admin');
  });
  test.afterAll(async () => {
    await api.dispose();
  });
  test.beforeEach(() => {
    wo = seedPlanned(`QA Lifecycle ${Date.now()}`);
  });
  test.afterEach(async () => {
    // Draft and To Do can always be deleted; 404 only means the test already did it.
    await api.delete(`api/WorkOrder/${wo.id}`).catch(() => {});
  });

  test('@mutating @TC-partial:WP-050 @TC-partial:WP-051 @TC-partial:WP-052 recall returns a To Do WO to Draft, and it can be resubmitted, repeatedly', async ({ page, workOrdersPage, listPage }) => {
    for (const round of [1, 2]) {
      await recall(api, wo.id);

      const draft = await rowUnder(page, listPage, 'Draft', wo.name);
      await expect(draft, `round ${round}: Draft after recall`).toHaveCount(1, { timeout: 30000 });

      await workOrdersPage.editRow(draft.first());
      await expect(page.getByPlaceholder('Enter Work Order Name')).toHaveValue(wo.name, { timeout: 20000 });
      await workOrdersPage.submitUpdateAndConfirm();
      await expect(page.getByText('Work Order updated successfully')).toBeVisible({ timeout: 30000 });
      await expect.poll(async () => (await detail(api, wo.id)).status, { message: `round ${round}: status after resubmit` }).toBe(TODO);
    }
  });

  test('@mutating @TC-partial:WP-053 Edit opens a Draft pre-populated', async ({ page, workOrdersPage, listPage }) => {
    await recall(api, wo.id);
    const draft = await rowUnder(page, listPage, 'Draft', wo.name);
    await workOrdersPage.editRow(draft.first());
    await expect(page.getByPlaceholder('Enter Work Order Name')).toHaveValue(wo.name, { timeout: 20000 });
    await expect(page.locator('#selected-farm')).not.toHaveValue('', { timeout: 20000 });
    await expect(page.locator('#selected-operation')).not.toHaveValue('', { timeout: 20000 });
    await expect(page.locator('#select-supervisor')).not.toHaveText(/^\s*$/, { timeout: 20000 });
    await expect(page.getByText(/^1 Total (Plots|Fields)$/)).toBeVisible();
  });

  test('@mutating @TC-partial:WP-058 @TC-partial:WP-059 cancelling the delete dialog keeps the WO; confirming removes it', async ({ page, workOrdersPage, listPage }) => {
    const row = await rowUnder(page, listPage, 'To Do', wo.name);
    await expect(row).toHaveCount(1, { timeout: 30000 });

    await row.first().getByTitle(/^Delete Work ?order$/i).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(/Are You Sure You Want To Delete This Work Order/i)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(1);

    await workOrdersPage.deleteRow(row.first());
    const res = await api.get(`api/workOrder/${wo.id}/Detail?locationId=2&seasonId=13`);
    expect(res.ok() ? (await res.json()).data : null, 'deleted WO is gone from the API').toBeFalsy();
  });
});

test.describe('Planned work order Save As Draft', () => {
  test.setTimeout(300000);

  test('@mutating @TC-partial:WP-048 @TC-partial:WP-060 Save As Draft stores a Draft in the Draft list, which can then be deleted', async ({ page, workOrdersPage, listPage }) => {
    const wo = plannedScenario({ name: `QA Draft Delete ${Date.now()}` });
    try {
      await fillMinimalPlanned(page, workOrdersPage, wo);
      await workOrdersPage.saveAsDraftAndConfirm();
      await expect(page.getByText(savedToast(wo.name))).toBeVisible({ timeout: 30000 });

      const row = await rowUnder(page, listPage, 'Draft', wo.name);
      await expect(row).toHaveCount(1, { timeout: 30000 });
      await workOrdersPage.deleteRow(row.first());
    } finally {
      deleteByName(wo.name);
    }
  });
});

test.describe('Work order delete availability', () => {
  test.beforeEach(async ({ page, listPage }) => {
    await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await listPage.waitForGridSettled();
  });

  test('@TC-partial:WP-056 Draft and To Do rows offer the Delete action', async ({ listPage }) => {
    test.setTimeout(120000);
    for (const chip of ['Draft', 'To Do']) {
      await listPage.filterByStatus(chip);
      const first = listPage.rows.first();
      test.skip(!(await first.isVisible().catch(() => false)), `no ${chip} work orders in the tenant`);
      await expect(first.getByTitle(/^Delete Work ?order$/i), chip).toHaveCount(1);
    }
  });

  test('@TC-partial:WP-061 In Progress, Review and Done rows offer no Delete action', async ({ listPage }) => {
    test.setTimeout(180000);
    let checked = 0;
    for (const chip of ['In Progress', 'Review', 'Done']) {
      await listPage.filterByStatus(chip);
      const rows = listPage.rows;
      if (!(await rows.first().isVisible().catch(() => false))) continue;
      const n = Math.min(await rows.count(), 5);
      for (let i = 0; i < n; i++) {
        await expect(rows.nth(i).getByTitle(/^Delete Work ?order$/i), `${chip} row ${i}`).toHaveCount(0);
        checked++;
      }
    }
    test.skip(checked === 0, 'no In Progress / Review / Done work orders in the tenant');
  });
});

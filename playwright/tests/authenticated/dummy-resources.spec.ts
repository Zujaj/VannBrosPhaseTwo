import { test, expect } from '../fixtures';
import { plannedScenario } from '../helpers/workOrderScenarios';
import { savedToast } from '../pages/work-orders.page';
import { upcoming } from '../helpers/upcoming';

/**
 * Dummy Resources — Product Specifications Document v2.0 (Sep 16, 2026),
 * `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf`.
 * Plan: `test-plans/authenticated/dummy-resources.md` (case ids DR-xx, PSD section per case).
 *
 * Web half only. Shifts, Start/Resume Job, headcount × standard hours, machine binding and the
 * shift audit trail are Farm Mobile App flows — listed as manual cases in the plan.
 *
 * QA (verified live 2026-09-24) still serves the v1 design: the Select Resources "+" opens the
 * panel straight away, and the panel has a `Dummy Resource` No/Yes switch. v2 replaces that with
 * a "+" menu (`Add Resource` / `Add Dummy Resource`) and removes the switch. The v2 tests are
 * tagged `@upcoming` and parked by `upcoming()`; `pnpm test:upcoming` runs them on a new build.
 *
 * Tagged `@PSD-dummy-resources`; no workbook `@TC:` ids exist for this scope.
 */

const WO = plannedScenario();

test.beforeEach(async ({ workOrdersPage }) => {
  await workOrdersPage.openCreateForm('planned');
  await workOrdersPage.selectFromDropdown(['Farm*'], WO.farm);
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], WO.task);
  // Select Resources refuses to open without a plot. `openPlotPicker` waits for the plot fetch
  // itself, which on a slow QA outlasts `addFirstFromModal`'s 5s row wait.
  const picker = await workOrdersPage.openPlotPicker();
  await expect(picker.rows.first()).toBeVisible({ timeout: 30000 });
  await workOrdersPage.addPlotsFromPicker(picker, 1);
});

test('@PSD-dummy-resources DR-01 a dummy resource on the form takes a No Of Resource headcount', async ({
  workOrdersPage,
}) => {
  const name = await workOrdersPage.addFirstDummyResource();

  const grid = workOrdersPage.sectionTable('Select Resources');
  await expect(grid.getByRole('columnheader', { name: 'No Of Resource' })).toHaveCount(1);
  const row = grid.locator('tbody tr').filter({ hasText: name });
  await expect(row).toHaveCount(1);
  const headcount = row.locator('input[type="number"]');
  await expect(headcount).toBeEditable();
  await headcount.fill('3');
  await expect(headcount).toHaveValue('3');
});

test.describe('v2 selection flow (@upcoming)', () => {
  // Figures 1-2: the "+" menu, the per-register pages and the chip. QA serves v1 (FINDINGS #34).
  upcoming('Dummy Resources v2 "+" menu and Add Resource / Add Dummy Resource pages');

  test('@PSD-dummy-resources @upcoming DR-02 the Select Resources "+" offers Add Resource and Add Dummy Resource', async ({
    workOrdersPage,
  }) => {
    await workOrdersPage.waitForLoaderGone();
    await workOrdersPage.addResourcesButton.click();
    await expect(workOrdersPage.addResourceMenuItem('Add Resource')).toBeVisible();
    await expect(workOrdersPage.addResourceMenuItem('Add Dummy Resource')).toBeVisible();
  });

  test('@PSD-dummy-resources @upcoming DR-03 Add Dummy Resource opens the dummy register with no Dummy Resource toggle', async ({
    page,
    workOrdersPage,
  }) => {
    await workOrdersPage.waitForLoaderGone();
    await workOrdersPage.addResourcesButton.click();
    // Fail fast on a v1 build, where the menu never appears, rather than at the test timeout.
    await expect(workOrdersPage.addResourceMenuItem('Add Dummy Resource')).toBeVisible({ timeout: 10000 });
    await workOrdersPage.addResourceMenuItem('Add Dummy Resource').click();

    // Figure 2: the title states the mode; the three filters stay; the switch is gone.
    const heading = page.getByRole('heading', { name: /^Add Dummy Resource/, level: 2 });
    await expect(heading).toBeVisible();
    await workOrdersPage.waitForLoaderGone();
    const panel = page.locator('.side-panel').filter({ has: heading });
    await expect(panel.getByText('Resource Group', { exact: true })).toBeVisible();
    await expect(panel.getByPlaceholder('Search by Resource Name')).toBeVisible();
    await expect(panel.getByPlaceholder('Search by Company Name')).toBeVisible();
    await expect(workOrdersPage.dummyResourceSwitch).toHaveCount(0);

    const rows = panel.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
    await expect(rows.first()).toBeVisible();
    for (const text of await rows.allInnerTexts()) expect(text).toMatch(/dummy resource/i);
  });

  test('@PSD-dummy-resources @upcoming DR-04 Add Resource lists named resources only', async ({
    page,
    workOrdersPage,
  }) => {
    await workOrdersPage.waitForLoaderGone();
    await workOrdersPage.addResourcesButton.click();
    // Fail fast on a v1 build, where the menu never appears, rather than at the test timeout.
    await expect(workOrdersPage.addResourceMenuItem('Add Resource')).toBeVisible({ timeout: 10000 });
    await workOrdersPage.addResourceMenuItem('Add Resource').click();

    const heading = page.getByRole('heading', { name: /^Add Resource\b/, level: 2 });
    await expect(heading).toBeVisible();
    await workOrdersPage.waitForLoaderGone();
    const panel = page.locator('.side-panel').filter({ has: heading });
    await expect(workOrdersPage.dummyResourceSwitch).toHaveCount(0);
    const rows = panel.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
    await expect(rows.first()).toBeVisible();
    for (const text of await rows.allInnerTexts()) expect(text).not.toMatch(/dummy resource/i);
  });

  test('@PSD-dummy-resources @upcoming DR-05 a dummy resource row carries the Dummy Resource chip and the headcount notice', async ({
    page,
    workOrdersPage,
  }) => {
    const name = await workOrdersPage.addFirstDummyResource();
    const grid = workOrdersPage.sectionTable('Select Resources');
    // Figure 1: yellow chip beside the name, and a notice under the grid.
    await expect(grid.locator('tbody tr').filter({ hasText: name })).toContainText(/dummy resource/i);
    await expect(
      page.getByText(/Dummy resources stand in for unnamed labour and carry a headcount/i),
    ).toBeVisible();
  });
});

test('@PSD-dummy-resources @mutating DR-06 a dummy resource without a headcount blocks Submit', async ({
  page,
  workOrdersPage,
}) => {
  // Validation Rules → Mandatory Fields: no save while No. of Resources is empty or 0.
  // @mutating because a build missing this rule SAVES the work order (no teardown).
  test.setTimeout(240000);
  const name = await workOrdersPage.addFirstDummyResource();
  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(WO.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], WO.priority);
  const row = workOrdersPage.sectionTable('Select Resources').locator('tbody tr').filter({ hasText: name });
  await row.locator('input[type="number"]').fill('0');
  if (WO.supervisor) await workOrdersPage.selectFromDropdown(['Supervisor*'], WO.supervisor);

  await workOrdersPage.waitForLoaderGone();
  await workOrdersPage.waitForToastsGone();
  const submit = page.getByRole('button', { name: 'Submit' });
  if (await submit.isEnabled()) {
    await submit.click();
    const confirm = page.getByRole('dialog');
    if (await confirm.getByRole('button', { name: 'Save', exact: true }).isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirm.getByRole('button', { name: 'Save', exact: true }).click();
    }
  }
  // A negative assertion would pass at once; wait out the save window instead.
  const saved = await page
    .getByText(savedToast(WO.name))
    .waitFor({ timeout: 20000 })
    .then(() => true, () => false);
  expect(saved, `"${WO.name}" was saved with a 0 headcount; delete it with pnpm wo:delete`).toBe(false);
});

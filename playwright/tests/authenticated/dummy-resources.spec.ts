import { test, expect } from '../fixtures';
import { plannedScenario } from '../helpers/workOrderScenarios';

/**
 * Dummy Resources — Product Specifications Document v2.0 (Sep 16, 2026),
 * `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf`.
 * Plan: `test-plans/authenticated/dummy-resources.md` (case ids DR-xx, PSD section per case).
 *
 * Web half only. Shifts, Start/Resume Job, headcount × standard hours, machine binding and the
 * shift audit trail are Farm Mobile App flows — listed as manual cases in the plan.
 *
 * v2 was released on QA on 2026-09-30: the Select Resources "+" opens a menu (`Add Resource` /
 * `Add Dummy Resource`), the v1 switch is gone, and panels are headed `Select Resources` /
 * `Dummy Resource`. Tests hit by a known QA bug assert the CORRECT behaviour and carry
 * `test.fail()` with the FINDINGS number; drop it once the bug is fixed.
 *
 * Everything here is read-only: the form is never submitted. The No. of Resources is not a web
 * field (Figure 1, Manager journey steps 6-8); its mandatory rule is enforced when a shift starts and
 * is checked through the API in `dummy-shifts-api.spec.ts` (DRM-04).
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

/** Codes of the dummy register (FINDINGS #34); the named register must never list one. */
const DUMMY_CODE = /\(DM\d+\)/;

test('@PSD-dummy-resources DR-01 a dummy resource on the web form takes no quantity (entered on mobile at Start Job)', async ({
  workOrdersPage,
}) => {
  // Figure 1 mock and the Manager journey (steps 3-8): the web only selects dummy resources; the
  // No. of Resources is entered on the mobile app when the job starts (Figure 9). FINDINGS #47 (withdrawn).
  const name = await workOrdersPage.addFirstDummyResource();

  const grid = workOrdersPage.sectionTable('Select Resources');
  const row = grid.locator('tbody tr').filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(grid.getByRole('columnheader', { name: /No\.? ?Of Resource/i })).toHaveCount(0);
  await expect(row.locator('input[type="number"]')).toHaveCount(0);
});

test('@PSD-dummy-resources DR-02 the Select Resources "+" offers Add Resource and Add Dummy Resource', async ({
  workOrdersPage,
}) => {
  await workOrdersPage.waitForLoaderGone();
  await workOrdersPage.addResourcesButton.click();
  await expect(workOrdersPage.addResourceMenuItem('Add Resource')).toBeVisible();
  await expect(workOrdersPage.addResourceMenuItem('Add Dummy Resource')).toBeVisible();
});

test('@PSD-dummy-resources DR-03 Add Dummy Resource opens the dummy register with no Dummy Resource toggle', async ({
  workOrdersPage,
}) => {
  const dummy = await workOrdersPage.openResourceRegister('Add Dummy Resource');

  // Figure 2: the three filters stay; the switch is gone; only the dummy register is listed.
  await expect(dummy.panel.getByText('Resource Group', { exact: true })).toBeVisible();
  await expect(dummy.panel.getByPlaceholder('Search By Resource Name')).toBeVisible();
  await expect(dummy.panel.getByPlaceholder('Search By Company Name')).toBeVisible();
  await expect(workOrdersPage.dummyResourceSwitch).toHaveCount(0);
  const names = await dummy.rows.locator('td:nth-child(2)').allInnerTexts();
  expect(names.some((n) => DUMMY_CODE.test(n)), names.join(', ')).toBe(true);
  expect(names.join(', ')).not.toMatch(/Agrierp 01 \(01\)/);
});

test('@PSD-dummy-resources DR-04 Add Resource lists named resources only', async ({ workOrdersPage }) => {
  const named = await workOrdersPage.openResourceRegister('Add Resource');

  await expect(workOrdersPage.dummyResourceSwitch).toHaveCount(0);
  const names = await named.rows.locator('td:nth-child(2)').allInnerTexts();
  expect(names.filter((n) => DUMMY_CODE.test(n))).toEqual([]);
});

test('@PSD-dummy-resources DR-05 a dummy resource row on the form carries the Dummy Resource chip', async ({
  workOrdersPage,
}) => {
  const name = await workOrdersPage.addFirstDummyResource();
  const row = workOrdersPage.sectionTable('Select Resources').locator('tbody tr').filter({ hasText: name });
  // Figure 1: yellow chip beside the name (`.badge-warning`, title "Dummy Resource").
  const chip = row.locator('.badge[title="Dummy Resource"]');
  await expect(chip).toHaveText(/dummy resource/i);
  await expect(chip).toHaveClass(/badge-warning/);
});

test('@PSD-dummy-resources DR-19 the Select Resources section shows the dummy resource headcount notice', async ({
  page,
  workOrdersPage,
}) => {
  test.fail(true, 'Known QA bug (FINDINGS #49): the Figure 1 notice is not rendered');
  await workOrdersPage.addFirstDummyResource();
  await expect(page.getByText(/Dummy resources stand in for unnamed labour and carry a headcount/i)).toBeVisible({
    timeout: 5000,
  });
});

test('@PSD-dummy-resources DR-12 Search By Resource Name filters the dummy register', async ({ workOrdersPage }) => {
  const dummy = await workOrdersPage.openResourceRegister('Add Dummy Resource');
  await dummy.panel.getByPlaceholder('Search By Resource Name').fill('Irrigator');
  await dummy.panel.getByRole('button', { name: 'Apply' }).click();

  await expect(dummy.footer).toContainText('of 2 records');
  const names = await dummy.rows.locator('td:nth-child(2)').allInnerTexts();
  for (const n of names) expect(n).toMatch(/Irrigator/);
  await expect(dummy.heading).toBeVisible();
});

test('@PSD-dummy-resources DR-14 Reset clears the filters and keeps the dummy register', async ({
  workOrdersPage,
}) => {
  test.fail(true, 'Known QA bug (FINDINGS #48): Reset switches the Dummy Resource panel to the named register');
  const dummy = await workOrdersPage.openResourceRegister('Add Dummy Resource');
  const full = (await dummy.footer.innerText()).trim();
  await dummy.panel.getByPlaceholder('Search By Resource Name').fill('Irrigator');
  await dummy.panel.getByRole('button', { name: 'Apply' }).click();
  await expect(dummy.footer).toContainText('of 2 records');

  await dummy.panel.getByRole('button', { name: 'Reset' }).click();
  await workOrdersPage.waitForLoaderGone();
  // Solution Overview: the register is chosen before the page opens and cannot switch halfway.
  await expect(dummy.heading).toBeVisible({ timeout: 5000 });
  await expect(dummy.panel.getByPlaceholder('Search By Resource Name')).toHaveValue('');
  await expect(dummy.footer).toHaveText(full);
});

test('@PSD-dummy-resources DR-15 several dummy resources ticked in one pass are all added', async ({
  workOrdersPage,
}) => {
  const names = await workOrdersPage.addFromRegister(await workOrdersPage.openResourceRegister('Add Dummy Resource'), 2);

  const grid = workOrdersPage.sectionTable('Select Resources');
  for (const name of names) {
    await expect(grid.locator('tbody tr').filter({ hasText: name }).locator('.badge[title="Dummy Resource"]')).toHaveCount(1);
  }
});

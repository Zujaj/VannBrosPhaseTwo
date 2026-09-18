import { test, expect } from '../fixtures';
import { savedToast } from '../pages/work-orders.page';
import { tankMixScenario } from '../helpers/workOrderScenarios';

/**
 * Work Orders — Tank Mix WO authoring.
 * Plan: test-plans/authenticated/work-orders-tank-mix.md
 * Source of truth: vannbrosphasetwo-knowledge work-orders-tank-mix.md + live QA form.
 *
 * A Tank Mix WO is the same Create form as Planned, with the "Enable Tank Mixing" toggle ON.
 * On this form Task Type* and Inspection Templates* are DISABLED. The real flow is template
 * driven, not manual:
 *   1. Pick Task* (templates are bound to a Task).
 *   2. Pick a Material Template → confirm the "apply material template?" alert with Yes.
 *   3. The Select Materials grid auto-populates (Material / Rate / Unit / Mix Method / Per)
 *      WITH the per-material application details — so no manual material entry and no
 *      "Application detail is mandatory" blocker.
 * The toggle gate itself is covered by WO-PLAN-004 in work-orders-planned.spec.ts.
 */

// Locator for the Select Materials grid's first row (tank-mix mode has a "Mix Method" column).
const materialsGridFirstRow = (page: import('@playwright/test').Page) =>
  page
    .locator('table')
    .filter({ has: page.getByRole('columnheader', { name: 'Mix Method' }) })
    .locator('tbody tr')
    .first();

/**
 * WO-TANK-001 (TC-1) — happy path: create + submit a Tank Mix WO. @mutating
 *
 * Template-driven: Task* → first Material Template → Yes auto-fills the materials grid, then
 * the shared plot/resources/assets flow. MUTATES the shared QA env.
 *
 * Data-agnostic: if the active Site/Season has no tank-mix Material Template for the Task,
 * `applyFirstMaterialTemplate` returns null and the test skips (materials can't be populated
 * without one). Provision a tank-mix template for the Task to exercise the full submit.
 */
test('@mutating @TC-partial:WP-049 @TC-partial:WP-028 creates and submits a Tank Mix work order end to end', async ({ page, workOrdersPage }) => {
  test.setTimeout(240000); // full create flow; clicks retry past the truck loader on a slow shared QA env (see clickPastLoader)
  const wo = tankMixScenario();

  await workOrdersPage.openCreateForm('tank-mix');

  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);

  // Task* FIRST (templates bind to it; Task Type* + Inspection Templates* are disabled).
  // Selecting a Task RESETS the Enable Tank Mixing toggle OFF, so the toggle must come AFTER.
  // The field renders under either label ("Task*" or "Operation*" — same dropdown, same
  // value); pass both so the helper matches whichever the live form shows.
  await workOrdersPage.selectFromDropdown(['Task*', 'Operation*'], wo.task);

  // Enable tank mixing → Materials grid gains Mix Method / Per / Unit columns + template path.
  await page.getByText('Enable Tank Mixing', { exact: true }).click();
  await expect(page.getByText('Mix Method', { exact: true })).toBeVisible();

  // Applying the template auto-fills the Select Materials grid — no manual material entry.
  const template = await workOrdersPage.applyFirstMaterialTemplate();
  test.skip(
    !template,
    `No tank-mix Material Template for "${wo.task}" in the active Site/Season (QA data) — cannot populate materials.`,
  );
  await expect(materialsGridFirstRow(page)).toBeVisible();

  // The plot section's trigger is titled "Add Plot" (live-verified 2026-08-26; formerly
  // "Add Block") and opens the same "Select Plots" checkbox-grid modal as before — the inline
  // "Task Date Range" filter next to it is unrelated and must NOT be touched (see JSDoc on
  // addFirstFromModal). Both titles are passed: under concurrent load the shared QA env has
  // been observed to intermittently still serve the older "Add Block" variant of this section.
  await workOrdersPage.addFirstFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/);
  await workOrdersPage.addFirstFromModal('Add Resources', /Select Resources/);
  await workOrdersPage.addFirstFromModal('Add Asset', /Select Assets/);

  await workOrdersPage.selectFromDropdown(['Supervisor*'], wo.supervisor!); // last — re-render wipes earlier pick

  await workOrdersPage.submitAndConfirm();
  await expect(page.getByText(savedToast(wo.name))).toBeVisible();
});

/**
 * WO-TANK-002 (TC-2) — Material Template auto-fetch (5A path). Non-mutating.
 *
 * Task* → first Material Template → Yes should auto-populate the Select Materials grid.
 * Skips when the active Site/Season has no tank-mix template for the Task (QA data state).
 */
test('@TC-partial:WP-028 auto-fetches tank-mix materials from a Material Template', async ({ page, workOrdersPage }) => {
  const wo = tankMixScenario();

  await workOrdersPage.openCreateForm('tank-mix');

  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  // Task FIRST — selecting it resets the toggle, so Enable Tank Mixing must come after.
  // Renders under either label ("Task*" or "Operation*" — same dropdown); pass both.
  await workOrdersPage.selectFromDropdown(['Task*', 'Operation*'], wo.task);
  await page.getByText('Enable Tank Mixing', { exact: true }).click();

  const template = await workOrdersPage.applyFirstMaterialTemplate();
  test.skip(
    !template,
    `No tank-mix Material Template for "${wo.task}" in the active Site/Season (QA data).`,
  );

  // Materials auto-fetch into the grid: expect at least one populated row.
  await expect(materialsGridFirstRow(page)).toBeVisible();
});

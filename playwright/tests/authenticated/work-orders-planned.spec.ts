import { test, expect } from '../fixtures';
import { savedToast } from '../pages/work-orders.page';
import { plannedBulkScenario, plannedScenario } from '../helpers/workOrderScenarios';

/**
 * Work Orders — Planned WO authoring.
 * Plan: test-plans/authenticated/work-orders-planned.md
 * Source of truth: vannbrosphasetwo-knowledge work-orders-planned.md + live QA form.
 *
 * Most specs here are NON-MUTATING (no Submit/Save) — they assert form state only.
 * The exceptions are WO-PLAN-001 (TC-1, "happy path: create + submit") and WO-PLAN-007
 * (TC-7, the 30-plot bulk WO), which DO submit and create a real Work Order row in the
 * shared QA env each run (e.g. WO-640 on TC-1's first verified run). Both are tagged
 * @mutating so they can be excluded with `--grep-invert @mutating` when a clean QA env
 * is required.
 *
 * Form mechanics live on the `workOrdersPage` fixture (../fixtures.ts →
 * ../pages/work-orders.page.ts).
 */

/**
 * WO-PLAN-001 (TC-1 steps 1-2 only).
 * Opens the Create form and verifies form identity (title + Planned chip + Submit).
 * Does NOT fill or submit.
 */
test('@TC-partial:WP-016 opens the Create New Work Order form with the Planned chip', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('planned');

  // Confirm the authoring form is actually mounted (not just the list behind it).
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});

/**
 * WO-PLAN-003 (TC-3) — required-field validation (negative).
 * On a fresh Create form with all required `*` fields empty, Submit is disabled,
 * so submission is blocked and no row can be created. Non-mutating.
 */
test('@TC-partial:WP-018 blocks submit while required fields are empty', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('planned');

  // Submit is rendered but disabled until required fields are satisfied.
  await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
});

/**
 * WO-PLAN-004 (TC-4) — tank-mixing gating (edge/regression).
 * The Planned form's tank-mix parameters (Mix Method / Per / Unit) are gated behind
 * the "Enable Tank Mixing" toggle: hidden by default, shown once enabled. Confirms the
 * gate documented in work-orders.md without depending on tenant task data. Non-mutating.
 */
test('@TC-partial:WP-029 gates tank-mix parameters behind the Enable Tank Mixing toggle', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('planned');

  const mixMethod = page.getByText('Mix Method', { exact: true });
  const per = page.getByText('Per', { exact: true });
  const unit = page.getByText('Unit', { exact: true });
  const usageUnit = page.getByText('Usage Unit', { exact: true });

  // Default (toggle OFF): standard Materials grid — Rate + Usage Unit, no tank-mix params.
  // The Materials grid paints a beat after the form itself, so these two carry their own
  // budget rather than the 5s default; the absence checks below are safe only once the grid
  // that WOULD hold those columns is on screen.
  await expect(page.getByText('Rate', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(usageUnit).toBeVisible({ timeout: 20000 });
  await expect(mixMethod).toHaveCount(0);
  await expect(per).toHaveCount(0);
  await expect(unit).toHaveCount(0);

  // Enable Tank Mixing → tank-mix params surface, plain Usage Unit is replaced.
  await page.getByText('Enable Tank Mixing', { exact: true }).click();

  await expect(mixMethod).toBeVisible();
  await expect(per).toBeVisible();
  await expect(unit).toBeVisible();
  await expect(usageUnit).toHaveCount(0);
});

/**
 * WO-PLAN-001 (TC-1) — happy path: create + submit a Planned Work Order. @mutating
 *
 * Fills every required field through the real custom dropdowns and the four section
 * "+" modals (plot/material/resource/asset), then submits. Asserts the success toast
 * `Work Order WO-XXXXX | <name> Saved Successfully` — confirming a row was created.
 *
 * Tenant-coupled data (Vann Brothers / VBS, verified live 2026-06-10) comes from
 * `plannedScenario()` (tests/helpers/workOrderScenarios.ts), which reads farm/task/supervisor
 * labels straight out of the `fixtures/*.json` snapshots — Operation "Fertilization (1240)" is
 * a non-tank-mix op with selectable plots ("Almond Preparartion" has none this season).
 * The first available row is taken in each selection modal.
 *
 * MUTATES the shared QA env: every run creates a real WO. WO Start/End dates default
 * to a valid current window, so they are left untouched.
 */
test('@mutating @TC-partial:WP-049 @TC-partial:WP-038 @TC-partial:WP-046 creates and submits a Planned work order end to end', async ({ page, workOrdersPage }) => {
  test.setTimeout(240000); // full create flow; clicks retry past the truck loader on a slow shared QA env (see clickPastLoader)
  const wo = plannedScenario();

  await workOrdersPage.openCreateForm('planned');

  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  // The operation field renders under either label ("Operation*" or "Task*" — same dropdown,
  // same value); pass both so the helper matches whichever the live form shows.
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], wo.task);

  // Section "+" triggers are inert until Farm + Operation are set; they enable now.
  // The plot section's trigger is titled "Add Plot" (live-verified 2026-08-26; formerly
  // "Add Block") and opens the same "Select Plots" checkbox-grid modal as before — the inline
  // "Task Date Range" filter next to it is unrelated and must NOT be touched (see JSDoc on
  // addFirstFromModal). Both titles are passed: under concurrent load the shared QA env has
  // been observed to intermittently still serve the older "Add Block" variant of this section.
  await workOrdersPage.addFirstFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/);

  await workOrdersPage.addFirstFromModal('Add Material', /Select Materials/);
  // Rate is applied per acre; set the first material's Rate to the TC-1 value of 2.
  await page.locator('input[type="number"]').last().fill('2');

  await workOrdersPage.addFirstFromModal('Add Resources', /Select Resources/);
  await workOrdersPage.addFirstFromModal('Add Asset', /Select Assets/);

  // Supervisor is selected LAST: the section saves re-render the form and wipe an
  // earlier Supervisor pick, which would leave Submit disabled.
  await workOrdersPage.selectFromDropdown(['Supervisor*'], wo.supervisor!);

  await workOrdersPage.submitAndConfirm();

  // Success toast carries the new WO sequence number and the name (live wording is
  // title-case "Saved Successfully").
  await expect(page.getByText(savedToast(wo.name))).toBeVisible();
});

/**
 * WO-PLAN-007 (TC-7) — bulk Planned WO: 30 plots, several resources and assets. @mutating
 *
 * Covers the 30-plot tier of WP-093 ("creation response time scales acceptably") and the section
 * grids it fills. Same form path as WO-PLAN-001; only the selection sizes differ. `addFromModal`
 * ticks N rows per panel — live-verified 2026-09-11: Select Plots is one unpaged list (99 plots
 * for this farm + task), Select Resources / Select Assets page at 50 rows.
 *
 * WP-093 gives no thresholds, so the save time is recorded as an annotation, not asserted; only
 * "completes without timeout" is enforced. Implements (WP-046) are not asserted: neither the
 * Select Assets panel nor the form grid shows any.
 *
 * MUTATES the shared QA env: every run creates a real 30-plot WO.
 */
test('@mutating @TC-partial:WP-093 @TC:WP-033 @TC:WP-043 @TC-partial:WP-046 @TC-partial:WP-049 creates and submits a Planned work order with 30 plots, resources and assets', async ({ page, workOrdersPage }) => {
  test.setTimeout(360000); // four section panels plus a 30-plot save on a slow shared QA env
  const wo = plannedBulkScenario();

  await workOrdersPage.openCreateForm('planned');

  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], wo.task);

  // WP-033: every ticked plot lands in the grid and the footer counter matches. The counter's noun
  // follows the build the shared QA host serves (FINDINGS §2): "30 Total Plots" on the Plot build,
  // "30 Total Fields" on the Block build — both seen on 2026-09-11, minutes apart.
  await workOrdersPage.addFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/, wo.plots);
  await expect(workOrdersPage.sectionTable(['Select Plot', 'Select Block']).locator('tbody tr')).toHaveCount(wo.plots);
  await expect(page.getByText(new RegExp(`^${wo.plots} Total (Plots|Fields)$`))).toBeVisible();

  await workOrdersPage.addFirstFromModal('Add Material', /Select Materials/);
  // Each plot row carries its own number input, so scope Rate to the Materials grid instead of
  // taking the page's last number input.
  await workOrdersPage.sectionTable('Select Materials').locator('input[type="number"]').first().fill('2');

  // WP-043: resources arrive with their documented columns.
  await workOrdersPage.addFromModal('Add Resources', /Select Resources/, wo.resources);
  const resources = workOrdersPage.sectionTable('Select Resources');
  await expect(resources.locator('tbody tr')).toHaveCount(wo.resources);
  await expect(resources.locator('thead th')).toContainText(['Resource Name', 'Resource Type', 'Company Name', 'No Of Resource']);

  // WP-046 (partial): assets arrive with their documented columns.
  await workOrdersPage.addFromModal('Add Asset', /Select Assets/, wo.assets);
  const assets = workOrdersPage.sectionTable('Select Assets');
  await expect(assets.locator('tbody tr')).toHaveCount(wo.assets);
  await expect(assets.locator('thead th')).toContainText(['Asset Name', 'Asset Type', 'Resource Group', 'No Of Resource']);

  // Supervisor is selected LAST: the section saves re-render the form and wipe an
  // earlier Supervisor pick, which would leave Submit disabled.
  await workOrdersPage.selectFromDropdown(['Supervisor*'], wo.supervisor!);

  await workOrdersPage.submitAndConfirm();
  const savedAt = Date.now();
  // WP-093: the 30-plot save must complete without timing out; the wait is widened past the
  // default because this payload's save time is what the case measures.
  await expect(page.getByText(savedToast(wo.name))).toBeVisible({ timeout: 120000 });
  test.info().annotations.push({
    type: 'WP-093 save time',
    description: `${wo.plots} plots: ${Date.now() - savedAt} ms (confirm-dialog Save to success toast)`,
  });
});

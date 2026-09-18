import { test, expect } from '../fixtures';
import { savedToast } from '../pages/work-orders.page';
import { inspectionScenario } from '../helpers/workOrderScenarios';

/**
 * Work Orders — Inspection WO authoring.
 * Plan: test-plans/authenticated/work-orders-inspection.md
 * Source of truth: vannbrosphasetwo-knowledge work-orders-inspection.md + live QA form.
 *
 * Inspection WOs are entered via the "Inspection Work Orders" sub-tab, require an
 * Inspection Template, and use plot + resources only (no materials/assets/tank-mix).
 *
 * All specs here are active, including the happy path (@mutating): the tenant Inspection
 * Template name and the sub-tab/add-icon selectors have been confirmed via a live verify run.
 */

/**
 * Opening the Inspection Create form routes through the "Inspection Work Orders" sub-tab — an
 * extra list fetch behind the truck loader on top of the normal navigate-and-open (shared with
 * the Harvest flow via WorkOrdersPage.openCreateForm). On the shared QA env that does not
 * reliably fit Playwright's 30s default under parallel load, so raise the budget for the file
 * rather than leaning on retries to paper over it.
 */
test.describe.configure({ timeout: 90_000 });

/**
 * WO-INSP-002 (TC-2) — the Inspection Work Orders sub-tab opens the Create form.
 * Non-mutating.
 */
test('@TC-partial:WI-004 opens the Inspection Create New Work Order form', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('inspection');

  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
});

/**
 * WO-INSP-003 (TC-3) — Inspection Template required (negative).
 * On a fresh Inspection form, Submit is disabled and the inspection-specific
 * "Inspection Template" required field is present. Non-mutating.
 */
test('@TC-partial:WI-008 requires Inspection Template and blocks submit when empty', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('inspection');

  await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
  // Inspection-specific required field — distinguishes this form from Planned.
  await expect(page.getByText(/Inspection Template/i).first()).toBeVisible();
});

/**
 * WO-INSP-001 (TC-1) — happy path: create + submit an Inspection WO. @mutating
 *
 * Plot + resources only — no materials/assets/tank-mix. MUTATES the shared QA env once
 * un-fixmed.
 */
test('@mutating @TC-partial:WI-004 @TC-partial:WI-011 @TC-partial:WI-009 creates and submits an Inspection work order end to end', async ({ page, workOrdersPage }) => {
  test.setTimeout(240000); // full create flow; clicks retry past the truck loader on a slow shared QA env (see clickPastLoader)
  const wo = inspectionScenario();

  await workOrdersPage.openCreateForm('inspection');

  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  // The operation field renders under either label ("Operation*" or "Task*" — same dropdown,
  // same value); pass both so the helper matches whichever the live form shows.
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], wo.task);
  await workOrdersPage.selectFromDropdown(['Inspection Templates*', 'Inspection Template*'], wo.inspectionTemplate!);

  // The plot section's trigger is titled "Add Plot" (live-verified 2026-08-26; formerly
  // "Add Block") and opens the same "Select Plots" checkbox-grid modal as before — the inline
  // "Task Date Range" filter next to it is unrelated and must NOT be touched (see JSDoc on
  // addFirstFromModal). Both titles are passed: under concurrent load the shared QA env has
  // been observed to intermittently still serve the older "Add Block" variant of this section.
  await workOrdersPage.addFirstFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/);
  await workOrdersPage.addFirstFromModal('Add Resources', /Select Resources/);

  // No Supervisor pick: on the Inspection form Task Type / Supervisor / Responsible are
  // disabled by design (pre-set), unlike the Planned form. Submit without touching them.

  await workOrdersPage.submitAndConfirm();
  await expect(page.getByText(savedToast(wo.name))).toBeVisible();
});

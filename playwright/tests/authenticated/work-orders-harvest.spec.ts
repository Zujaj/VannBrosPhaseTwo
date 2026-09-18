import { test, expect } from '../fixtures';
import { savedToast } from '../pages/work-orders.page';
import { harvestScenario } from '../helpers/workOrderScenarios';
import { testData } from '../helpers/testData';

/**
 * Work Orders — Harvest WO authoring.
 * Plan: test-plans/authenticated/work-orders-harvest.md
 * Source of truth: vannbrosphasetwo-knowledge work-orders-harvest.md + live QA form (2026-08-27).
 *
 * Harvest WOs are entered via the "Harvest Work Orders" sub-tab. The form is the Planned
 * form MINUS the Materials section and the Enable Tank Mixing toggle, with Task* scoped to
 * the five harvest operations — that scoping, not the (still green "Planned") chip, is what
 * makes the WO a harvest WO.
 */

/**
 * Opening the Harvest Create form costs an extra sub-tab hop — a second list fetch behind the
 * truck loader — on top of the normal navigate-and-open. On the shared QA env that does not
 * reliably fit Playwright's 30s default, so the whole file gets a larger budget rather than
 * each test racing the clock and reporting an unhelpful "Test timeout exceeded".
 */
test.describe.configure({ timeout: 90_000 });

/** The five harvest operations, from the Category=2 metadata snapshot in fixtures/tasks.json. */
const HARVEST_TASKS = testData.tasks.harvest.map((t) => t.label);

/**
 * WO-HARV-003 (TC-3) — the Harvest sub-tab opens the Create form, and that form omits the
 * Materials section and the Enable Tank Mixing toggle. Non-mutating.
 */
test('@TC-partial:WH-003 opens the Harvest Create New Work Order form without materials or tank mixing', async ({
  page,
  workOrdersPage,
}) => {
  await workOrdersPage.openCreateForm('harvest');

  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  // Present on the harvest form. The section blocks mount a beat after the header fields, so
  // the FIRST one gets a longer window — it doubles as the "form is fully rendered" gate.
  //
  // Matches BOTH "Select Plot" and the older "Select Block" wording: under concurrent load the
  // shared QA env intermittently serves an older variant of this section (see the JSDoc on
  // addFirstFromModal, and the `/Select (Blocks|Plots)/` + ['Add Plot','Add Block'] pairs used
  // elsewhere). Asserting only "Select Plot" passes when this file runs alone and fails inside
  // a full parallel `pnpm test` run — which is exactly how it first failed.
  await expect(
    page.getByRole('heading', { name: /^Select (Plot|Block)s?$/, level: 3 }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Select Resources', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Select Assets', level: 3 })).toBeVisible();
  // Absent on the harvest form — both are core to the Planned/Tank Mix forms. The materials
  // check uses a regex for the same wording-variance reason as above: an exact "Select
  // Materials" would report 0 matches, and therefore PASS, against a render that happened to
  // label the section "Select Material" — a false pass on the very thing this asserts.
  await expect(
    page.getByRole('heading', { name: /^Select Materials?$/, level: 3 }),
  ).toHaveCount(0);
  await expect(page.getByText(/Enable Tank Mixing/i)).toHaveCount(0);
});

/**
 * WO-HARV-002 (TC-2) — Task* is scoped to the harvest operations only. Non-mutating.
 *
 * Asserts both directions: every harvest operation is offered, and a known non-harvest one
 * (Fertilization, which the Planned form does offer) is not. Without the negative half the
 * test would still pass if the dropdown fell back to the full operation list.
 */
test('@TC-partial:WH-004 scopes the Task dropdown to the five harvest operations', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('harvest');

  const panel = await workOrdersPage.openDropdown(['Task*', 'Operation*']);

  // The option rows are fetched after the panel opens, so under parallel load an immediate
  // per-label assertion can run against a half-populated list and fail on whichever option
  // had not arrived yet. Wait for the list to be complete before judging its contents.
  await expect
    .poll(
      async () => {
        const text = await panel.innerText();
        return HARVEST_TASKS.every((label) => text.includes(label));
      },
      { timeout: 20000, message: 'harvest task options never finished loading' },
    )
    .toBe(true);

  for (const label of HARVEST_TASKS) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(panel.getByText('Fertilization (1240)', { exact: true })).toHaveCount(0);
});

/**
 * WO-HARV-004 (TC-4) — Task Type* is pre-set to Planned and disabled, while Supervisor stays
 * enabled. This is the split that distinguishes the harvest form from the inspection one,
 * where Task Type / Supervisor / Responsible are ALL disabled. Non-mutating.
 */
test('@TC-partial:WH-004 locks Task Type to Planned but leaves Supervisor selectable', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('harvest');

  await expect(workOrdersPage.dropdownToggle(['Task Type*', 'Operation Type*'])).toBeDisabled();
  // Wait for the control to mount before judging its enabled state: `toBeEnabled` on a
  // not-yet-rendered locator fails outright rather than waiting for the right element, which
  // made this flake on the first attempt of a loaded parallel run.
  const supervisor = workOrdersPage.dropdownToggle(['Supervisor*']);
  await expect(supervisor).toBeVisible({ timeout: 20000 });
  await expect(supervisor).toBeEnabled();
});

/**
 * WO-HARV-005 (TC-5) — required-field gate (negative). On a fresh harvest form both Save As
 * and Submit are disabled. Non-mutating.
 */
test('@TC-partial:WH-004 blocks submit until required fields are filled', async ({ page, workOrdersPage }) => {
  await workOrdersPage.openCreateForm('harvest');

  await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save As' })).toBeDisabled();

  // Name alone is not enough — Farm / Task / Supervisor are still empty.
  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill('Harvest validation probe');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled();
});

/**
 * WO-HARV-001 (TC-1) — happy path: create + submit a Harvest WO. @mutating
 *
 * Plot + resources + assets, no materials. MUTATES the shared QA env: creates a real
 * harvest WO each run. Excluded from clean-env runs with `--grep-invert @mutating`.
 */
test('@mutating @TC-partial:WH-003 creates and submits a Harvest work order end to end', async ({ page, workOrdersPage }) => {
  test.setTimeout(240000); // full create flow; clicks retry past the truck loader on a slow shared QA env
  const wo = harvestScenario();

  await workOrdersPage.openCreateForm('harvest');

  await page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
  await workOrdersPage.selectFromDropdown(['Priority*'], wo.priority);
  await workOrdersPage.selectFromDropdown(['Farm*'], wo.farm);
  await workOrdersPage.selectFromDropdown(['Task*', 'Operation*'], wo.task);

  // Modal-based pickers only — the inline "Task Date Range" / "Select Range" filter beside the
  // plot trigger is broken (min/max stuck at 1900-01-01) and must not be touched.
  await workOrdersPage.addFirstFromModal(['Add Plot', 'Add Block'], /Select (Blocks|Plots)/);
  await workOrdersPage.addFirstFromModal('Add Resources', /Select Resources/);

  // Supervisor LAST: the section saves above re-render the form and wipe an earlier pick,
  // leaving Submit disabled. Required here, unlike on the inspection form.
  await workOrdersPage.selectFromDropdown(['Supervisor*'], wo.supervisor!);

  await workOrdersPage.submitAndConfirm();
  await expect(page.getByText(savedToast(wo.name))).toBeVisible();
});

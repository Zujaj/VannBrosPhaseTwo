import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Material Template smoke rows (TM-01..TM-36), workbook `Material Template` scenario under
 * Template Management. Page object: `tests/pages/material-templates.page.ts` — read its class
 * doc first, it documents a cluster of reproducible app bugs this whole area runs into.
 *
 * ## The headline bug
 *
 * Opening the Create/Edit/Clone wizard fires `GET /api/metadata/MaterialsV2`, which returns
 * 500; the sibling metadata requests are then aborted, so the wizard's pickers (`Operation*`,
 * `Select Product`, `Select Problem`, `Mix Method`, `Rate Unit`, `Application Method`, `Nozzle
 * Type`, `Droplet Size`) render blank or empty, while the SAME widget on the list's
 * `Set Filters → Operation` populates. With no Operation, Save never enables, so **no Material
 * Template can currently be created through the UI.** Edit and Clone also open blank.
 *
 * Tests hit by these bugs assert the CORRECT behaviour and carry `test.fail()` with the bug
 * reason, so the suite stays green while the bug stands and flags "expected to fail, but
 * passed" once it is fixed. Everything unaffected (free-text and numeric fields, buttons, the
 * list, View Detail) is asserted normally.
 *
 * ## Safety
 *
 * No test here clicks a persisting Save. `beforeEach` also aborts every write to the
 * ActivityTemplate API as insurance — the API has no DELETE, so a stray save could not be
 * undone on the shared QA tenant.
 */

test.describe('Material Template', () => {
  test.beforeEach(async ({ page }) => {
    // SAFETY: block every write to ActivityTemplate for the whole file. No non-mutating test
    // here clicks a persisting Save, but this is cheap insurance against a bug fix silently
    // enabling one, or a future edit to this file adding a click without checking the tag.
    await page.route(/\/api\/ActivityTemplate/i, async (route) => {
      const method = route.request().method();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await route.abort('failed');
        return;
      }
      await route.continue();
    });
  });

  // ---------------------------------------------------------------------------------------
  // List: filter / reset / close / refresh (TM-01..TM-05)
  // ---------------------------------------------------------------------------------------

  test('@SMK:TM-01 filtering by Material Template Name narrows the grid to matching rows', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });

    await materialTemplatesPage.filterByName('Fertilization');
    await listPage.waitForGridSettled();

    const names = await listPage.columnValues('Name');
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.trim()).toBe('Fertilization');
    await expect(materialTemplatesPage.filterButton).toHaveText(/Filter\s*\*/);

    // Leave the tenant-wide filter state clean for later specs/users.
    await materialTemplatesPage.resetFilters();
  });

  test('@SMK:TM-02 filtering by Operation narrows the grid to matching rows', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });

    await materialTemplatesPage.filterByOperation('Irrigation');
    await listPage.waitForGridSettled();

    const operations = await listPage.columnValues('Operation');
    expect(operations.length).toBeGreaterThan(0);
    for (const op of operations) expect(op.trim()).toBe('Irrigation');

    await materialTemplatesPage.resetFilters();
  });

  test('@SMK:TM-03 Reset on the filter panel clears the filter and restores the full grid', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
    const total = (await listPage.recordCount())?.total ?? (await listPage.rows.count());

    await materialTemplatesPage.filterByName('Fertilization');
    await listPage.waitForGridSettled();
    expect((await listPage.rows.count())).toBeLessThan(total);

    await materialTemplatesPage.resetFilters();
    await listPage.waitForGridSettled();

    await expect(materialTemplatesPage.filterButton).toHaveText('Filter');
    const after = (await listPage.recordCount())?.total ?? (await listPage.rows.count());
    expect(after).toBe(total);
  });

  test('@SMK:TM-04 Close on the filter panel discards an unapplied filter', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
    const total = (await listPage.recordCount())?.total ?? (await listPage.rows.count());

    const panel = await materialTemplatesPage.openFilters();
    await materialTemplatesPage.materialTemplateNameInput.fill('zzz-should-not-apply');
    await materialTemplatesPage.closeFilters();
    await expect(panel).toBeHidden();

    // Nothing was applied: the grid is unchanged and the Filter button carries no "active" badge.
    await expect(materialTemplatesPage.filterButton).toHaveText('Filter');
    const after = (await listPage.recordCount())?.total ?? (await listPage.rows.count());
    expect(after).toBe(total);
  });

  test('@SMK:TM-05 Refresh reloads the Material Template grid', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
    const before = (await listPage.recordCount())?.total ?? (await listPage.rows.count());

    await materialTemplatesPage.refresh();
    await listPage.waitForGridSettled();

    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
    const after = (await listPage.recordCount())?.total ?? (await listPage.rows.count());
    expect(after).toBe(before);
  });

  // ---------------------------------------------------------------------------------------
  // Create button + Basic Details (TM-06..TM-09)
  // ---------------------------------------------------------------------------------------

  test('@SMK:TM-06 Create New Material Template opens the wizard on Basic Details', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();

    for (const tab of ['Basic Details', 'Material Details', 'Problem Details', 'Application Details'] as const) {
      await expect(materialTemplatesPage.wizardTab(tab)).toBeVisible();
    }
    await expect(page.getByRole('heading', { name: 'Basic Details', level: 3 })).toBeVisible();
    await expect(materialTemplatesPage.wizardSaveButton).toBeDisabled();
  });

  test('@SMK:TM-07 @SMK:TM-09 Basic Details: Material Title and Additional Comments', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();

    // TM-07: Material Title is required (marked with `*`) and accepts free text; typing it
    // mirrors live into the Summary panel's "Title" row.
    await expect(page.getByText('Material Title*', { exact: true })).toBeVisible();
    await materialTemplatesPage.materialTitleInput.fill('SMK-AUTO exploration (not saved)');
    await expect(materialTemplatesPage.materialTitleInput).toHaveValue('SMK-AUTO exploration (not saved)');
    await expect(page.getByText('SMK-AUTO exploration (not saved)')).toBeVisible();

    // TM-08 (the Operation dropdown) lives in the wizard-dropdowns test below.

    // TM-09: Additional Comments is optional (no `*`) and accepts free text.
    await expect(page.getByText('Additional Comments', { exact: true })).toBeVisible();
    await expect(page.getByText('Additional Comments*')).toHaveCount(0);
    await materialTemplatesPage.additionalCommentsInput.fill('exploratory comment, not saved');
    await expect(materialTemplatesPage.additionalCommentsInput).toHaveValue('exploratory comment, not saved');
  });

  // ---------------------------------------------------------------------------------------
  // Material Details (TM-10..TM-16)
  // ---------------------------------------------------------------------------------------

  test('@SMK:TM-12 @SMK-partial:TM-14 @SMK-partial:TM-15 @SMK-partial:TM-16 Material Details fields', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();
    await materialTemplatesPage.switchWizardTab('Material Details');

    // TM-10 / TM-11 / TM-13 (Select Product, Mix Method, Rate Unit) live in the
    // wizard-dropdowns test below.

    // TM-12: Rate is a plain numeric field, unaffected by the dropdown bug — fully verifiable.
    await expect(materialTemplatesPage.rateInput).toHaveValue('0');
    await materialTemplatesPage.rateInput.fill('12');
    await expect(materialTemplatesPage.rateInput).toHaveValue('12');

    // TM-14, partial: Per is present. The knowledge base documents it as disabled until Mix
    // Method is set — unverifiable here since Mix Method can never actually be set.
    await expect(page.getByText('Per', { exact: true })).toBeVisible();

    // TM-15/TM-16, partial: Save & Add New and Delete are present but stay disabled without a
    // selected Product, which (see above) cannot be reached — so only their presence/disabled
    // state is verified, not the add-row / remove-row behaviour they name.
    await expect(materialTemplatesPage.saveAndAddNewButton).toBeVisible();
    await expect(materialTemplatesPage.saveAndAddNewButton).toBeDisabled();
    await expect(materialTemplatesPage.materialDeleteButton).toBeVisible();
    await expect(materialTemplatesPage.materialDeleteButton).toBeDisabled();
  });

  // ---------------------------------------------------------------------------------------
  // Problem Details (TM-17..TM-24)
  // ---------------------------------------------------------------------------------------

  test('@SMK-partial:TM-18 @SMK-partial:TM-19 @SMK:TM-20 @SMK-partial:TM-21 @SMK:TM-22 @SMK-partial:TM-23 @SMK-partial:TM-24 Problem Details fields', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();
    await materialTemplatesPage.switchWizardTab('Problem Details');

    // TM-17 (Select Problem) lives in the wizard-dropdowns test below.

    // TM-18/TM-19, partial: Stage and Severity render their LABEL only — the app conditionally
    // mounts their controls once a Problem is selected, which (see TM-17) can never happen here.
    await expect(page.getByText('Stage', { exact: true })).toBeVisible();
    await expect(page.getByText('Severity', { exact: true })).toBeVisible();

    // TM-20: Infestation is a plain numeric field, unaffected by the dropdown bug.
    await expect(materialTemplatesPage.infestationInput).toBeVisible();
    await materialTemplatesPage.infestationInput.fill('10');
    await expect(materialTemplatesPage.infestationInput).toHaveValue('10');

    // TM-21, partial: Infestation Unit — same conditional-mount gap as Stage/Severity.
    await expect(page.getByText('Infestation Unit', { exact: true })).toBeVisible();

    // TM-22: Description is a plain textbox.
    await expect(materialTemplatesPage.descriptionInput).toBeVisible();
    await materialTemplatesPage.descriptionInput.fill('Aphid infestation, exploratory only');
    await expect(materialTemplatesPage.descriptionInput).toHaveValue('Aphid infestation, exploratory only');

    // TM-23/TM-24, partial: Save and Delete are present but stay disabled without a selected
    // Problem, which cannot be reached — presence/disabled state only.
    await expect(materialTemplatesPage.problemSaveButton).toBeVisible();
    await expect(materialTemplatesPage.problemSaveButton).toBeDisabled();
    await expect(materialTemplatesPage.problemDeleteButton).toBeVisible();
    await expect(materialTemplatesPage.problemDeleteButton).toBeDisabled();
  });

  // ---------------------------------------------------------------------------------------
  // Application Details (TM-25..TM-32)
  // ---------------------------------------------------------------------------------------

  test('@SMK:TM-26 @SMK:TM-27 @SMK:TM-30 @SMK:TM-31 @SMK-partial:TM-32 Application Details fields', async ({
    materialTemplatesPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();
    await materialTemplatesPage.switchWizardTab('Application Details');

    // TM-25 / TM-28 / TM-29 (Application Method, Nozzle Type, Droplet Size) live in the
    // wizard-dropdowns test below.

    // TM-26/TM-27: Total Application Rate and Tank Size are plain required numeric fields.
    // Their accessible names concatenate the unit with no space — "Total Application
    // Rategal/acre*", "Tank SizeGal*" — a label/unit rendering bug, matched with a regex here.
    await expect(materialTemplatesPage.totalApplicationRateInput).toHaveValue('0');
    await materialTemplatesPage.totalApplicationRateInput.fill('70');
    await expect(materialTemplatesPage.totalApplicationRateInput).toHaveValue('70');

    await expect(materialTemplatesPage.tankSizeInput).toHaveValue('0');
    await materialTemplatesPage.tankSizeInput.fill('500');
    await expect(materialTemplatesPage.tankSizeInput).toHaveValue('500');

    // TM-30: Preharvest (PHI) Days — plain optional numeric field.
    await expect(materialTemplatesPage.phiDaysInput).toBeVisible();
    await materialTemplatesPage.phiDaysInput.fill('7');
    await expect(materialTemplatesPage.phiDaysInput).toHaveValue('7');

    // TM-31: Band Percentage for Each Row to Apply — plain numeric field, visible without
    // expanding "Advanced Options" (that section holds other, out-of-scope fields).
    await expect(materialTemplatesPage.bandPercentageInput).toHaveValue('0');
    await materialTemplatesPage.bandPercentageInput.fill('50');
    await expect(materialTemplatesPage.bandPercentageInput).toHaveValue('50');

    // TM-32, partial: the wizard-level Save is present here too (same control asserted from
    // TM-06), but stays disabled for the reason documented throughout this file — its "does it
    // persist" half is untestable via the UI right now.
    await expect(materialTemplatesPage.wizardSaveButton).toBeVisible();
    await expect(materialTemplatesPage.wizardSaveButton).toBeDisabled();
  });

  test('@SMK:TM-33 Close on Application Details discards the wizard without saving', async ({
    page,
    materialTemplatesPage,
    listPage,
  }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();
    await listPage.waitForGridSettled();
    const before = (await listPage.recordCount())?.total ?? (await listPage.rows.count());

    await materialTemplatesPage.openCreateWizard();
    await materialTemplatesPage.materialTitleInput.fill('SMK-AUTO should not persist');
    await materialTemplatesPage.switchWizardTab('Application Details');
    await materialTemplatesPage.totalApplicationRateInput.fill('70');

    await materialTemplatesPage.closeWizard();

    await expect(page).toHaveURL(new RegExp(`${routes.templateMgmt.activityDetails}$`));
    await listPage.waitForGridSettled();
    const after = (await listPage.recordCount())?.total ?? (await listPage.rows.count());
    expect(after).toBe(before);
  });

  // ---------------------------------------------------------------------------------------
  // Edit / Clone / View Detail (TM-34..TM-36)
  // ---------------------------------------------------------------------------------------

  // Edit and Clone assert the CORRECT behaviour (the wizard pre-filled from the source
  // template) and are marked `test.fail()` for the known QA bug: both currently open blank
  // (verified 2026-09-27 on Firefox and Chromium, single click, no request interception).
  // When the bug is fixed Playwright reports "expected to fail, but passed" — drop the
  // `test.fail()` line then.
  test('@SMK-partial:TM-34 Edit opens the wizard pre-filled from an existing template', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.fail(true, 'Known QA bug (SMOKE-NOTES TM-EDIT-CLONE-BLANK): Edit opens a blank form');
    test.setTimeout(90000);
    await materialTemplatesPage.open();

    await materialTemplatesPage.openEdit('Fertilization');

    // Partial: pre-fill is asserted, saving the edit is not (it would overwrite a shared
    // template, and ActivityTemplate has no DELETE to undo a clone).
    await expect(page.getByRole('heading', { name: 'Basic Details', level: 3 })).toBeVisible();
    await expect(materialTemplatesPage.materialTitleInput).toHaveValue('Fertilization', { timeout: 20000 });
  });

  test('@SMK-partial:TM-35 Clone opens the wizard pre-filled from an existing template', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.fail(true, 'Known QA bug (SMOKE-NOTES TM-EDIT-CLONE-BLANK): Clone opens a blank form');
    test.setTimeout(90000);
    await materialTemplatesPage.open();

    await materialTemplatesPage.openClone('Fertilization');

    // The clone's title is derived from the source (exact wording unverified while the bug
    // stands), so assert it names the source rather than an exact string.
    await expect(page.getByRole('heading', { name: 'Basic Details', level: 3 })).toBeVisible();
    await expect(materialTemplatesPage.materialTitleInput).toHaveValue(/Fertilization/, { timeout: 20000 });
  });

  test('@SMK:TM-36 View Detail shows the full saved record', async ({ page, materialTemplatesPage }) => {
    test.setTimeout(90000);
    await materialTemplatesPage.open();

    await materialTemplatesPage.openViewDetail('Fertilization');

    await expect(materialTemplatesPage.detailHeading('Fertilization')).toBeVisible();
    // Label drift, same as the wizard's Basic Details field (see material-templates.page.ts):
    // renders "Task:" on one build and "Operation:" on the other.
    await expect(page.getByText(/^(Task|Operation):/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Problems', level: 4 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Materials', level: 4 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Additional Information', level: 4 })).toBeVisible();
    for (const row of ['Application Method', 'Total Application Rate', 'Tank Size', 'Preharvest (PHI)']) {
      await expect(page.getByText(row, { exact: true })).toBeVisible();
    }
    await expect(materialTemplatesPage.detailEditButton).toBeVisible();
  });

  // ---------------------------------------------------------------------------------------
  // Wizard dropdowns (TM-08, TM-10, TM-11, TM-13, TM-17, TM-25, TM-28, TM-29)
  // ---------------------------------------------------------------------------------------

  /**
   * Every metadata-backed wizard dropdown must offer labelled options. Asserts the CORRECT
   * behaviour and is marked `test.fail()` for the known QA bug: opening the wizard fires
   * `GET /api/metadata/MaterialsV2` which returns 500, and the sibling metadata requests
   * (ParentOperations, applicationmethods, NozzleTypes, ...) are then aborted — so the pickers
   * render blank or empty (verified 2026-09-27 on Firefox and Chromium, single click, no
   * request interception). Soft assertions, so a run lists every dropdown still broken rather
   * than stopping at the first. When the bug is fixed Playwright reports "expected to fail,
   * but passed" — drop the `test.fail()` line then.
   *
   * Partial: options loading is asserted; selecting a value and its downstream effect (e.g.
   * Per enabling after Mix Method) is not, because the source rows still need a Save to prove.
   */
  test('@SMK-partial:TM-08 @SMK-partial:TM-10 @SMK-partial:TM-11 @SMK-partial:TM-13 @SMK-partial:TM-17 @SMK-partial:TM-25 @SMK-partial:TM-28 @SMK-partial:TM-29 wizard dropdowns offer labelled options', async ({
    page,
    materialTemplatesPage,
  }) => {
    test.fail(true, 'Known QA bug (SMOKE-NOTES TM-WIZARD-DROPDOWNS): wizard metadata dropdowns are empty');
    test.setTimeout(180000);
    await materialTemplatesPage.open();
    await materialTemplatesPage.openCreateWizard();

    const soft = expect.configure({ soft: true });
    const checkOptions = async (name: string, toggle: typeof materialTemplatesPage.taskDropdownToggle) => {
      await toggle.click();
      const menu = page.locator('.dropdown.show');
      await expect(menu).toBeVisible();
      await soft
        .poll(
          async () => (await menu.locator('a.dropdown-item').allInnerTexts()).filter((t) => t.trim()).length,
          { message: `${name} offers no labelled option`, timeout: 15000 },
        )
        .toBeGreaterThan(0);
      await page.keyboard.press('Escape');
    };

    await checkOptions('Operation (TM-08)', materialTemplatesPage.taskDropdownToggle);

    await materialTemplatesPage.switchWizardTab('Material Details');
    await checkOptions('Select Product (TM-10)', materialTemplatesPage.selectProductToggle);
    await checkOptions('Mix Method (TM-11)', materialTemplatesPage.mixMethodToggle);
    await checkOptions('Rate Unit (TM-13)', materialTemplatesPage.rateUnitToggle);

    await materialTemplatesPage.switchWizardTab('Problem Details');
    await checkOptions('Select Problem (TM-17)', materialTemplatesPage.selectProblemToggle);

    await materialTemplatesPage.switchWizardTab('Application Details');
    await checkOptions('Application Method (TM-25)', materialTemplatesPage.applicationMethodToggle);
    await checkOptions('Nozzle Type (TM-28)', materialTemplatesPage.nozzleTypeToggle);
    await checkOptions('Droplet Size (TM-29)', materialTemplatesPage.dropletSizeToggle);
  });

  // Not automated: saving a new, edited or cloned template (the persisting half of TM-15,
  // TM-23, TM-32, TM-34, TM-35). Create cannot reach an enabled Save while the metadata bug
  // stands, and ActivityTemplate has no DELETE, so every run would leave records on the shared
  // tenant. Write it as a `@mutating` flow once the bug is fixed and a cleanup path exists.
});

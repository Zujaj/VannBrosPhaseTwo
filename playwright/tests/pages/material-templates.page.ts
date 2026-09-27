import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Material Template (`Template Management → Material Template` tile, `/template-mgmt/activity-details`).
 *
 * The list is the shared `app-f3-table` grid (use the `listPage` fixture for its mechanics —
 * columns, search, sort, paging). This page object covers what is specific to Material
 * Template: the list's own `Filter`/`Refresh`/`Create` controls, the `Set Filters` aside, and
 * the multi-tab Create/Edit/Clone wizard (`Basic Details → Material Details → Problem
 * Details → Application Details`).
 *
 * All selectors verified live against the QA tenant on 2026-09-27.
 *
 * ## Known app bugs found during this exploration (see test-plans/SMOKE-NOTES.md)
 *
 * - **Every metadata-backed dropdown inside the Create/Edit/Clone wizard renders with no
 *   usable options** (`Task*`, `Select Product`, `Select Problem`, `Mix Method`, `Rate Unit`,
 *   `Per`, `Application Method`, `Nozzle Type`, `Droplet Size`). The toggle button's accessible
 *   name/tooltip literally reads the string `"undefined"` (a stringified `undefined` bound into
 *   `title`), and the option list under `Task*`/`Select Problem` renders zero or blank-text
 *   rows. The *list's own* `Set Filters → Operation` dropdown, built from the same custom
 *   `.dropdown` component, populates correctly — so this is scoped to the wizard's own fetch,
 *   not a session-wide outage. Network capture: `GET
 *   .../api/metadata/ParentOperations?...` reliably resolves `NS_BINDING_ABORTED`.
 *   **Effect: `Task*` can never be set, so `Save` never leaves its disabled state and no
 *   Material Template can currently be created through the UI in this environment.**
 * - **Edit and Clone both open a completely BLANK "Create New Material Template" form** —
 *   `Material Title*` is empty, `Task*` is unset — instead of pre-filling from the source
 *   template, even though the heading and the rest of the wizard chrome are identical to
 *   Create. Confirmed on a real template ("Fertilization", id 31) via both the row's Edit icon
 *   and its Clone icon, and via the detail page's own "Edit Material Template" button.
 * - The list's `Refresh` button's accessible name/tooltip is the untranslated i18n key
 *   `Modules.templatemgmt.pages.activitydetails.refreshmaterialtemplates` — locate it by its
 *   `fa-refresh` icon instead (see `refreshButton`).
 * - The `Set Filters` aside's close (X) icon has accessible name `"Close User"` — a mislabeled,
 *   reused component, not specific to this screen. Located by its `.icon-reject-btn` class
 *   instead (see `closeFilters`).
 * - `Total Application Rate` / `Tank Size` render their unit suffix with no separating space —
 *   `Total Application Rategal/acre*`, `Tank SizeGal*` — a label/unit concatenation bug.
 * - Opening the Create wizard reliably raises a transient alert `Error: The input string ''
 *   was not in a correct format.`, which self-dismisses within a couple of seconds.
 */

export type MaterialTemplateWizardTab =
  | 'Basic Details'
  | 'Material Details'
  | 'Problem Details'
  | 'Application Details';

export class MaterialTemplatesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Open the Material Template list and wait out its initial load, INCLUDING the grid's own
   * skeleton-row fetch (see `ListPage.waitForGridSettled` — the grid does not use the app's
   * truck-loader overlay, it swaps skeleton `<tr>`s for data in place). Callers that go on to
   * click a row (`openEdit`/`openClone`/`openViewDetail`) need real rows, not skeletons.
   */
  async open(): Promise<void> {
    await this.page.goto(routes.templateMgmt.activityDetails, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    const skeleton = this.page.locator('span.skeleton-box');
    await skeleton.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await expect(skeleton).toHaveCount(0, { timeout: 45000 });
  }

  // ---------------------------------------------------------------------------------------
  // List toolbar
  // ---------------------------------------------------------------------------------------

  get createButton(): Locator {
    return this.page.getByRole('button', { name: 'Create New Material Template' });
  }

  /**
   * The Refresh control. Its accessible name is the untranslated i18n key
   * `Modules.templatemgmt.pages.activitydetails.refreshmaterialtemplates` (see class doc), so
   * it is matched by its `fa-refresh` icon instead, the same convention `ListPage` uses for the
   * grid's own search/reset icons.
   */
  get refreshButton(): Locator {
    return this.page.locator('button:has(i.fa-refresh)');
  }

  async refresh(): Promise<void> {
    await this.waitForLoaderGone();
    await this.refreshButton.click();
    await this.waitForLoaderGone();
  }

  /**
   * The list's `Filter` toggle. Reads plain `Filter` with no active filter and `Filter *` once
   * one is applied, so the name is matched by its leading word only.
   */
  get filterButton(): Locator {
    return this.page.getByRole('button', { name: /^Filter\b/ });
  }

  // ---------------------------------------------------------------------------------------
  // "Set Filters" aside — Material Template Name (text) + Operation (custom dropdown)
  // ---------------------------------------------------------------------------------------

  /** The `Set Filters` aside, same `app-aside` component the Work Orders list filter uses. */
  get filterPanel(): Locator {
    return this.page.locator('app-aside').filter({ hasText: 'Set Filters' });
  }

  get materialTemplateNameInput(): Locator {
    return this.filterPanel.getByRole('textbox', { name: 'Material Template Name' });
  }

  /** Open the `Set Filters` aside (no-op if already open). */
  async openFilters(): Promise<Locator> {
    const panel = this.filterPanel;
    if (!(await panel.isVisible())) {
      await this.clickPastLoader(this.filterButton, () => expect(panel).toBeVisible({ timeout: 8000 }));
    }
    return panel;
  }

  /** Type into `Material Template Name` and Apply. */
  async filterByName(name: string): Promise<void> {
    const panel = await this.openFilters();
    await this.materialTemplateNameInput.fill(name);
    await panel.getByRole('button', { name: 'Apply', exact: true }).click();
    await this.waitForLoaderGone();
  }

  /**
   * Pick a value in the `Operation` dropdown and Apply.
   *
   * Deliberately NOT `BasePage.selectFromDropdown`/`dropdownToggle`: those locate a dropdown by
   * finding its label TEXT anywhere on the page, and the grid's own `Operation` column header
   * (unscoped, no `*`) renders the identical text at the same time the filter panel is open —
   * `dropdownToggle`'s page-wide xpath would resolve to whichever comes first in the DOM, not
   * necessarily the filter's. Scoping the label lookup to `panel` first avoids that collision.
   */
  async filterByOperation(option: string): Promise<void> {
    const panel = await this.openFilters();
    const label = panel.locator('xpath=.//*[normalize-space(text())="Operation" or normalize-space(text())="Task"]').first();
    await label.locator('xpath=following::button[1]').click();
    const menu = this.page.locator('.dropdown.show');
    await expect(menu).toBeVisible();
    await menu.locator('input').first().fill(option);
    // Substring, not exact: the live options carry a trailing code the caller does not have to
    // know, e.g. "Irrigation (1410)" for `option: 'Irrigation'`.
    await menu.locator('a.dropdown-item', { hasText: option }).first().click();
    await panel.getByRole('button', { name: 'Apply', exact: true }).click();
    await this.waitForLoaderGone();
  }

  /** Reset clears both fields and re-fetches immediately — no separate Apply needed. */
  async resetFilters(): Promise<void> {
    const panel = await this.openFilters();
    await panel.getByRole('button', { name: 'Reset', exact: true }).click();
    await this.waitForLoaderGone();
  }

  /**
   * Close the aside via its X icon WITHOUT applying — proves a filter typed but not applied has
   * no effect. Its accessible name is the mislabeled `"Close User"` (see class doc), so it is
   * matched by its `.icon-reject-btn` class instead, same as the wizard's own close icon.
   */
  async closeFilters(): Promise<void> {
    const panel = this.filterPanel;
    await panel.locator('.icon-reject-btn').click();
    await expect(panel).toBeHidden({ timeout: 8000 });
  }

  // ---------------------------------------------------------------------------------------
  // Create / Edit / Clone wizard
  // ---------------------------------------------------------------------------------------

  /** The wizard heading. Edit and Clone currently render the SAME "Create New..." heading — see class doc. */
  get wizardHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Create New Material Template', level: 2 });
  }

  /**
   * The wizard-level Save (top-right, gates the whole record). The Problem Details tab has its
   * OWN "Save" button (per-problem, see `problemSaveButton`) with the identical accessible
   * name, and it renders LATER in the DOM than this one — `.first()` disambiguates.
   */
  get wizardSaveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true }).first();
  }

  /**
   * The wizard's close (X) icon, `.icon-reject-btn` same as the filter aside's (see
   * `closeFilters`). Located as the element next to the wizard-level Save button rather than
   * by class alone, since the `Set Filters` aside can still hold its own (hidden) one in the
   * DOM.
   */
  get wizardCloseIcon(): Locator {
    return this.wizardSaveButton.locator('xpath=following-sibling::*[1]');
  }

  /**
   * Confirm the wizard is not just open but STAYS open. Observed live (both manually and in a
   * real headless run): the wizard can open, pass an immediate visibility check, and then close
   * itself within ~1-2s — almost certainly downstream of the same broken metadata fetch behind
   * the empty dropdowns (see class doc). Waiting a beat and re-checking turns that race into a
   * retried open instead of a flaky "tabs not found" failure a few lines later.
   */
  private async confirmWizardStaysOpen(): Promise<void> {
    await expect(this.wizardHeading).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(1500);
    await expect(this.wizardHeading).toBeVisible({ timeout: 3000 });
  }

  /** Open the Create wizard from the list toolbar. */
  async openCreateWizard(): Promise<Locator> {
    await this.waitForLoaderGone();
    await expect(async () => {
      await this.createButton.click();
      await this.confirmWizardStaysOpen();
    }).toPass({ timeout: 45000 });
    return this.wizardHeading;
  }

  /**
   * Close the wizard without saving. A `cdk-overlay-backdrop` can linger over the close icon
   * after opening/closing a dropdown inside the wizard and swallow the click — clear it first.
   */
  async closeWizard(): Promise<void> {
    await this.page.evaluate(() => {
      document.querySelectorAll('.cdk-overlay-backdrop').forEach((el) => el.remove());
    });
    await this.wizardCloseIcon.click();
    await expect(this.wizardHeading).toBeHidden({ timeout: 8000 });
  }

  /**
   * A numeric field that carries no accessible name of its own (no `aria-label`/`for` binding —
   * `Rate`, `Preharvest (PHI) Days` and `Band Percentage for Each Row to Apply` are all like
   * this, unlike `Infestation`/`Total Application Rate`/`Tank Size`, which do). Located the same
   * way `BasePage.dropdownToggle` locates a dropdown: the first `<input>` after the label text,
   * in document order.
   *
   * Takes alternative labels because the wizard renders one of two label sets per load
   * (observed 2026-09-27): the translated one ("Preharvest (PHI) Days", "Save & Add New") or a
   * raw fallback ("Pre Harvest Days", "Save And Add New") when its translations have not
   * resolved — the same run-to-run drift as the Task/Operation label.
   */
  private spinbuttonAfterLabel(...labels: string[]): Locator {
    // Match on the element's full string value, not `text()`: the fallback labels split across
    // child nodes ("Pre Harvest" + "Days"), which a first-text-node match misses. The
    // `not(*[...])` clause keeps the innermost element whose whole text is the label.
    const full = (label: string) => `normalize-space(.)="${label}"`;
    const match = labels.map((label) => `(${full(label)} and not(*[${full(label)}]))`).join(' or ');
    return this.page.locator(`xpath=(//*[${match}])[1]/following::input[1]`);
  }

  /**
   * The Basic Details / Material Details / Problem Details / Application Details tab strip
   * item. Matched on exact text rather than `getByRole('listitem', ...)` — the tab strip's
   * markup was NOT consistently exposed as `listitem` across runs (bootstrap `nav`/`role="tab"`
   * patterns vary), so text is the stable signal. `.first()`: the active tab's own content
   * renders an `<h3>` with the identical text, which would otherwise make this ambiguous.
   */
  wizardTab(name: MaterialTemplateWizardTab): Locator {
    return this.page.getByText(name, { exact: true }).first();
  }

  async switchWizardTab(name: MaterialTemplateWizardTab): Promise<void> {
    await this.wizardTab(name).click();
    await expect(this.page.getByRole('heading', { name, level: 3 })).toBeVisible({ timeout: 8000 });
  }

  // Basic Details fields
  get materialTitleInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Material Title*' });
  }

  get additionalCommentsInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Additional Comments' });
  }

  /**
   * The `Task*` (a.k.a. `Operation*`, see class doc) dropdown toggle on the Basic Details tab.
   * `BasePage.dropdownToggle` locates it by its label text, which is unaffected by the
   * `title="undefined"` bug on the toggle button itself.
   */
  get taskDropdownToggle(): Locator {
    return this.dropdownToggle(['Task*', 'Operation*']);
  }

  // Material Details fields (tab 2)
  get selectProductToggle(): Locator {
    return this.dropdownToggle(['Select Product']);
  }

  get mixMethodToggle(): Locator {
    return this.dropdownToggle(['Mix Method']);
  }

  get rateInput(): Locator {
    return this.spinbuttonAfterLabel('Rate');
  }

  get rateUnitToggle(): Locator {
    return this.dropdownToggle(['Rate Unit']);
  }

  get perToggle(): Locator {
    return this.dropdownToggle(['Per']);
  }

  get saveAndAddNewButton(): Locator {
    return this.page.getByRole('button', { name: /^Save (&|And) Add New$/ });
  }

  /**
   * The `Delete` button beside `Save & Add New` on Material Details, and beside `Save` on
   * Problem Details — the two tabs are mutually exclusive (only one is ever mounted at a
   * time), so a single unscoped locator resolves to whichever tab is active.
   */
  get materialDeleteButton(): Locator {
    return this.page.getByRole('button', { name: 'Delete', exact: true });
  }

  // Problem Details fields (tab 3)
  get selectProblemToggle(): Locator {
    return this.dropdownToggle(['Select Problem']);
  }

  get infestationInput(): Locator {
    return this.page.getByRole('spinbutton', { name: 'Infestation', exact: true });
  }

  get descriptionInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Description', exact: true });
  }

  /**
   * The Problem Details tab's own Save (per-problem, repeatable). Shares its accessible name
   * with the wizard-level Save (see `wizardSaveButton`) but renders later in the DOM —
   * `.last()` disambiguates.
   */
  get problemSaveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true }).last();
  }

  /** Same control as `materialDeleteButton` — see its doc for why one locator covers both tabs. */
  get problemDeleteButton(): Locator {
    return this.materialDeleteButton;
  }

  // Application Details fields (tab 4)
  get applicationMethodToggle(): Locator {
    return this.dropdownToggle(['Application Method']);
  }

  get totalApplicationRateInput(): Locator {
    // Accessible name concatenates label + unit with no space (see class doc):
    // "Total Application Rategal/acre*".
    return this.page.getByRole('spinbutton', { name: /^Total Application Rate/ });
  }

  get tankSizeInput(): Locator {
    // Translated: "Tank SizeGal*"; fallback: "Enter Tank Size" (see spinbuttonAfterLabel).
    return this.page.getByRole('spinbutton', { name: /^(Enter )?Tank Size/ });
  }

  get nozzleTypeToggle(): Locator {
    return this.dropdownToggle(['Nozzle Type']);
  }

  get dropletSizeToggle(): Locator {
    return this.dropdownToggle(['Droplet Size']);
  }

  get phiDaysInput(): Locator {
    return this.spinbuttonAfterLabel('Preharvest (PHI) Days', 'Pre Harvest Days');
  }

  get advancedOptionsToggle(): Locator {
    return this.page.getByRole('button', { name: /^Advanced Options/ });
  }

  /** Rendered under the "Percentage" section, visible without expanding "Advanced Options". */
  get bandPercentageInput(): Locator {
    return this.spinbuttonAfterLabel('Band Percentage for Each Row to Apply', 'Percentage Of Each Row To Apply');
  }

  // ---------------------------------------------------------------------------------------
  // Row actions (Edit / Clone / View Detail) — Actions column of the list grid
  // ---------------------------------------------------------------------------------------

  /**
   * A list row by its exact `Name` (first column). Matching the whole row's text would also
   * hit the `Operation`/`Task` column, whose values (e.g. "Fertilization") repeat across many
   * templates and collide with other templates' names, so this scopes to the first cell and
   * requires an exact match.
   */
  private rowByName(name: string): Locator {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.locator('table tbody tr').filter({
      has: this.page.locator('td:nth-child(1)', { hasText: new RegExp(`^\\s*${escaped}\\s*$`) }),
    });
  }

  // Icon-only action controls: no visible text, so matched by title attribute (their computed
  // accessible name) rather than `getByText`.

  async openEdit(templateName: string): Promise<void> {
    await expect(async () => {
      await this.rowByName(templateName).getByTitle('Edit Material Template').click();
      await this.confirmWizardStaysOpen();
    }).toPass({ timeout: 45000 });
  }

  async openClone(templateName: string): Promise<void> {
    await expect(async () => {
      await this.rowByName(templateName).getByTitle('Clone Material Template').click();
      await this.confirmWizardStaysOpen();
    }).toPass({ timeout: 45000 });
  }

  async openViewDetail(templateName: string): Promise<void> {
    await this.rowByName(templateName).getByTitle('View Material Template Detail').click();
    await expect(this.page.getByRole('heading', { name: /^Material Template Detail:/ })).toBeVisible({
      timeout: 20000,
    });
  }

  // ---------------------------------------------------------------------------------------
  // View Detail page
  // ---------------------------------------------------------------------------------------

  get detailEditButton(): Locator {
    return this.page.getByRole('button', { name: 'Edit Material Template' });
  }

  detailHeading(name: string): Locator {
    return this.page.getByRole('heading', { name: `Material Template Detail: ${name}` });
  }
}

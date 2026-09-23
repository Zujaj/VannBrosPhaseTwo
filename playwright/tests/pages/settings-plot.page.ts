import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Settings > Plot — the plots/fields grid and its `Add Plot` form (ADO #26093).
 *
 * The grid itself is the shared `app-f3-table`, so `ListPage` covers listing, search, sort and
 * paging. This page object owns only what is specific to plot creation.
 *
 * Form contract, verified live 2026-09-23:
 *
 *   Farms*  Field Name*  Field Code*  Irrigation Method*  Irrigation Sources*  Total Area*
 *   Coordinate (optional — acceptance criterion #1)
 *
 * **Three different widgets sit on this one form**, which is the trap:
 *
 * | Field | Widget | How to drive it |
 * |---|---|---|
 * | `Farms*`, `Irrigation Method*` | the app's `.dropdown` — a real `<button>` | `BasePage.selectFromDropdown` |
 * | `Irrigation Sources*` | **`ng-multiselect-dropdown`** — a `<span class="dropdown-btn">`, *not* a button | `selectIrrigationSources` below |
 * | text fields | plain `<input>`/`<textarea>` | `getByLabel` |
 *
 * Every label carries a real `for` (`name`, `code`, `area`, `coordinate`,
 * `select-irrigation-sources`), so `getByLabel` resolves each control directly — no positional
 * xpath needed.
 *
 * `Save` stays **disabled** until every required field is set, so an incomplete fill cannot
 * submit by accident.
 */

/** The values the Add Plot form takes. `coordinate` is deliberately optional — see AC #1. */
export interface PlotFormValues {
  farm: string;
  fieldName: string;
  fieldCode: string;
  irrigationMethod: string;
  irrigationSources: string[];
  totalArea: string;
  coordinate?: string;
}

/** Labels as the form renders them, required marker included. */
export const PLOT_FORM_LABELS = {
  farm: 'Farms*',
  fieldName: 'Field Name*',
  fieldCode: 'Field Code*',
  irrigationMethod: 'Irrigation Method*',
  irrigationSources: 'Irrigation Sources*',
  totalArea: 'Total Area*',
  coordinate: 'Coordinate',
} as const;

/**
 * `Field Code` is capped at 10 characters by the API model (`PlotFieldAPIModel.code`,
 * maxLength 10 — vannbrosphasetwo-vann-api-qa skill). The form does NOT enforce it; see
 * test-plans/FINDINGS.md #30.
 */
export const FIELD_CODE_MAX_LENGTH = 10;

export class PlotPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** The grid's `Add Plot` button, top-right of the Plot list. */
  get addPlotButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Plot', exact: true });
  }

  /** The `Add Plot` form's own heading — the marker that the form is mounted. */
  get formHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Add Plot', exact: true });
  }

  /** `<button title="Save">`. Disabled until every required field is set. */
  get saveButton(): Locator {
    return this.page.locator('button[title="Save"]');
  }

  /** `<a title="Close">` — an anchor, not a button. */
  get closeButton(): Locator {
    return this.page.locator('a[title="Close"]');
  }

  /** The read-only panel beside the form that mirrors what has been entered. */
  get summary(): Locator {
    return this.page.locator('.summary-panel');
  }

  /** A text field on the form, by its visible label. */
  input(label: string): Locator {
    return this.page.getByLabel(label, { exact: true });
  }

  /** Navigate to Settings > Plot and wait for the page to mount. */
  async open(): Promise<void> {
    await this.page.goto(routes.settings.plot, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.page.getByRole('heading', { name: 'Plot', exact: true })).toBeVisible({
      timeout: 30000,
    });
  }

  /**
   * Open the Add Plot form. Goes through `clickPastLoader` because the grid is still fetching
   * its first page when the button paints, and the truck loader eats the click.
   */
  async openAddPlotForm(): Promise<void> {
    await this.clickPastLoader(this.addPlotButton, async () => {
      await expect(this.formHeading).toBeVisible({ timeout: 10000 });
    });
  }

  /**
   * `Irrigation Sources*` — an `ng-multiselect-dropdown`, which is NOT the app's usual dropdown
   * widget. Its toggle is a `<span class="dropdown-btn">`, so `BasePage.selectFromDropdown`
   * cannot drive it: that helper looks for the first `<button>` after the label, matches
   * something elsewhere on the page, and then waits forever for a `.dropdown.show` panel that
   * never opens (this cost a 300s test timeout on 2026-09-23 before the widget was identified).
   *
   * The panel is a `.dropdown-list` that carries a `hidden` attribute while closed, and holds
   * one `li.multiselect-item-checkbox` per option plus a `Select All` row and a filter box.
   */
  async selectIrrigationSources(names: string[]): Promise<void> {
    const root = this.page.locator('#select-irrigation-sources');
    const panel = root.locator('.dropdown-list');

    await this.waitForLoaderGone();
    await this.waitForToastsGone();
    await root.locator('span.dropdown-btn').click();
    await expect(panel).toBeVisible();

    for (const name of names) {
      // `Select All` is a sibling of the real options, so match the option text exactly.
      await panel.locator('li.multiselect-item-checkbox').filter({ hasText: name }).first().click();
      // The toggle collects a chip per selection; assert it so a mis-matched option name fails
      // here rather than later as a disabled Save button.
      await expect(root.locator('span.dropdown-btn')).toContainText(name);
    }

    // Close the panel — it overlays the fields below it (Total Area, Coordinate).
    //
    // This widget only closes on an OUTSIDE click. Verified live 2026-09-23: clicking the
    // `.dropdown-btn` a second time leaves it open (unlike the app's own `.dropdown`), and
    // `Escape` does nothing at all. Clicking the form heading closes it and keeps the picks.
    await this.formHeading.click();
    await expect(panel).toBeHidden();
  }

  /** Fill the form. Coordinate is written only when a value is supplied. */
  async fill(values: PlotFormValues): Promise<void> {
    await this.selectFromDropdown([PLOT_FORM_LABELS.farm], values.farm);
    await this.input(PLOT_FORM_LABELS.fieldName).fill(values.fieldName);
    await this.input(PLOT_FORM_LABELS.fieldCode).fill(values.fieldCode);
    await this.selectFromDropdown([PLOT_FORM_LABELS.irrigationMethod], values.irrigationMethod);
    await this.selectIrrigationSources(values.irrigationSources);
    await this.input(PLOT_FORM_LABELS.totalArea).fill(values.totalArea);

    if (values.coordinate !== undefined) {
      await this.input(PLOT_FORM_LABELS.coordinate).fill(values.coordinate);
    }
  }

  /**
   * Submit the form and wait for it to close.
   *
   * Asserts Save became enabled first: the button is disabled until the required set is
   * complete, so a `fill` that silently missed a field would otherwise show up as a confusing
   * click timeout rather than as the missing value it is.
   */
  async save(): Promise<void> {
    await expect(this.saveButton, 'Save is still disabled — a required field is unset').toBeEnabled({
      timeout: 15000,
    });
    await this.clickPastLoader(this.saveButton, async () => {
      await expect(this.formHeading).toBeHidden({ timeout: 20000 });
    });
  }

  /**
   * Click **Save** without requiring the form to close.
   *
   * `save()` treats the form closing as the proof the click landed, which is exactly wrong for
   * the duplicate-rejection check (AC #2): there the form is *expected* to stay open, so
   * `save()` would retry the click until it timed out. This waits the overlays out, clicks
   * once, and leaves the caller to assert what happened.
   */
  async attemptSave(): Promise<void> {
    await expect(this.saveButton).toBeEnabled({ timeout: 15000 });
    await this.waitForLoaderGone();
    await this.waitForToastsGone();
    await this.saveButton.click();
    await this.waitForLoaderGone();
  }

  /** Dismiss the form without saving, to get back to the grid. */
  async close(): Promise<void> {
    await this.clickPastLoader(this.closeButton, async () => {
      await expect(this.formHeading).toBeHidden({ timeout: 15000 });
    });
  }

  /** Error toasts currently on screen (ngx-toastr). */
  get errorToast(): Locator {
    return this.page.locator('.overlay-container .toast-container .toast-error');
  }

  /**
   * Whether a form label carries the required marker.
   *
   * The lookup deliberately strips the `*` before matching: locating the label BY its starred
   * text and then checking it ends in `*` proves nothing — a product change that dropped the
   * marker would fail to find the element at all rather than report `false`. Matching on the
   * bare name means the marker is genuinely observed, which is what AC #1 turns on.
   */
  async isRequired(label: string): Promise<boolean> {
    const base = label.replace(/\*$/, '');
    const text = await this.page
      .locator(`xpath=//label[normalize-space(text())="${base}" or normalize-space(text())="${base}*"]`)
      .first()
      .innerText();
    return text.trim().endsWith('*');
  }
}

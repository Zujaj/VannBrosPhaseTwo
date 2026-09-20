import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Settings > Plot — the plots/fields grid and its `Add Plot` form (ADO #26093).
 *
 * The grid itself is the shared `app-f3-table`, so `ListPage` covers listing, search, sort
 * and paging. This page object owns only what is specific to plot creation: the `Add Plot`
 * trigger, the form's seven controls, and the live Summary panel beside them.
 *
 * Form contract (from the work item's screenshots, `resources/work-items/26093-create-field.md`):
 *
 *   Farms*  Field Name*  Field Code*  Irrigation Method*  Irrigation Sources*  Total Area*
 *   Coordinate (optional — this is acceptance criterion #1)
 *
 * `Farms` and `Irrigation Method` are the app's custom `.dropdown` widget, not `<select>`s,
 * so they go through `BasePage.selectFromDropdown`. `Irrigation Sources` is the same widget
 * in multi-select mode: each pick adds a removable chip and the panel stays open.
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
 * `Field Code` is capped at 10 characters by the API model
 * (`PlotFieldAPIModel.code`, maxLength 10 — see the vannbrosphasetwo-vann-api-qa skill). The
 * work item's "create field via form **with limitations**" is this cap; the form is expected
 * to enforce it client-side rather than let the server reject the save.
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

  get saveButton(): Locator {
    return this.page.getByRole('button', { name: 'Save', exact: true });
  }

  /** The read-only panel beside the form that mirrors what has been entered. */
  get summary(): Locator {
    return this.page.locator('*').filter({ hasText: /^Summary$/ }).last();
  }

  /** Navigate to Settings > Plot and wait for the grid to paint real rows. */
  async open(): Promise<void> {
    await this.page.goto(routes.settings.plot, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.page.getByRole('heading', { name: 'Plot', exact: true })).toBeVisible({
      timeout: 30000,
    });
  }

  /**
   * Open the Add Plot form. Goes through `clickPastLoader` because the grid is still
   * fetching its first page when the button paints, and the truck loader eats the click.
   */
  async openAddPlotForm(): Promise<void> {
    await this.clickPastLoader(this.addPlotButton, async () => {
      await expect(this.formHeading).toBeVisible({ timeout: 10000 });
    });
  }

  /**
   * A plain `<input>`/`<textarea>` on the form, located by its visible label.
   *
   * The form's labels are not wired to their controls with `for`/`id` (the app renders them
   * as sibling text inside a form-group), so `getByLabel` does not resolve them — the lookup
   * walks from the label text to the next control instead, the same approach
   * `BasePage.dropdownToggle` takes for the dropdowns.
   */
  input(label: string): Locator {
    return this.page
      .locator(
        `xpath=//*[normalize-space(text())="${label}"]/following::*[self::input or self::textarea][1]`,
      )
      .first();
  }

  /** Fill the form. Coordinate is written only when a value is supplied. */
  async fill(values: PlotFormValues): Promise<void> {
    await this.selectFromDropdown([PLOT_FORM_LABELS.farm], values.farm);
    await this.input(PLOT_FORM_LABELS.fieldName).fill(values.fieldName);
    await this.input(PLOT_FORM_LABELS.fieldCode).fill(values.fieldCode);
    await this.selectFromDropdown([PLOT_FORM_LABELS.irrigationMethod], values.irrigationMethod);

    for (const source of values.irrigationSources) {
      await this.selectFromDropdown([PLOT_FORM_LABELS.irrigationSources], source);
    }
    // The multi-select panel stays open over the rest of the form; close it before typing on.
    await this.page.keyboard.press('Escape');

    await this.input(PLOT_FORM_LABELS.totalArea).fill(values.totalArea);

    if (values.coordinate !== undefined) {
      await this.input(PLOT_FORM_LABELS.coordinate).fill(values.coordinate);
    }
  }

  /**
   * Submit the form and wait for it to close.
   *
   * The form closing is the observable effect a `clickPastLoader` confirm needs: a Save
   * eaten by the loader leaves the heading on screen and the attempt retries.
   */
  async save(): Promise<void> {
    await this.clickPastLoader(this.saveButton, async () => {
      await expect(this.formHeading).toBeHidden({ timeout: 20000 });
    });
  }

  /**
   * Whether a form label carries the required marker. Read off the rendered label text so
   * it reflects what a user actually sees, which is what AC #1 is about.
   */
  async isRequired(label: string): Promise<boolean> {
    const text = await this.page
      .locator(`xpath=//*[normalize-space(text())="${label}"]`)
      .first()
      .innerText();
    return text.trim().endsWith('*');
  }
}

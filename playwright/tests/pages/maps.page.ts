import { expect } from '@playwright/test';
import type { Page, Locator, Response } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Maps (`/maps`): a Google Maps canvas with the farm/field tree on the left, a Summary aside
 * on the right, the Maps Control layer panel over the map, and a "Set Filters" aside behind
 * the funnel. Workbook tab `02 Maps`.
 *
 * The map itself is a canvas, so polygon rendering, highlighting and map labels are not
 * assertable from the DOM — specs here cover the surrounding chrome, which is where the
 * workbook's checkable expectations actually live. Verified live 2026-09-08.
 */

/** Layers the Maps Control panel offers, verbatim and in render order. */
export const MAP_LAYERS = [
  'Stages',
  'Crops',
  'Task',
  'Active Inspections',
  'Draft Inspections',
  'Completed Inspections',
  'Active Work Orders',
  'Draft Work Orders',
  'Upcoming Work Orders',
  'Completed Work Orders',
  'Point Of Interest',
] as const;

/**
 * Work-order status IDs the Maps layers send to `POST /api/Map/workOrderDetails` as
 * `statuses`. Read off the live requests 2026-09-27: each layer asks for exactly one status.
 */
export const WO_STATUS = { Draft: 1, 'To Do': 2, 'In Progress': 3, Done: 5 } as const;

/** `filterType` on that request when the layer is an inspection one. */
export const INSPECTION_FILTER_TYPE = 2;

/** The parsed body of a Maps data request, plus what the app asked for. */
export interface MapLayerQuery {
  status: number;
  request: {
    filterSelected: string;
    filterType?: number | null;
    statuses: number[] | null;
    operationIds: number[] | null;
    cropIds: number[] | null;
    startDate: string | null;
    endDate: string | null;
  };
  records: number;
  data: Array<Record<string, unknown>>;
}

export class MapsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.goto(routes.maps.root, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.treeNodes.first()).toBeVisible({ timeout: 45000 });
    await expect(this.aside).toContainText('Farm Name', { timeout: 45000 });
  }

  /** Visible sidebar tree nodes (farm, fields, and plots once expanded). */
  get treeNodes(): Locator {
    return this.page.locator('div.node-label:visible');
  }

  /** Field nodes — those showing an acreage. */
  get fieldNodes(): Locator {
    return this.treeNodes.filter({ hasText: /[\d.]+\s*ac/ });
  }

  /**
   * The sidebar's tree search box.
   *
   * Three inputs on this page carry the placeholder `Search` — the header's Site and Season
   * pickers keep theirs mounted but hidden — so `getByPlaceholder('Search').first()` resolves
   * one of those and every fill against it times out. The tree's own box is the `form-control`
   * one (verified live 2026-09-08).
   */
  get search(): Locator {
    return this.page.locator('input.form-control[placeholder="Search"]');
  }

  /**
   * A base-layer control. These are Google Maps widgets, not app buttons: `role=menuitemradio`
   * with `aria-label="Show street map"` / `"Show satellite imagery"`, and the selected one is
   * marked by `aria-checked` — not by the text "Map"/"Satellite" or by `aria-pressed`.
   */
  baseLayer(kind: 'map' | 'satellite'): Locator {
    return this.page.getByRole('menuitemradio', {
      name: kind === 'map' ? 'Show street map' : 'Show satellite imagery',
    });
  }

  /** A layer's label in the Maps Control panel. */
  layerLabel(name: string): Locator {
    return this.layerPanel.getByText(name, { exact: true });
  }

  /**
   * The right-hand information aside. Shows farm details until a field is selected, then that
   * field's details; it carries the Summary and Details tab controls either way.
   */
  get aside(): Locator {
    return this.page.locator('app-aside, aside').filter({ hasText: /Summary/ }).first();
  }

  /** Read a `Label value` pair out of the aside (Farm Name, Location, Total Area, Area, ...). */
  async asideValue(label: string): Promise<string | null> {
    const text = await this.aside.innerText();
    return text.match(new RegExp(`${label}\\s*\\n\\s*(.+)`))?.[1]?.trim() ?? null;
  }

  /** The Maps Control layer panel over the map. */
  get layerPanel(): Locator {
    return this.page.locator('app-map-control-panel');
  }

  /**
   * A layer's on/off switch in the Maps Control panel. The switch is keyed by its input's
   * `name`, which differs from the visible label for two layers: the `Task` label drives
   * `name="Operations"` and `Point Of Interest` drives `name="Point of Interests"`.
   * Clicking the label text does nothing — the `.switch-slider` is the control.
   */
  layerSwitch(name: string): Locator {
    return this.layerPanel.locator(`input.switch-input[name="${name}"]`);
  }

  /**
   * Turn one layer on (every other layer off first, so the next data request belongs to
   * this layer alone) and return the Maps data request it fires.
   */
  async showOnlyLayer(name: string): Promise<MapLayerQuery> {
    // Read the names first: a `:checked` locator re-resolves after every click, so iterating
    // it while unchecking skips entries and then points at nothing.
    const on = await this.layerPanel
      .locator('input.switch-input:checked')
      .evaluateAll((inputs) => inputs.map((i) => i.getAttribute('name') ?? ''));
    for (const other of on) {
      await this.sliderFor(this.layerSwitch(other)).click();
      await expect(this.layerSwitch(other)).not.toBeChecked();
    }
    const query = this.nextLayerQuery(name);
    await this.sliderFor(this.layerSwitch(name)).click();
    const result = await query;
    await expect(this.layerSwitch(name)).toBeChecked();
    return result;
  }

  private sliderFor(input: Locator): Locator {
    return input.locator('xpath=following-sibling::span[contains(@class,"switch-slider")]');
  }

  /**
   * Resolve with the next Maps data request (`/api/Map/workOrderDetails`,
   * `cultivationDetails` or `observationDetails`) whose `filterSelected` is `name`.
   * Start waiting BEFORE the action that triggers it.
   */
  async nextLayerQuery(name: string): Promise<MapLayerQuery> {
    const response: Response = await this.page.waitForResponse(
      (r) =>
        /\/api\/Map\/\w+Details/.test(r.url()) &&
        r.request().method() === 'POST' &&
        (r.request().postDataJSON()?.filterSelected ?? '') === name,
      { timeout: 45000 },
    );
    const body = await response.json().catch(() => ({}));
    const data = Array.isArray(body?.data) ? body.data : [];
    return {
      status: response.status(),
      request: response.request().postDataJSON(),
      records: body?.recordsTotal ?? data.length,
      data,
    };
  }

  /** The WO date-range chip next to the funnel, e.g. `09/27/2026 - 10/04/2026`. */
  get dateRangeChip(): Locator {
    return this.page.getByText(/^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/).first();
  }

  /** The toggle button of a field in the Set Filters aside, by its label. */
  filterField(panel: Locator, label: string): Locator {
    return panel.locator(`xpath=(.//*[normalize-space(text())="${label}"])/following::button[1]`).first();
  }

  /** Pick an option in one of the Set Filters dropdowns (Filter Type, Task, Crop, Variety). */
  async chooseFilter(panel: Locator, label: string, option: string): Promise<void> {
    // A late Maps data load can close the aside after it opened; reopen rather than wait out
    // the test timeout on a control that is no longer on screen.
    if (!(await this.filtersHeading.isVisible())) await this.openFilters();
    await this.filterField(panel, label).click();
    const open = this.page.locator('.dropdown.show');
    await expect(open).toBeVisible();
    await open.getByText(option, { exact: true }).first().click();
    await expect(this.filterField(panel, label)).toContainText(option);
  }

  /** The options a Set Filters dropdown offers, minus its `All` entry and search box. */
  async filterOptions(panel: Locator, label: string): Promise<string[]> {
    await this.filterField(panel, label).click();
    const open = this.page.locator('.dropdown.show');
    await expect(open).toBeVisible();
    // The option list is fetched when the Filter Type changes, so it can open empty.
    const read = async () =>
      (await open.innerText())
        .split('\n')
        .map((o) => o.trim())
        .filter((o) => o && o !== 'All');
    await expect.poll(async () => (await read()).length, { timeout: 20000 }).toBeGreaterThan(0).catch(() => {});
    const options = await read();
    await this.filterField(panel, label).click(); // close it again
    await expect(open).toBeHidden();
    return options;
  }

  /**
   * The "Set Filters" heading. The Summary and Set Filters views share one `app-aside` and the
   * hidden one stays in the DOM, so the aside being visible says nothing about which view is
   * showing — this heading's visibility does.
   */
  get filtersHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Set Filters' });
  }

  /**
   * Open the "Set Filters" aside behind the funnel control.
   *
   * The page's initial data load resets the aside to Summary when it finishes, so a funnel
   * click fired before then is undone a moment later. Wait for the load, then confirm the view
   * is still Set Filters after a beat.
   */
  async openFilters(): Promise<Locator> {
    const panel = this.page.locator('app-aside').filter({ has: this.filtersHeading });
    await this.waitForLoaderGone();
    await expect(async () => {
      if (!(await this.filtersHeading.isVisible())) {
        await this.page.locator('button:has(i[class*=filter])').first().click({ timeout: 8000 });
      }
      await expect(this.filtersHeading).toBeVisible({ timeout: 8000 });
      await this.page.waitForTimeout(1500);
      await expect(this.filtersHeading).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 60000 });
    return panel;
  }

  /** Select a field in the tree and wait for the aside to describe it. */
  async selectField(): Promise<string> {
    const field = this.fieldNodes.first();
    const label = (await field.innerText()).replace(/\s+/g, ' ').trim();
    await field.click();
    await expect(this.aside).toContainText('Field Name', { timeout: 45000 });
    return label;
  }
}

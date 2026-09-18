import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
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

  /** Open the "Set Filters" aside behind the funnel control. */
  async openFilters(): Promise<Locator> {
    const panel = this.page.locator('app-aside').filter({ hasText: 'Set Filters' });
    await expect(async () => {
      await this.page.locator('button:has(i[class*=filter])').first().click({ timeout: 8000 });
      await expect(panel).toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 45000 });
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

import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Planning (`/crop-mgmt`): the farm/field/plot tree on the left and the planning board on
 * the right. Workbook tab `03 Planning`.
 *
 * Not a grid — `ListPage` does not apply here. Verified live 2026-09-07.
 */

/** The activity status tags PL-018 requires, in the order the board renders them. */
export const ACTIVITY_TAGS = [
  'All Activities',
  'New',
  'Draft',
  'To Do',
  'In Progress',
  'Review',
  'Done',
  'Cancelled',
] as const;

export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

/**
 * The work area's empty-state prompt, matched across both deployed builds: one says
 * "Please select/create a plot." and the other "Please Select A Block" — the same
 * Plot/Block drift already recorded for the work-order form and the grid columns.
 */
export const EMPTY_BOARD = /please\s+select.*(plot|block)/i;

/** Status badges an activity card can carry, as rendered (upper case). */
export const CARD_STATUSES = [
  'NEW',
  'DRAFT',
  'TO DO',
  'IN PROGRESS',
  'REVIEW',
  'DONE',
  'CANCELLED',
] as const;

export class PlanningPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.goto(routes.cropMgmt, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.treeNodes.first()).toBeVisible({ timeout: 45000 });
  }

  /**
   * Nodes currently VISIBLE in the sidebar tree — farm, fields and plots alike.
   *
   * The tree keeps every collapsed node in the DOM, so an unscoped `div.node-label` match
   * resolves plot nodes that are present but hidden. `.first()` on that then picks a node
   * that can never be seen or clicked, which fails as "hidden" or as a click timeout rather
   * than as anything meaningful (verified live 2026-09-07).
   */
  get treeNodes(): Locator {
    return this.page.locator('div.node-label:visible');
  }

  /** A visible tree node located by the text it displays (field number, area, project code). */
  treeNode(text: string | RegExp): Locator {
    return this.treeNodes.filter({ hasText: text });
  }

  /** The sidebar's search box. */
  get treeSearch(): Locator {
    return this.page.getByPlaceholder('Search').first();
  }

  /**
   * Select a field in the tree, which both expands it and loads its first plot's board.
   * Returns once the board has painted real activity cards.
   */
  async selectField(text: string | RegExp): Promise<void> {
    await this.waitForLoaderGone();
    await this.treeNode(text).first().click();
    await expect(this.page.getByText('Activities', { exact: true }).first()).toBeVisible({
      timeout: 45000,
    });
    await this.waitForBoardSettled();
  }

  /**
   * Wait for the board to finish fetching.
   *
   * Like the data grids, the planning board paints placeholder cards whose cells hold
   * `span.skeleton-box` ("ran Work Order Long Long Long Long Skeleton Text Date: Skeleton
   * Text") and swaps them for real activities in place. A card-visible check passes against
   * those, and the caller then reads placeholder text as if it were data.
   */
  async waitForBoardSettled(): Promise<void> {
    await this.waitForLoaderGone();
    const skeleton = this.page.locator('span.skeleton-box');
    await skeleton.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await expect(skeleton).toHaveCount(0, { timeout: 45000 });
  }

  /** Field nodes in the tree (those showing an area). */
  get fieldNodes(): Locator {
    return this.treeNode(/[\d.]+\s*ac/);
  }

  /**
   * Select the first field in the tree and load its planning board. Returns its label.
   *
   * Selecting a field does NOT expand it: the row click loads the board while the field's
   * plots stay collapsed behind a chevron (verified live 2026-09-07 — the plot nodes are in
   * the DOM but hidden). Board assertions therefore need only this; use `expandField` when
   * the plots themselves are the subject.
   */
  async selectFirstField(): Promise<string> {
    await this.waitForLoaderGone();
    // Wait for the tree to paint its FIELD nodes before counting: `open()` only guarantees a
    // node is visible, and the farm node arrives first.
    //
    // The farm node usually auto-expands, but not always — and a collapsed farm keeps its
    // fields in the DOM as hidden nodes, so waiting alone never resolves. Expand by hand only
    // after the wait has actually run out: an eager check races the first paint, and the
    // chevron TOGGLES, so clicking it on a tree that was about to open collapses it instead.
    try {
      await expect(this.fieldNodes.first()).toBeVisible({ timeout: 45000 });
    } catch {
      await this.expandTopLevelNodes();
      await expect(this.fieldNodes.first()).toBeVisible({ timeout: 30000 });
    }

    const field = this.fieldNodes.first();
    const label = (await field.innerText()).replace(/\s+/g, ' ').trim();
    await field.click();
    await expect(this.page.getByText('Activities', { exact: true }).first()).toBeVisible({
      timeout: 45000,
    });
    await this.waitForBoardSettled();
    return label;
  }

  /**
   * Click the chevron on every currently visible node that has one, surfacing the next tree
   * level. Used to recover when the farm node did not auto-expand.
   */
  async expandTopLevelNodes(): Promise<void> {
    const chevrons = this.treeNodes.locator('i.icon-dropdown_arrow');
    const count = await chevrons.count();
    for (let index = 0; index < count; index++) {
      await chevrons.nth(index).click({ timeout: 5000 }).catch(() => {});
      if (await this.fieldNodes.first().isVisible().catch(() => false)) return;
    }
  }

  /**
   * Expand a field node so its plots become visible, and return them.
   *
   * The expand control is the chevron (`i.icon-dropdown_arrow`) on the field row — clicking
   * the row itself selects the field instead.
   */
  async expandField(text: string | RegExp): Promise<Locator> {
    const field = this.treeNode(text).first();
    await field.locator('i.icon-dropdown_arrow').first().click();
    const plots = this.treeNode(/PRJ_\d+/);
    await expect(plots.first()).toBeVisible({ timeout: 30000 });
    return plots;
  }

  /** The board's work area (empty-state prompt until a plot is chosen). */
  get board(): Locator {
    return this.page.locator('main');
  }

  /** Activity cards on the board. */
  get cards(): Locator {
    return this.page.locator('div.card-list');
  }

  /** A status tag in the board's `Tags:` row. */
  tag(name: ActivityTag): Locator {
    return this.board.getByText(name, { exact: true }).first();
  }

  /** Apply a status tag and wait for the card list to settle. */
  async filterByTag(name: ActivityTag): Promise<void> {
    await this.waitForLoaderGone();
    await this.tag(name).click();
    await this.waitForLoaderGone();
  }

  /**
   * Read a `Label value` pair out of the Plot Configuration panel.
   * The panel renders label and value as adjacent nodes, so this reads the panel's text.
   */
  async plotConfigValue(label: string): Promise<string | null> {
    const text = await this.board.innerText();
    return text.match(new RegExp(`${label}\\s*\\n?\\s*(.+)`))?.[1]?.trim() ?? null;
  }

  /** Expand the Plot Configuration accordion. */
  async openPlotConfiguration(): Promise<void> {
    await this.board.getByText('Plot Configuration').first().click();
    await expect(this.board.getByText('Plot Area', { exact: false }).first()).toBeVisible({
      timeout: 20000,
    });
  }
}

import { expect, test } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { routes } from '../constants/routes';
import { BasePage } from './base.page';
import type { WoScenario } from '../helpers/workOrderScenarios';

/**
 * Page object for the Work Orders list + Create form.
 *
 * Covers the per-type specs:
 *   - work-orders-planned.spec.ts
 *   - work-orders-tank-mix.spec.ts   (same Create form as Planned; tank-mix is driven
 *                                      by the "Enable Tank Mixing" toggle, not a chip)
 *   - work-orders-inspection.spec.ts (entered via the Inspection Work Orders sub-tab)
 *   - work-orders-harvest.spec.ts    (entered via the Harvest Work Orders sub-tab; same
 *                                      Create form as Planned minus the Materials section)
 * and the read-only WO detail screen (work-order-weather.spec.ts) via the inherited
 * loader/toast waits.
 *
 * Source of truth: vannbrosphasetwo-knowledge work-orders.md + per-type references + live QA form.
 */

export type WoType = 'planned' | 'tank-mix' | 'inspection' | 'harvest';

/**
 * The four work-order type sub-tabs, verbatim.
 *
 * The fourth tab is "Point Of Interests" or "Observations" — the same concept under two names.
 * The QA host has served both (Observations on 2026-09-17), so `subTab()` accepts either.
 */
export const SUB_TABS = [
  'Work Orders',
  'Inspection Work Orders',
  'Harvest Work Orders',
  'Point Of Interests',
] as const;

export type SubTabName = (typeof SUB_TABS)[number];

/** The plot section's add trigger and panel heading, under both names the QA host serves. */
const PLOT_ADD_TITLES = ['Add Plot', 'Add Block'];
const PLOT_PANEL_HEADING = /Select (Blocks|Plots)/;

/**
 * One row of `POST /api/activity/blocks`, the Select Plots panel's data (observed 2026-09-24).
 * Only the fields the Variety specs read are typed. `varieties` has been `[]` on every QA block
 * so far, so its element shape is unobserved — read it through `blockVarietyNames`.
 */
export interface PlotBlock {
  fieldID: number;
  fieldName: string;
  batchCode: string;
  fieldArea: number;
  varieties: unknown[];
  totalApplicableAcreage: number | null;
}

/**
 * Variety names on a block, whichever name key the element turns out to use. GP's integration
 * model is `FieldVarietyDTO { varietyId, code, name, color, acreage }` (FINDINGS #33), so `name`
 * is the likely key; the others stay as fallbacks until AgriERP's shape is seen.
 */
export function blockVarietyNames(block: PlotBlock): string[] {
  return block.varieties.map((v) => {
    if (typeof v === 'string') return v;
    const o = v as Record<string, unknown>;
    return String(o.varietyName ?? o.cropVarietyName ?? o.name ?? o.variety ?? JSON.stringify(o));
  });
}

/** The open Select Plots panel plus the blocks request/response behind it. */
export interface PlotPicker {
  panel: Locator;
  heading: Locator;
  /** Data rows only — the empty state renders one checkbox-less "No blocks found" row. */
  rows: Locator;
  blocks: PlotBlock[];
  cropVarietyIDs: number[];
}

/**
 * WO types that are authored from their own sub-tab rather than the default list. The four
 * sub-tabs are in-page buttons at /workorders (not routes) whose visible text IS their
 * accessible name, so `getByRole('button', { name, exact: true })` resolves one node each.
 * Verified live: inspection 2026-06-11, harvest 2026-08-27.
 */
const SUB_TAB: Partial<Record<WoType, string>> = {
  inspection: 'Inspection Work Orders',
  harvest: 'Harvest Work Orders',
};

export class WorkOrdersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Open the Work Orders list and launch the Create form for the given WO type.
   *
   * - 'planned' / 'tank-mix' use the default list and assert the green "Planned" chip
   *   (tank-mix is authored on the same form; the toggle, not a separate chip, switches it).
   * - 'inspection' first opens the "Inspection Work Orders" sub-tab. The inspection chip
   *   wording is NOT yet verified live (see work-orders-inspection.md), so we assert the
   *   generic "Create New Work Order" heading only.
   * - 'harvest' first opens the "Harvest Work Orders" sub-tab. Its form DOES show the green
   *   "Planned" chip (verified live 2026-08-27) — what makes it a harvest WO is that Task*
   *   is scoped to the five harvest operations, not the chip. See work-orders-harvest.md.
   */
  async openCreateForm(type: WoType = 'planned') {
    // Raise the caller's budget here rather than in each of the sixteen specs that open this
    // form: opening it can spend most of a minute retrying past the aside menu's animation
    // (see the clickPastLoader call below), which leaves too little of the 90s suite default
    // for the test body. Only ever raised, so a spec asking for more keeps it.
    if (test.info().timeout < 150000) test.setTimeout(150000);

    // 'domcontentloaded' not the default 'load': this SPA keeps fetching map tiles / async
    // chunks well past DOMContentLoaded, so waiting for the full 'load' event intermittently
    // blows the 30s test timeout even when the env is healthy.
    await this.page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(new RegExp(`${routes.workorders.root}`));

    const subTab = SUB_TAB[type];
    if (subTab) {
      // Inspection/Harvest WOs live under their own sub-tab (a button, next to the "Work
      // Orders" sub-tab button) which must be opened before the Create button.
      //
      // The sub-tabs mount with the list, which the app fetches behind the truck loader. Do NOT
      // wait the loader out up front: the tab becomes visible behind the overlay anyway, and
      // `waitForLoaderGone` can spend ~20s before the tab wait even starts — on a 30s test that
      // leaves nothing for the click and the form open. `clickPastLoader` below already clears
      // the loader/toasts immediately before it clicks, which is where that wait belongs.
      // Specs that route through a sub-tab therefore raise their own per-test budget.
      const tab = this.page.getByRole('button', { name: subTab, exact: true });
      await expect(tab).toBeVisible({ timeout: 20000 });
      // Confirm on the tab's own selected state, NOT on the Create button: "Create New Work
      // Orders" renders on every tab, so it cannot tell a landed click from one the loader
      // ate. The active tab swaps `btn-outline-primary` for `btn-primary` (verified live
      // 2026-08-27); class ORDER varies between renders, hence a regex over the class list
      // rather than an exact string. `btn-outline-primary` does not contain the substring
      // `btn-primary`, so this matches the active tab only.
      await this.clickPastLoader(tab, () =>
        expect(tab).toHaveClass(/btn-primary/, { timeout: 5000 }),
      );
      await this.waitForLoaderGone(); // the tab switch refetches the list
    }

    // Through `clickPastLoader`, not a bare click: the list keeps fetching behind the truck
    // loader, and a click that lands on the overlay is dropped silently. A bare `.click()`
    // then spends the WHOLE test timeout inside one call's actionability retry ("148 ×
    // ...subtree intercepts pointer events") instead of clearing the loader and trying again.
    // The heading doubles as the confirm, so an eaten click costs a retry rather than a flake.
    const heading =
      type === 'inspection'
        ? this.page.getByRole('heading', { name: /^Create New Work Order\b/i })
        : this.page.getByRole('heading', { name: /^Create New Work Order\b.*Planned/i });
    await this.clickPastLoader(
      this.page.getByRole('button', { name: 'Create New Work Orders' }),
      () => expect(heading).toBeVisible({ timeout: 8000 }),
      // The Create button sits beside the aside menu, whose accordion can cover it mid-animation
      // (observed live: "app-aside ... subtree intercepts pointer events"). That clears on its
      // own, so the budget needs room for several attempts rather than the default one or two.
      { timeout: 75000, clickTimeout: 15000 },
    );
  }

  /**
   * Open a list row's read-only detail view. Same loader hazard as the Create button above:
   * the row action is reachable while the grid is still fetching, so the click needs the
   * clear -> click -> confirm loop rather than a bare `.click()`.
   */
  async openRowDetail(row: Locator): Promise<void> {
    await this.clickPastLoader(row.getByTitle('View Work Order Detail'), () =>
      expect(this.page).toHaveURL(new RegExp(`${routes.workorders.root}/\\d+`), {
        timeout: 8000,
      }),
    );
  }

  /**
   * A work-order type sub-tab. The four are in-page buttons at /workorders, not routes.
   *
   * Scoped to the tab group rather than the page: `Create New Work Orders` sits beside them
   * and also carries `btn-primary`, so a page-wide active-tab check matches it too.
   */
  subTab(name: SubTabName): Locator {
    if (name === 'Point Of Interests') {
      return this.page.getByRole('button', { name: /^(Point Of Interests|Observations)$/ });
    }
    return this.page.getByRole('button', { name, exact: true });
  }

  /** Open a work-order type sub-tab and wait for its dataset to load. */
  async openSubTab(name: SubTabName): Promise<void> {
    const tab = this.subTab(name);
    await expect(tab).toBeVisible({ timeout: 20000 });
    // The active tab swaps `btn-outline-primary` for `btn-primary`; those do not overlap as
    // substrings, so the regex distinguishes them.
    await this.clickPastLoader(tab, () => expect(tab).toHaveClass(/btn-primary/, { timeout: 5000 }));
    await this.waitForLoaderGone();
  }

  /**
   * Open a section's "+" add modal (Add Plot / Add Material / Add Resources / Add Asset),
   * tick the first data row (the header row's checkbox is a select-all and must be avoided),
   * then confirm with the modal's Save. `exact: true` is required so we don't also match the
   * form header's "Save As".
   *
   * Re-verified live 2026-08-26: the plot/block section's add trigger is now titled
   * "Add Plot" (previously "Add Block") and opens the SAME modal-based flow as before —
   * a level-2-heading "Select Plots" modal with a checkbox grid and a Save button, on BOTH
   * the Planned and Inspection forms. `addTitle` accepts more than one string (same pattern
   * as `selectFromDropdown`'s `labels`) because, under concurrent load against the shared QA
   * env, this section has been observed live to intermittently render an OLDER variant of
   * itself — heading "Select Block" (singular) instead of "Select Plot", trigger titled
   * "Add Block" instead of "Add Plot", and "Block Area"/"Activity Area" columns instead of
   * "Plot Area"/"Operational Area" — seemingly a build/deploy inconsistency on the QA host
   * rather than anything WO-type- or Season-driven. Passing both titles keeps the test
   * working regardless of which variant the env serves for a given run; the modal heading
   * regex `/Select (Blocks|Plots)/` already covers both for the same reason. A second button
   * titled "Add Plot using map" sits next to the new-variant trigger — the CSS attribute
   * selector below is an exact match per title so it never collides with the map variant.
   *
   * The form ALSO now renders an inline "Select Plot" table above the modal trigger, with its
   * own "Task Date Range" / "Select Range" filter (an Angular Material date-range picker).
   * That picker is independent of this modal flow and, as of this verification, its min/max
   * are stuck at 1900-01-01 (broken — the calendar has no navigable/selectable day), so it
   * cannot actually be used to filter/populate the inline table. Do NOT interact with it: it
   * is not required to add a plot or to submit — this method's modal path plus a normal
   * Submit succeeds without ever touching "Select Range". Forcing a value into it (e.g. by
   * writing directly to the underlying `<input>`) does NOT flow into the app's own form state
   * and instead makes Submit fail server-side ("Work order operation date range is not within
   * duration of ... season. Please select operation dates between 1/1/1900 ... and 1/1/1900").
   *
   * The add button is waited for explicitly before clicking: selecting a dropdown that drives
   * a section (e.g. the Inspection Template) re-renders the plot/resource block, so an
   * immediate click can race the re-render and never resolve.
   */
  async addFirstFromModal(addTitle: string | string[], modalHeading: RegExp) {
    const heading = await this.openSectionModal(addTitle, modalHeading);
    // Wait for the first data-row checkbox to render — modal rows mount asynchronously
    // after the loader clears, so checking immediately can race the render.
    const firstCheckbox = this.page.locator('tbody tr td input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.check();
    await this.saveSectionModal(heading);
  }

  /**
   * Like `addFirstFromModal`, but ticks the first `count` data rows of the panel, paging
   * forward with the panel's "→" when the current page runs out.
   *
   * Verified live 2026-09-11 (Vann Farm (VBSF) / Fertilization (1240)):
   *   - Select Plots lists every plot for the farm + operation on ONE scrolling page (99 rows,
   *     "99 Total Records") with an "N Plots Selected" counter — no paging, so 30 plots need no
   *     page navigation.
   *   - Select Resources, Select Assets and Select Materials page at 50 rows (101, 557 and 236
   *     records) under a `.pagination-summary` reading "Page 1 of 5 - Showing 1 - 50 of 236
   *     records". Re-verified 2026-09-17: ticks survive moving between pages, and Save adds the
   *     ticks from every page. Half of Materials' first page is "DO NOT USE", so 50 usable
   *     materials always needs page 2.
   *   - Each panel is a `.side-panel` aside, and the rows are scoped to it: once plots are added
   *     the form's own plot grid carries a checkbox per row too, so a page-wide row selector is
   *     one re-render away from ticking the form instead of the panel. The scoping held on both
   *     builds the QA host serves ("Select Plots" and the older "Select Block" variant).
   *   - Re-opening a panel keeps its earlier ticks, so rows are `check()`ed (idempotent), not clicked.
   *
   * `skip` leaves out rows whose text matches, e.g. the "DO NOT USE" entries in Select Materials
   * (re-verified 2026-09-17: 50 rows per page, 5 pages, several of them "DO NOT USE").
   */
  async addFromModal(addTitle: string | string[], modalHeading: RegExp, count: number, skip?: RegExp) {
    const heading = await this.openSectionModal(addTitle, modalHeading);
    const panel = this.page.locator('.side-panel').filter({ has: heading });
    const allRows = panel.locator('tbody tr');
    const rows = allRows.filter(skip ? { hasNotText: skip } : {}).locator('td input[type="checkbox"]');
    const summary = panel.locator('.pagination-summary');
    let ticked = 0;
    for (;;) {
      await expect(allRows.locator('td input[type="checkbox"]').first()).toBeVisible();
      const take = Math.min(await rows.count(), count - ticked);
      for (let i = 0; i < take; i++) await rows.nth(i).check();
      ticked += take;
      if (ticked === count) break;

      const [, current, last] = (await summary.count())
        ? ((await summary.innerText()).match(/Page (\d+) of (\d+)/) ?? [])
        : [];
      if (!current || Number(current) >= Number(last)) {
        throw new Error(`"${modalHeading.source}" has only ${ticked} usable rows; ${count} were asked for`);
      }
      // The summary flips before the rows re-render, and check() on a stale, already-ticked row
      // is a silent no-op, so also wait for the first row to change.
      const nextPage = `Page ${Number(current) + 1} of`;
      const firstRow = await allRows.first().innerText();
      await this.clickPastLoader(panel.locator('.pagination').getByText('→', { exact: true }), () =>
        expect(summary).toContainText(nextPage, { timeout: 10000 }),
      );
      await expect(allRows.first()).not.toHaveText(firstRow, { timeout: 30000 });
      await this.waitForLoaderGone();
    }
    await this.saveSectionModal(heading);
  }

  /**
   * The grid under one of the Create form's section titles (Select Plot / Select Materials /
   * Select Resources / Select Assets). The titles are level-3 headings and each is followed by
   * its own table. `titles` accepts variants for the Plot/Block naming split.
   */
  sectionTable(titles: string | string[]): Locator {
    const list = Array.isArray(titles) ? titles : [titles];
    const match = list.map((t) => `normalize-space()="${t}"`).join(' or ');
    return this.page.locator(`xpath=(//h3[${match}])[1]/following::table[1]`);
  }

  // ---------------------------------------------------------------------------------------
  // Variety (Variety Management PSD, R1). Verified live 2026-09-24 in Firefox.
  // ---------------------------------------------------------------------------------------

  /**
   * The Create form's `Variety` field: an `ng-multiselect-dropdown` (`#select-variety`), not the
   * app's `.dropdown` widget, so `selectFromDropdown` cannot drive it. It renders a
   * `.dropdown-btn` holding one `.selected-item` chip per pick ("WOOD COLONY x") and a
   * `.dropdown-list` (hidden attribute while closed) with `Select All`, a search box and one
   * `li.multiselect-item-checkbox` per variety. The `<li>` takes the click; the checkbox inside
   * it is covered and a direct `check()` times out.
   */
  get varietyPicker(): Locator {
    return this.page.locator('#select-variety');
  }

  /**
   * Open the variety list. Its open state has to be read from visibility: after a pick the list
   * collapses to `display: none` while its `hidden` attribute stays unset (seen 2026-09-24), so
   * each pick reopens it.
   */
  private async openVarietyList(): Promise<Locator> {
    const list = this.varietyPicker.locator('.dropdown-list');
    await expect(async () => {
      if (!(await list.isVisible())) {
        await this.waitForLoaderGone();
        // The caret, not the button's middle: once a variety is picked, the middle is its chip.
        await this.varietyPicker.locator('.dropdown-multiselect__caret').click({ timeout: 5000 });
      }
      await expect(list).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 30000 });
    return list;
  }

  /** Close the variety list by clicking the form heading, the one neutral spot above it. */
  private async closeVarietyList(): Promise<void> {
    const list = this.varietyPicker.locator('.dropdown-list');
    if (await list.isVisible()) {
      await this.page.getByRole('heading', { name: /^Create New Work Order\b/ }).click();
    }
    await expect(list).toBeHidden();
    await this.waitForLoaderGone();
  }

  /** Every variety the field offers, in list order (without `Select All`). */
  async varietyOptions(): Promise<string[]> {
    const list = await this.openVarietyList();
    const names = (await list.locator('ul.item2 li').allInnerTexts()).map((s) => s.trim());
    await this.closeVarietyList();
    return names.filter(Boolean);
  }

  /** A Variety chip. Its text is "<name>&nbsp;x", so an exact text match misses it. */
  private varietyChip(name: string): Locator {
    const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    return this.varietyPicker.locator('.selected-item').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*x?\\s*$`) });
  }

  /** Tick each named variety. Already-selected names are left alone. */
  async selectVarieties(names: string[]): Promise<void> {
    const selected = await this.selectedVarieties();
    for (const name of names) {
      if (selected.includes(name)) continue;
      // Retried as a unit: the list closes a beat AFTER a pick, so a reopen check made straight
      // after the previous pick can see it still open and then click into a closed list.
      await expect(async () => {
        const list = await this.openVarietyList();
        await list.locator('input[aria-label="multiselect-search"]').fill(name);
        await list
          .locator('ul.item2 li.multiselect-item-checkbox')
          .filter({ has: this.page.getByText(name, { exact: true }) })
          .click({ timeout: 5000 });
        await expect(this.varietyChip(name)).toHaveCount(1, { timeout: 3000 });
      }).toPass({ timeout: 45000 });
    }
    if (await this.varietyPicker.locator('.dropdown-list').isVisible()) {
      await this.varietyPicker.locator('input[aria-label="multiselect-search"]').fill('');
    }
    await this.closeVarietyList();
  }

  /** Remove one variety through its chip's `x`. */
  async deselectVariety(name: string): Promise<void> {
    await this.waitForLoaderGone();
    await this.varietyChip(name).locator('a').click();
    await this.waitForLoaderGone();
  }

  /** The chips currently shown in the Variety field. */
  async selectedVarieties(): Promise<string[]> {
    const chips = await this.varietyPicker.locator('.selected-item').allInnerTexts();
    return chips.map((c) => c.replace(/\u00a0/g, ' ').replace(/\s*x\s*$/, '').trim()).filter(Boolean);
  }

  /**
   * Open the Select Plots panel and return it with the `POST /api/activity/blocks` exchange that
   * filled it. The request carries the Variety field as `cropVarietyIDs` (one id per chip), and
   * each returned block has `varieties` + `totalApplicableAcreage` — the GP field-to-variety
   * mapping the PSD's R1 FR-1 synchronises. The panel shows neither, so specs assert on these.
   */
  async openPlotPicker(): Promise<PlotPicker> {
    const response = this.page.waitForResponse(
      (r) => /\/api\/activity\/blocks/i.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60000 },
    );
    const heading = await this.openSectionModal(PLOT_ADD_TITLES, PLOT_PANEL_HEADING);
    const res = await response;
    const body = (await res.json()) as { data?: PlotBlock[] };
    const panel = this.page.locator('.side-panel').filter({ has: heading });
    return {
      panel,
      heading,
      rows: panel.locator('tbody tr').filter({ has: this.page.locator('input[type="checkbox"]') }),
      blocks: body.data ?? [],
      cropVarietyIDs: (JSON.parse(res.request().postData() ?? '{}').cropVarietyIDs ?? []) as number[],
    };
  }

  /** Close the Select Plots panel without saving (its reject icon, not Save). */
  async closePlotPicker(picker: PlotPicker): Promise<void> {
    // The reject icon sits beside Save in the heading's header row (both panel variants).
    await this.clickPastLoader(picker.heading.locator('xpath=../..').locator('a.icon-reject-btn'), () =>
      expect(picker.heading).toBeHidden({ timeout: 10000 }),
    );
  }

  /** Tick the picker's first `count` rows and Save. */
  async addPlotsFromPicker(picker: PlotPicker, count: number): Promise<void> {
    for (let i = 0; i < count; i++) await picker.rows.nth(i).locator('input[type="checkbox"]').check();
    await this.saveSectionModal(picker.heading);
  }

  // ---------------------------------------------------------------------------------------
  // Resources (Dummy Resources PSD v2). QA still serves the v1 panel as of 2026-09-24.
  // ---------------------------------------------------------------------------------------

  /** The Select Resources section's "+" (`title="Add Resources"`). */
  get addResourcesButton(): Locator {
    return this.page.locator('button[title="Add Resources"]');
  }

  /**
   * PSD v2 Figure 1: the "+" opens a menu with `Add Resource` and `Add Dummy Resource`. The menu's
   * DOM is not on QA yet, so the items are located by their text alone.
   */
  addResourceMenuItem(name: 'Add Resource' | 'Add Dummy Resource'): Locator {
    return this.page.getByText(name, { exact: true });
  }

  /**
   * The v1 "Dummy Resource" No/Yes switch inside Select Resources (`#dummyResourceFilter`, a
   * Bootstrap custom-switch whose `<label>` carries the No/Yes text). PSD v2 removes it.
   */
  get dummyResourceSwitch(): Locator {
    return this.page.locator('#dummyResourceFilter');
  }

  /**
   * Add the first dummy resource to the form through whichever flow the build serves: the v2
   * `Add Dummy Resource` menu item, or the v1 panel with the Dummy Resource switch set to Yes.
   * Returns the added resource's name as the panel lists it (e.g. `Irrigator (DM002)`).
   */
  async addFirstDummyResource(): Promise<string> {
    await expect(this.addResourcesButton).toBeVisible({ timeout: 30000 });
    const v1Heading = this.page.getByRole('heading', { name: /^Select Resources/, level: 2 });
    const v2Heading = this.page.getByRole('heading', { name: /^Add Dummy Resource/, level: 2 });
    const v2Item = this.addResourceMenuItem('Add Dummy Resource');
    await this.clickPastLoader(this.addResourcesButton, () =>
      expect(v1Heading.or(v2Item)).toBeVisible({ timeout: 8000 }),
    );

    let heading: Locator;
    if (await v2Item.isVisible()) {
      await v2Item.click();
      heading = v2Heading;
      await expect(heading).toBeVisible();
    } else {
      heading = v1Heading;
      await this.waitForLoaderGone();
      const switchLabel = this.page.locator('label[for="dummyResourceFilter"]');
      if (!(await this.dummyResourceSwitch.isChecked())) await switchLabel.click();
      await expect(switchLabel).toHaveText(/Yes/);
      // Apply re-fetches, but the named-resource rows linger for a moment; wait for the first row
      // to change, or the tick lands on a stale named resource (seen 2026-09-24).
      const panel = this.page.locator('.side-panel').filter({ has: heading });
      const firstRow = panel.locator('tbody tr').first();
      const before = await firstRow.innerText();
      await panel.getByRole('button', { name: 'Apply' }).click();
      await expect(firstRow).not.toHaveText(before, { timeout: 30000 });
    }
    await this.waitForLoaderGone();
    const panel = this.page.locator('.side-panel').filter({ has: heading });
    const row = panel.locator('tbody tr').filter({ has: this.page.locator('input[type="checkbox"]') }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    const name = (await row.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();
    await row.locator('input[type="checkbox"]').check();
    await this.saveSectionModal(heading);
    return name.replace(/\s*DUMMY RESOURCE\s*$/i, '');
  }

  // ---------------------------------------------------------------------------------------
  // List "Set Filters" panel (Work Orders list). Variety added by the Variety PSD, R1 FR-5.
  // ---------------------------------------------------------------------------------------

  /** The list's `Set Filters` aside, opened from the `Filter` button beside the status chips. */
  async openListFilters(): Promise<Locator> {
    const panel = this.page.locator('app-aside').filter({ hasText: 'Set Filters' });
    await this.clickPastLoader(this.page.getByRole('button', { name: /^\s*Filter\b/ }), () =>
      expect(panel).toBeVisible({ timeout: 8000 }),
    );
    return panel;
  }

  /**
   * Pick one value in a `Set Filters` dropdown and Apply. Scoped to the panel: a page-wide label
   * lookup would hit the grid's own `Variety` column header first.
   */
  async applyListFilter(label: string, option: string): Promise<void> {
    const panel = await this.openListFilters();
    await panel
      .locator('label', { hasText: new RegExp(`^\\s*${label}\\s*$`) })
      .locator('xpath=following::button[1]')
      .click();
    const menu = this.page.locator('.dropdown.show');
    await expect(menu).toBeVisible();
    await menu.locator('input').first().fill(option);
    await menu.getByText(option, { exact: true }).click();
    await panel.getByRole('button', { name: 'Apply' }).click();
    await this.waitForLoaderGone();
  }

  /** Reset and re-apply the `Set Filters` panel so later specs see the unfiltered list. */
  async resetListFilters(): Promise<void> {
    const panel = await this.openListFilters();
    await panel.getByRole('button', { name: 'Reset' }).click();
    await this.waitForLoaderGone();
    if (await panel.isVisible()) await panel.getByRole('button', { name: 'Apply' }).click();
    await this.waitForLoaderGone();
  }

  /** Open a section's "+" add modal and wait out its row fetch. Returns the modal's heading. */
  private async openSectionModal(addTitle: string | string[], modalHeading: RegExp): Promise<Locator> {
    // The modal title is a level-2 heading; the form's own section title reuses the same
    // text as a level-3 heading, so scope to level 2 to target the modal unambiguously.
    const heading = this.page.getByRole('heading', { name: modalHeading, level: 2 });
    // `.first()`: only one title variant is ever actually rendered at a time, but combining
    // both into one selector (via the comma "or" combinator) means the locator itself stays
    // resolvable — without `.first()`, `toBeVisible()`/`.click()` would throw a strict-mode
    // violation if both selectors somehow matched (e.g. a stray leftover node mid-transition).
    const titles = Array.isArray(addTitle) ? addTitle : [addTitle];
    const addBtn = this.page.locator(titles.map((t) => `button[title="${t}"]`).join(', ')).first();
    // The section can keep rendering after the loader clears (e.g. Inspection Template fetch),
    // so allow extra time for the add trigger to mount.
    await expect(addBtn).toBeVisible({ timeout: 30000 });
    // Open the modal; retry past any loader/toast that re-covers the button mid-fetch.
    await this.clickPastLoader(addBtn, () => expect(heading).toBeVisible({ timeout: 5000 }));
    await this.waitForLoaderGone(); // modal rows load behind the loader
    return heading;
  }

  /** Save a section modal and confirm it closed. */
  private async saveSectionModal(heading: Locator) {
    // A validation toast or the loader can cover Save, so retry until the heading is gone.
    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
    // Longer confirm window than the add-click: Save fires a server round-trip behind the
    // loader, so the modal can take a few seconds to close. A short window risks re-clicking
    // Save (double-add) before the first save resolves.
    await this.clickPastLoader(saveBtn, () => expect(heading).toBeHidden({ timeout: 15000 }));
  }

  /**
   * Tank-mix only: open the Material Template dropdown, pick the FIRST available template,
   * and confirm the "Are you sure you want to apply material template?" alert with Yes.
   *
   * Applying a template auto-populates the Select Materials grid (Material / Rate / Unit /
   * Mix Method / Per) and carries the per-material application details — so the tank-mix
   * happy path needs no manual material entry. Templates are bound to a Task, so the Task*
   * dropdown MUST be set before calling this.
   *
   * The list is data-driven: a tenant's active Site/Season may have NO tank-mix template for
   * the chosen Task, in which case the dropdown renders zero option rows. Returns the chosen
   * template name, or `null` when none exist (callers should `test.skip` on null) — this keeps
   * the suite green regardless of current QA template data.
   *
   * The control is the app's custom `.dropdown` (a `#myDropdown` menu whose only fixed child is
   * the sticky `#searchTextbox`; options are sibling `.dropdown-item` rows).
   */
  async applyFirstMaterialTemplate(): Promise<string | null> {
    await this.waitForLoaderGone();
    await this.page
      .locator('xpath=(//*[normalize-space(text())="Material Template"])/following::button[1]')
      .first()
      .click();

    const menu = this.page.locator('#myDropdown.show').last();
    await expect(menu).toBeVisible();
    await this.waitForLoaderGone(); // templates fetch behind the loader after the Task is set

    const options = menu.locator(':scope > *:not(#searchTextbox)');
    if ((await options.count()) === 0) {
      await this.page.keyboard.press('Escape'); // close the empty dropdown
      return null;
    }

    const name = (await options.first().innerText()).trim();
    await options.first().click();
    const yes = this.page.getByRole('button', { name: 'Yes', exact: true });
    await expect(yes).toBeVisible();
    await yes.click();
    await this.waitForLoaderGone(); // materials auto-fetch behind the loader
    return name;
  }

  /**
   * Fill and submit a whole Planned or Harvest WO with `n` rows from each section panel, then
   * return the new WO's sequence number (e.g. `WO-1244`) from the success toast. Used by the
   * `seed` project (tests/seed/) to make test data in bulk.
   *
   * A section with a count of 0 is skipped. Plots come first because Select Resources refuses
   * to open without one ("Please Select Any Block Before Adding Resources", seen 2026-09-17).
   * Each grid's row count is checked before Submit, so a tick the panel dropped fails here
   * instead of saving a smaller WO than was asked for. Harvest forms have no Materials section.
   */
  async createWorkOrder(
    type: 'planned' | 'harvest',
    wo: WoScenario & { plots: number; materials: number; resources: number; assets: number },
  ): Promise<string> {
    if (type === 'harvest' && wo.materials > 0) {
      throw new Error('Harvest work orders have no Materials section; use materials: 0');
    }
    await this.openCreateForm(type);

    await this.page.getByRole('textbox', { name: 'Work Order Name*' }).fill(wo.name);
    await this.selectFromDropdown(['Priority*'], wo.priority);
    await this.selectFromDropdown(['Farm*'], wo.farm);
    await this.selectFromDropdown(['Operation*', 'Task*'], wo.task);

    // [section count, add-button titles, panel heading, form grid titles, rows to leave out]
    const sections: [number, string[], RegExp, string[], RegExp?][] = [
      [wo.plots, ['Add Plot', 'Add Block'], /Select (Blocks|Plots)/, ['Select Plot', 'Select Block']],
      [wo.materials, ['Add Material'], /Select Materials/, ['Select Materials'], /DO NOT USE/i],
      // Keep the supervisor out of the resource list (see SUPERVISOR in workOrderScenarios.ts).
      [wo.resources, ['Add Resources'], /Select Resources/, ['Select Resources'],
        wo.supervisor ? new RegExp(wo.supervisor.replace(/\s*\(.*\)$/, ''), 'i') : undefined],
      [wo.assets, ['Add Asset'], /Select Assets/, ['Select Assets']],
    ];
    for (const [count, addTitles, heading, gridTitles, skip] of sections) {
      if (count <= 0) continue;
      await this.addFromModal(addTitles, heading, count, skip);
      await expect(this.sectionTable(gridTitles).locator('tbody tr')).toHaveCount(count);
    }

    // Supervisor LAST: the section saves above re-render the form and wipe an earlier pick.
    if (wo.supervisor) await this.selectFromDropdown(['Supervisor*'], wo.supervisor);

    await this.submitAndConfirm();
    const toast = this.page.getByText(savedToast(wo.name));
    // Large WOs take a while to save (WP-093 measures exactly this), so allow up to two minutes.
    // Seen 2026-09-17 with 99 plots + 50 materials + 50 assets: POST /api/workOrder never
    // answered, yet the server stored the WO twice, both copies broken (see FINDINGS.md).
    await expect(
      toast,
      `no "Saved Successfully" toast for "${wo.name}"; the server may still have stored ` +
        'partial copies under that name, so search the list for it',
    ).toBeVisible({ timeout: 120000 });
    return (await toast.innerText()).match(/WO-\d+/)![0];
  }

  /**
   * Submit the Create form and confirm the "Create Work Order" dialog.
   * Submit alone does NOT save — it raises a confirm dialog whose Save commits the WO.
   * Returns after the dialog's Save is clicked; callers assert the success toast.
   */
  async submitAndConfirm() {
    await this.waitForLoaderGone();
    await this.waitForToastsGone(); // toasts can block the Submit button click
    const submit = this.page.getByRole('button', { name: 'Submit' });
    await expect(submit).toBeEnabled();
    await submit.click();

    const confirm = this.page.getByRole('dialog');
    await expect(
      confirm.getByText(/Are You Sure You Want To Save The Work Order/i),
    ).toBeVisible();
    await this.waitForToastsGone(); // toasts can block the Save button in the confirm dialog
    await confirm.getByRole('button', { name: 'Save', exact: true }).click();
  }
}

/** Regex matching the success toast: `Work Order WO-XXXXX | <name> Saved Successfully`. */
export function savedToast(woName: string): RegExp {
  const escaped = woName.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(`Work Order WO-\\d+ \\| ${escaped} Saved Successfully`, 'i');
}

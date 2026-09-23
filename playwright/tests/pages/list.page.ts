import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * The application's shared data grid.
 *
 * The same `app-f3-table` widget backs Work Orders, Harvest Central, Template Management,
 * Settings and User Management, so the workbook's seven `Global - Data Grids` cases
 * (GN-037..GN-043) and the per-module `List - *` cases are the same mechanics tested against
 * different data. One page object serves them all.
 *
 * Verified live against /workorders on 2026-09-07:
 *  - Column headers are `app-f3-table-header-search`: a `div.table-header-search` whose
 *    `title` is the column name and which toggles a `Type And Enter` search input, plus a
 *    `Reset Clear Column Filter` button and a sort icon.
 *  - The footer holds a `Page Size` <select> (10/20/50/100, default 50) and the label
 *    `Page X of Y - Showing A - B of N records`.
 */

/**
 * Column-name variants the QA environment serves for the SAME column.
 *
 * The host intermittently renders an older labelling of the work-order grid — `Seq No` for
 * `WO Sequence No.`, `Blocks` for `Plots`, `Operation` for `Task` — seemingly a build/deploy
 * inconsistency rather than anything driven by user, season or WO type. Both variants have
 * been observed minutes apart in the same session (2026-09-07), which is the same
 * "Add Plot"/"Add Block" drift already documented on `WorkOrdersPage.addFirstFromModal`.
 *
 * A spec that hardcodes either spelling therefore passes or fails on which build the env
 * happens to serve, so every column lookup here resolves through this table. Keys are the
 * workbook's wording; values list every spelling seen live.
 */
const COLUMN_VARIANTS: Record<string, string[]> = {
  'WO Sequence No.': ['WO Sequence No.', 'Seq No'],
  'WO Name': ['WO Name', 'Wo Name'],
  'WO Start Date': ['WO Start Date', 'Wo Start Date'],
  'WO End Date': ['WO End Date', 'Wo End Date'],
  Plots: ['Plots', 'Blocks'],
  Task: ['Task', 'Operation'],
  Actions: ['Actions', 'Action'],

  // Settings > Plot (ADO #26093). This grid sets its header `title` to the API FIELD NAME
  // rather than to the rendered label — `title="code"` under a `Field Code` heading, and so on
  // for all seven columns (verified live 2026-09-23). `expectColumns` reads `thead th` text so
  // it passes regardless, but `searchColumn`/`sortColumn` resolve through `title` and matched
  // nothing at all: the click waited out the full test timeout. Mapping the display name to the
  // served attribute is what this table is for.
  'Field Code': ['Field Code', 'code'],
  'Field Name': ['Field Name', 'name'],
  Site: ['Site', 'locationName'],
  Farm: ['Farm', 'farmName'],
  'Total Area': ['Total Area', 'area'],
  'Irrigation Method': ['Irrigation Method', 'irrigationMethodCode'],
  'Irrigation Sources': ['Irrigation Sources', 'irrigationSources'],
};

/** Every spelling a column may render under. Unknown columns map to themselves. */
export function columnVariants(column: string): string[] {
  if (COLUMN_VARIANTS[column]) return COLUMN_VARIANTS[column];
  // Also accept being handed a variant rather than the canonical name.
  const entry = Object.values(COLUMN_VARIANTS).find((v) => v.includes(column));
  return entry ?? [column];
}

// Parentheses are dropped as well as whitespace collapsed: a header written `Unit Cost ($)`
// reads back from innerText as `Unit Cost $`, and the two must compare equal.
const normalise = (value: string) =>
  value.replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** `Page 1 of 17 - Showing 1 - 50 of 841 records` */
export interface RecordCount {
  page: number;
  pages: number;
  from: number;
  to: number;
  total: number;
}

export class ListPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get table(): Locator {
    return this.page.locator('table').first();
  }

  /**
   * The grid's DATA rows.
   *
   * Opening a column search injects an extra `tr.row-has-search` into the same tbody — an
   * all-empty spacer that carries the search inputs. It is excluded here because it would
   * otherwise inflate every row count by one (a 50-row page reports 51) and put a blank
   * leading value into every `columnValues()` read, which reads as a data bug rather than a
   * DOM artefact. Verified live 2026-09-07.
   */
  get rows(): Locator {
    return this.table.locator('tbody tr:not(.row-has-search)');
  }

  /**
   * Wait for the grid to finish fetching.
   *
   * The grid does NOT use the app's `#f3-overlay-loader` truck overlay. It renders a full
   * page of placeholder rows — real `<tr>`s whose cells hold `span.skeleton-box` — and swaps
   * them for data in place. So `waitForLoaderGone()` returns immediately and a row-visible
   * check passes against a skeleton: the caller then reads a header with no data behind it
   * and a footer still showing `Page 1 of 0 - Showing 1 - NaN of records`.
   *
   * Every method here that triggers a fetch ends with this. Verified live 2026-09-07.
   */
  async waitForGridSettled({ timeout = 45000 }: { timeout?: number } = {}): Promise<void> {
    await this.waitForLoaderGone();
    const skeleton = this.page.locator('span.skeleton-box');
    // Give the fetch a beat to paint its skeletons BEFORE checking they are gone. Without
    // this the count is sampled in the gap between the click and the re-render, passes
    // against the previous page's rows, and the caller asserts on stale data — which is how
    // a working sort reported "dates not ordered desc".
    await skeleton.first().waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
    await expect(skeleton).toHaveCount(0, { timeout });

    // The skeletons clearing is still not the end: the grid can settle a step BEHIND the
    // action. Applying a second column filter briefly renders the first filter's result set,
    // and the footer reports the count from the request before it (measured live 2026-09-07:
    // filter Task, read 841 — the unfiltered total; then filter Status, read 117 — the
    // Task-only total).
    //
    // Waiting here for the footer to stop changing was tried and made things worse: the
    // extra dwell pushed several specs past their budget while still racing a second fetch.
    // The lag is the grid's, so it is absorbed where it belongs — in the assertions, via
    // `expect.poll`, so a spec asserts the state the grid ARRIVES at rather than the first
    // one it happens to render.
  }

  /**
   * One column's header component, matched on any of the spellings the env may serve.
   * See COLUMN_VARIANTS for why this is not a single title.
   */
  private headerCell(column: string): Locator {
    // Case-insensitive attribute match (`i` flag): the Settings grids set the title in
    // lowercase (`name`, `code`) while rendering `Name`/`Code`, so a case-sensitive selector
    // silently matches nothing there (verified live 2026-09-07).
    const selector = columnVariants(column)
      .map((name) => `div.table-header-search[title="${name}" i]`)
      .join(', ');
    return this.table
      .locator('app-f3-table-header-search')
      .filter({ has: this.page.locator(selector) });
  }

  /** Visible column header names, in order. */
  async columnNames(): Promise<string[]> {
    const headers = await this.table.locator('thead th').allInnerTexts();
    return headers.map((h) => h.trim()).filter(Boolean);
  }

  /** A status filter chip (All / Queue / Draft / To Do / In Progress / Review / Done). */
  chip(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /**
   * Click a status chip and wait for the grid to reload behind the loader.
   * The chips are plain buttons whose active state is a class swap, same as the sub-tabs.
   */
  async filterByStatus(name: string): Promise<void> {
    // The active chip swaps `btn-outline-primary` for `btn-primary`. Those do not overlap as
    // substrings, so the regex distinguishes them (verified live 2026-09-07).
    await this.clickPastLoader(this.chip(name), async () => {
      await expect(this.chip(name)).toHaveClass(/btn-primary/, { timeout: 5000 });
    });
    await this.waitForGridSettled();
  }

  /**
   * The grid footer's summary: `Page Size <select> Page X of Y - Showing A - B of N records`.
   *
   * Located structurally rather than by its text. A `getByText` on the "Showing ... records"
   * wording resolves nothing while the footer is still mounting — the rows paint first — so
   * a text locator made every reader here race the render and return null.
   */
  get recordLabel(): Locator {
    return this.page.locator('.pagination-summary');
  }

  /**
   * Parse the footer label. Returns null when it is absent — an empty grid renders no
   * counts, and callers assert the empty state instead.
   */
  async recordCount(): Promise<RecordCount | null> {
    // Wait for the footer rather than sampling it: it mounts a beat after the rows.
    await this.recordLabel.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    if (!(await this.recordLabel.count())) return null;
    const text = await this.recordLabel.innerText();
    const m = text.match(
      /Page\s+(\d+)\s+of\s+(\d+)\s*-\s*Showing\s+(\d+)\s*-\s*(\d+)\s+of\s+(\d+)\s+records/i,
    );
    if (!m) return null;
    const [, page, pages, from, to, total] = m.map(Number);
    return { page, pages, from, to, total };
  }

  /** The Page Size <select> in the grid footer. */
  get pageSizeSelect(): Locator {
    return this.recordLabel.locator('select');
  }

  async setPageSize(size: '10' | '20' | '50' | '100'): Promise<void> {
    await this.waitForGridSettled();
    await this.pageSizeSelect.selectOption(size);
    await this.waitForGridSettled();
  }

  /**
   * A pager control. `.pagination` renders `«` (first), `←` (previous), the numbered pages,
   * `→` (next) and `»` (last) as bare `<a>` elements — no roles, no accessible names — so
   * they are matched on their glyph text.
   */
  pager(target: 'first' | 'previous' | 'next' | 'last' | number): Locator {
    const glyphs = { first: '«', previous: '←', next: '→', last: '»' } as const;
    const name = typeof target === 'number' ? String(target) : glyphs[target];
    return this.page
      .locator('.pagination a')
      .filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) })
      .first();
  }

  /** The currently selected page number in the pager. */
  get activePage(): Locator {
    return this.page.locator('.pagination a.active');
  }

  async goToPage(target: 'first' | 'previous' | 'next' | 'last' | number): Promise<void> {
    await this.waitForGridSettled();
    await this.pager(target).click();
    await this.waitForGridSettled();
  }

  /** A column's header label. Not the search trigger — see `searchColumn`. */
  header(column: string): Locator {
    return this.headerCell(column).locator('div.table-header-search');
  }

  /** 1-based position of a column in the current header row, resolving label variants. */
  async columnIndex(column: string): Promise<number> {
    const names = await this.columnNames();
    const wanted = columnVariants(column).map(normalise);
    const index = names.findIndex((n) => wanted.includes(normalise(n)));
    if (index < 0) throw new Error(`Column "${column}" not found. Columns: ${names.join(' | ')}`);
    return index + 1;
  }

  /**
   * Type a value into a column's search box and apply it.
   *
   * Two non-obvious mechanics, both verified live 2026-09-07:
   *
   *  - The trigger is the header's search BUTTON, matched by its `fa-search` icon rather
   *    than its title. Clicking the column label is inert. The title is NOT stable: the two
   *    builds this env serves spell it `Search Column Filter` and `Search by column filter`,
   *    and the sort icon's title drifts the same way — so every control here is matched
   *    structurally.
   *  - The revealed input is NOT inside the header cell. It renders in a separate
   *    `tr.row-has-search` row in the tbody, one `app-f3-table-search-cell` per column, so it
   *    is addressed by column position rather than by scoping to the header.
   *
   * The input is matched structurally rather than by placeholder: that text drifts between
   * builds too (`Type And Enter` and `Type & Enter` both observed within one session), and
   * with several searches open at once a placeholder lookup cannot say which column it hit.
   * Filtering happens on Enter, so the Enter press IS the apply.
   */
  async searchColumn(column: string, value: string): Promise<void> {
    await this.waitForGridSettled();
    const index = await this.columnIndex(column);
    await this.headerCell(column).locator('button:has(i.fa-search)').click();

    const input = this.table.locator(`tr.row-has-search td:nth-child(${index}) input`);
    await expect(input).toBeVisible();
    await input.fill(value);
    await input.press('Enter');
    await this.waitForGridSettled();
  }

  /**
   * Clear one column's search. The reset button (`fa-close`) replaces the search button on a
   * column that currently carries a filter, so its absence means there is nothing to clear.
   * Matched by icon, not title — see `searchColumn`.
   */
  async clearColumnSearch(column: string): Promise<void> {
    const reset = this.headerCell(column).locator('button:has(i.fa-close)');
    if (await reset.count()) {
      await reset.first().click();
      await this.waitForGridSettled();
    }
  }

  /**
   * Clear every column filter currently applied to the grid.
   *
   * Column filters are STICKY: they survive navigation away and back, and a fresh browser
   * context started from the same stored session still has them (verified live 2026-09-07 —
   * a filter applied in one run was still narrowing the grid in the next). A column carrying
   * a filter renders a reset button (`fa-close`) in place of its search button, which is how
   * an active filter is detected without knowing what was set.
   *
   * Every grid spec must call this before asserting, or it inherits whatever the previous
   * test — or the previous RUN, or a human using the QA env — left behind, and its row
   * assertions fail against data that was filtered for unrelated reasons.
   */
  async clearAllColumnFilters(): Promise<void> {
    await this.waitForGridSettled();
    const resets = this.table.locator('app-f3-table-header-search button:has(i.fa-close)');
    // Each clear re-renders the header row, so re-query rather than iterating a stale list.
    // Bounded to the column count so a reset that fails to clear cannot spin forever.
    for (let attempt = 0; attempt < 20 && (await resets.count()) > 0; attempt += 1) {
      await resets.first().click();
      await this.waitForGridSettled();
    }
    await expect(resets).toHaveCount(0);
  }

  /**
   * Toggle a column's sort: unsorted -> descending (`fa-sort-down active`) -> ascending
   * (`fa-sort-up active`). The icon's `title` names the action it WILL perform, not the
   * current state, so `sortDirection` reads the class instead.
   */
  async sortColumn(column: string): Promise<void> {
    await this.waitForGridSettled();
    // The click target is the SPAN wrapping the sort icon, not the icon itself and not the
    // column label — clicking either of those is silently inert (verified live 2026-09-07).
    await this.headerCell(column).locator('span.pt-2').first().click();
    await this.waitForGridSettled();
  }

  /** The column's current sort direction, or null when it is unsorted. */
  async sortDirection(column: string): Promise<'asc' | 'desc' | null> {
    const cls = (await this.headerCell(column).locator('span i').first().getAttribute('class')) ?? '';
    if (!cls.includes('active')) return null;
    return cls.includes('fa-sort-up') ? 'asc' : 'desc';
  }

  /** Every value in one column, for the rows currently rendered. */
  async columnValues(column: string): Promise<string[]> {
    const names = await this.columnNames();
    const wanted = columnVariants(column).map(normalise);
    const index = names.findIndex((n) => wanted.includes(normalise(n)));
    if (index < 0) throw new Error(`Column "${column}" not found. Columns: ${names.join(' | ')}`);
    return (await this.rows.locator(`td:nth-child(${index + 1})`).allInnerTexts()).map((t) =>
      t.trim(),
    );
  }

  /**
   * Assert the grid renders exactly this column set, resolving each name through
   * COLUMN_VARIANTS so the assertion holds under either build.
   *
   * Compares the rendered HEADER TEXT, not the header search widget: only searchable columns
   * carry an `app-f3-table-header-search`, so locating by that would report a perfectly
   * present column (Resource Group Name, Varieties, Color) as missing.
   */
  async expectColumns(expected: readonly string[]): Promise<void> {
    const canonical = (name: string) => normalise(columnVariants(name)[0]);
    await expect
      .poll(
        async () => (await this.columnNames()).map(canonical).join(' | '),
        { timeout: 20000, message: 'grid never rendered the expected column set' },
      )
      .toBe(expected.map(canonical).join(' | '));
  }

  get refreshButton(): Locator {
    return this.page.getByRole('button', { name: 'Refresh Data' });
  }

  async refresh(): Promise<void> {
    await this.waitForGridSettled();
    await this.refreshButton.click();
    await this.waitForGridSettled();
  }

  /** The grid's empty state. */
  get emptyState(): Locator {
    return this.page.getByText(/No Record(s)? Found|No records found/i).first();
  }
}

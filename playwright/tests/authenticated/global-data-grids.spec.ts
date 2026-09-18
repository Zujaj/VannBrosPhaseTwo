import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Global - Data Grids. Workbook tab `01 Global & Navigation`, GN-037..GN-043.
 *
 * One `app-f3-table` widget backs Work Orders, Harvest Central, Template Management,
 * Settings and User Management, so these cases are exercised once, against the Work Orders
 * list — the largest dataset in the tenant (841 rows at time of writing), which is what
 * makes the paging and sorting assertions meaningful.
 *
 * All non-mutating: reads, filters and paging only.
 */

test.beforeEach(async ({ page, listPage }) => {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  // Not just "a row is visible" — the grid paints skeleton rows first, and every one of them
  // is visible. See ListPage.waitForGridSettled.
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  // Column filters are sticky across runs and sessions, so start from a known-unfiltered
  // grid — otherwise these tests assert against whatever the last run (or a human on the
  // shared QA env) left applied. See ListPage.clearAllColumnFilters.
  await listPage.clearAllColumnFilters();
});

test.afterEach(async ({ listPage }) => {
  // ...and hand the environment back unfiltered, for the same reason.
  await listPage.clearAllColumnFilters().catch(() => {});
});

test('@TC:GN-037 page size switching reloads the grid and keeps the record label accurate', async ({
  listPage,
}) => {
  const initial = await listPage.recordCount();
  expect(initial, 'grid must render its record-count label').not.toBeNull();
  // Live default is 50 (verified 2026-09-07).
  await expect(listPage.pageSizeSelect).toHaveValue('50');
  expect(await listPage.rows.count()).toBe(50);

  for (const size of ['10', '20', '100'] as const) {
    await listPage.setPageSize(size);

    const count = await listPage.recordCount();
    expect(count).not.toBeNull();
    // The label must describe the page actually rendered, so check it against the DOM rather
    // than against the requested size — that is what "stays accurate" means here.
    const rendered = await listPage.rows.count();
    expect(rendered).toBe(Math.min(Number(size), count!.total));
    expect(count!.to - count!.from + 1).toBe(rendered);
    // The total is a property of the dataset, not of the page size.
    expect(count!.total).toBe(initial!.total);
  }
});

test('@TC:GN-038 first/previous/next/last paginate without duplicating or skipping rows', async ({
  listPage,
}) => {
  // Five sequential grid fetches, each waiting out the skeleton render.
  test.setTimeout(120000);
  // A small page keeps the row sets easy to compare and the assertions fast.
  await listPage.setPageSize('10');
  const start = await listPage.recordCount();
  expect(start!.pages).toBeGreaterThan(2); // otherwise the traversal below proves nothing

  const idsOn = async () => listPage.columnValues('WO Sequence No.');
  const page1 = await idsOn();
  expect(page1.length).toBe(10);

  await listPage.goToPage('next');
  const page2 = await idsOn();
  expect((await listPage.recordCount())!.page).toBe(2);
  // No row appears on two consecutive pages.
  expect(page2.filter((id) => page1.includes(id))).toEqual([]);
  // ...and page 2 starts exactly where page 1 stopped — this is what catches a skipped row,
  // which a duplicates-only check would miss.
  expect((await listPage.recordCount())!.from).toBe(start!.to + 1);

  await listPage.goToPage('previous');
  expect((await listPage.recordCount())!.page).toBe(1);
  expect(await idsOn()).toEqual(page1);

  await listPage.goToPage('last');
  const last = await listPage.recordCount();
  expect(last!.page).toBe(last!.pages);
  expect(last!.to).toBe(last!.total);

  await listPage.goToPage('first');
  expect((await listPage.recordCount())!.page).toBe(1);
  expect(await idsOn()).toEqual(page1);
});

test('@TC:GN-039 a per-column search filters the grid and clears cleanly', async ({ listPage }) => {
  const before = await listPage.recordCount();

  // "Irrigation" is an operation present in the tenant's data; any row it matches must carry
  // it in that column.
  // Polled: the grid paints the unfiltered set for a beat after the search is submitted, so
  // a single read can catch the pre-filter total. Same reason as GN-040 below.
  await listPage.searchColumn('Task', 'Irrigation');
  await expect
    .poll(async () => (await listPage.recordCount())!.total, { timeout: 20000 })
    .toBeLessThan(before!.total);
  for (const value of await listPage.columnValues('Task')) {
    expect(value).toMatch(/Irrigation/i);
  }

  await listPage.clearColumnSearch('Task');
  expect((await listPage.recordCount())!.total).toBe(before!.total);
});

test('@TC:GN-040 multiple column searches combine with AND logic', async ({ listPage }) => {
  await listPage.searchColumn('Task', 'Irrigation');
  const oneCriterion = await listPage.recordCount();

  await listPage.searchColumn('Status', 'To Do');

  // Polled, not sampled: the grid renders the first filter's result set before the combined
  // one lands (see ListPage.waitForGridSettled), so a single read here asserts against an
  // intermediate state. This waits for the state the grid settles on.
  await expect
    .poll(
      async () => {
        const tasks = await listPage.columnValues('Task');
        const states = await listPage.columnValues('Status');
        return (
          tasks.length > 0 &&
          tasks.every((v) => /Irrigation/i.test(v)) &&
          states.every((v) => /To Do/i.test(v))
        );
      },
      { timeout: 30000, message: 'grid never settled on rows matching BOTH criteria' },
    )
    .toBe(true);

  // AND can only narrow.
  const twoCriteria = await listPage.recordCount();
  expect(twoCriteria!.total).toBeLessThanOrEqual(oneCriterion!.total);

  // "removing one criterion widens the result set predictably" — polled for the same reason
  // as the combined read above: clearing a filter repaints the narrowed set first.
  await listPage.clearColumnSearch('Status');
  await expect
    .poll(async () => (await listPage.recordCount())!.total, { timeout: 20000 })
    .toBe(oneCriterion!.total);
});

test('@TC:GN-041 columns sort ascending then descending, chronologically for dates', async ({
  listPage,
}) => {
  await listPage.setPageSize('20');

  // A date column — the case's point is that these sort chronologically, NOT as text. With
  // the live `MM/DD/YYYY` rendering, a string sort and a date sort disagree (e.g. 04/29/2026
  // vs 12/01/2025), so comparing parsed timestamps is what actually tests the behaviour.
  const asDates = (values: string[]) => values.map((v) => new Date(v).getTime());
  const sorted = (nums: number[], dir: 'asc' | 'desc') =>
    nums.every((n, i) => i === 0 || (dir === 'asc' ? nums[i - 1] <= n : nums[i - 1] >= n));

  await listPage.sortColumn('WO Start Date');
  const firstDir = await listPage.sortDirection('WO Start Date');
  expect(firstDir, 'first click must put the column into a sorted state').not.toBeNull();
  const first = asDates(await listPage.columnValues('WO Start Date')).filter((n) => !isNaN(n));
  expect(first.length).toBeGreaterThan(1);
  expect(sorted(first, firstDir!), `dates not ordered ${firstDir}`).toBe(true);

  // Clicking again must reverse it — both the indicator and the actual row order.
  await listPage.sortColumn('WO Start Date');
  const secondDir = firstDir === 'asc' ? 'desc' : 'asc';
  expect(await listPage.sortDirection('WO Start Date')).toBe(secondDir);
  const second = asDates(await listPage.columnValues('WO Start Date')).filter((n) => !isNaN(n));
  expect(sorted(second, secondDir), `second click did not reverse to ${secondDir}`).toBe(true);
});

test('@TC:GN-042 Refresh Data reloads the grid', async ({ page, listPage }) => {
  const before = await listPage.recordCount();
  await expect(listPage.refreshButton).toBeVisible();

  // The refresh must issue a real request, not just re-render what is already in memory.
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => /workorder/i.test(r.url()) && r.request().method() !== 'OPTIONS',
      { timeout: 30000 },
    ),
    listPage.refresh(),
  ]);
  expect(response.ok()).toBe(true);

  await expect(listPage.rows.first()).toBeVisible();
  expect((await listPage.recordCount())!.total).toBeGreaterThanOrEqual(before!.total);
});

test('@TC:GN-043 a search matching nothing shows the empty state and can be cleared', async ({
  page,
  listPage,
}) => {
  const before = await listPage.recordCount();

  await listPage.searchColumn('WO Name', 'zzz-no-such-work-order-zzz');

  // A clear empty state, not a blank grid and not an endless spinner. The app renders more
  // than one `#f3-overlay-loader` node (duplicate ids), so assert none of them is showing
  // rather than tripping strict mode on the bare id.
  await expect(listPage.emptyState).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#f3-overlay-loader:visible')).toHaveCount(0);

  // "the filter can be cleared from that state"
  await listPage.clearColumnSearch('WO Name');
  await expect(listPage.rows.first()).toBeVisible();
  expect((await listPage.recordCount())!.total).toBe(before!.total);
});

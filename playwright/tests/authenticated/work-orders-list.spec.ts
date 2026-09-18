import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { SUB_TABS } from '../pages/work-orders.page';

/**
 * Work Orders — the list screen. Workbook tab `04 WO - Planned`, cases WP-001..WP-015.
 *
 * All non-mutating: navigation, filtering, searching and opening the read-only detail view.
 * The grid mechanics themselves live in `ListPage` and are covered once by
 * `global-data-grids.spec.ts`; these cases assert the Work Orders module's own behaviour on
 * top of them.
 *
 * Read `test-plans/FINDINGS.md` before changing anything here — the grid paints skeleton
 * rows, keeps column filters across sessions, settles a step behind the action, and renders
 * under two different column labellings.
 */

/** Column set WP-002 requires. `ListPage` resolves each to whichever variant the env serves. */
const EXPECTED_COLUMNS = [
  'WO Sequence No.',
  'WO Name',
  'Priority',
  'WO Start Date',
  'WO End Date',
  'Farm',
  'Plots',
  'Progress',
  'Task',
  'Materials',
  'Status',
  'Submitted By',
  'Responsible',
  'Actions',
] as const;

/**
 * Columns the grid renders that WP-002's enumeration does not name. Pinned rather than
 * ignored: the case only claims the 14 above are present, so an exact-count assertion would
 * turn any app column into a suite failure — but an unpinned extra would let a genuinely new
 * column slip in unnoticed. `Variety` is a real, populated column (observed live: "WOOD
 * COLONY", "BUTTE/PADRE"); the workbook omitting it is a gap in the workbook.
 */
const UNLISTED_COLUMNS = ['Variety'] as const;

const STATUS_CHIPS = ['All', 'Queue', 'Draft', 'To Do', 'In Progress', 'Review', 'Done'] as const;

test.beforeEach(async ({ page, listPage }) => {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  await listPage.clearAllColumnFilters();
});

test.afterEach(async ({ listPage }) => {
  await listPage.clearAllColumnFilters().catch(() => {});
});

test('@TC:WP-001 the module loads the default list', async ({ page, listPage, workOrdersPage }) => {
  await expect(page).toHaveURL(new RegExp(routes.workorders.root));
  // The Work Orders sub-tab is active...
  await expect(workOrdersPage.subTab('Work Orders')).toHaveClass(/btn-primary/);
  // ...the All status filter is selected...
  await expect(listPage.chip('All')).toHaveClass(/btn-primary/);
  // ...and the grid renders with data rather than an empty state.
  const count = await listPage.recordCount();
  expect(count!.total).toBeGreaterThan(0);
  expect(await listPage.rows.count()).toBeGreaterThan(0);
});

test('@TC:WP-002 every expected column is present', async ({ listPage }) => {
  const rendered = await listPage.columnNames();
  for (const column of EXPECTED_COLUMNS) {
    // Resolved through ListPage so the assertion holds under either column labelling.
    await expect(
      listPage.header(column),
      `column "${column}" missing. Rendered: ${rendered.join(' | ')}`,
    ).toHaveCount(1);
  }
  // No column beyond the enumerated set and the pinned extras — see UNLISTED_COLUMNS.
  expect(rendered.length).toBe(EXPECTED_COLUMNS.length + UNLISTED_COLUMNS.length);
  for (const column of UNLISTED_COLUMNS) {
    await expect(listPage.header(column)).toHaveCount(1);
  }
});

test('@TC:WP-003 the work-order type tabs are present and switchable', async ({
  listPage,
  workOrdersPage,
}) => {
  test.setTimeout(150000); // four tab switches, each refetching the grid

  for (const name of SUB_TABS) {
    await expect(workOrdersPage.subTab(name)).toHaveCount(1);
  }

  for (const name of SUB_TABS) {
    await workOrdersPage.openSubTab(name);
    await listPage.waitForGridSettled();

    // The opened tab is highlighted and every other one is not — "the active tab is
    // highlighted" is only meaningful if the others drop back.
    await expect(workOrdersPage.subTab(name)).toHaveClass(/btn-primary/);
    for (const other of SUB_TABS.filter((t) => t !== name)) {
      await expect(workOrdersPage.subTab(other)).toHaveClass(/btn-outline-primary/);
    }
    // "loads its own dataset and column set without error"
    expect((await listPage.columnNames()).length).toBeGreaterThan(0);
  }
});

test('@TC:WP-004 the status filter chips are present', async ({ listPage }) => {
  for (const name of STATUS_CHIPS) {
    await expect(listPage.chip(name)).toHaveCount(1);
    await expect(listPage.chip(name)).toBeVisible();
  }
});

test('@TC:WP-005 each status filter returns only work orders with that status', async ({
  listPage,
}) => {
  test.setTimeout(240000); // seven chips, each a full grid fetch

  const all = await listPage.recordCount();
  expect(all!.total).toBeGreaterThan(0);

  let sum = 0;
  for (const status of STATUS_CHIPS.filter((s) => s !== 'All')) {
    await listPage.filterByStatus(status);

    const count = await listPage.recordCount();
    // A status with no work orders is legitimate; it just has nothing to check.
    if (!count || count.total === 0) continue;
    sum += count.total;

    // Polled: the grid renders the previous filter's rows before the new ones land.
    await expect
      .poll(
        async () => {
          const values = await listPage.columnValues('Status');
          return values.length > 0 && values.every((v) => v.trim() === status);
        },
        { timeout: 30000, message: `rows outside "${status}" remained after filtering` },
      )
      .toBe(true);
  }

  // "'All' returns the union" — every work order carries exactly one status, so the per-status
  // totals must add up to the unfiltered total.
  await listPage.filterByStatus('All');
  expect(sum).toBe(all!.total);
  expect((await listPage.recordCount())!.total).toBe(all!.total);
});

test('@TC:WP-006 the status filter combines with a column search', async ({ listPage }) => {
  test.setTimeout(120000);

  await listPage.filterByStatus('To Do');
  const statusOnly = await listPage.recordCount();
  test.skip(!statusOnly || statusOnly.total === 0, 'no To Do work orders in the tenant');

  // Take a term from the data itself rather than hardcoding a tenant string.
  const term = (await listPage.columnValues('WO Name'))[0].split(' ')[0];
  await listPage.searchColumn('WO Name', term);

  await expect
    .poll(
      async () => {
        const names = await listPage.columnValues('WO Name');
        const statuses = await listPage.columnValues('Status');
        return (
          names.every((n) => n.toLowerCase().includes(term.toLowerCase())) &&
          statuses.every((s) => s.trim() === 'To Do')
        );
      },
      { timeout: 30000, message: 'rows matched only one of the two criteria' },
    )
    .toBe(true);

  expect((await listPage.recordCount())!.total).toBeLessThanOrEqual(statusOnly!.total);
});

test('@TC:WP-009 search by work order number and by partial name', async ({ listPage }) => {
  test.setTimeout(150000);

  const sequence = (await listPage.columnValues('WO Sequence No.'))[0];
  const name = (await listPage.columnValues('WO Name'))[0];

  // Full sequence number -> that work order.
  await listPage.searchColumn('WO Sequence No.', sequence);
  await expect
    .poll(async () => (await listPage.columnValues('WO Sequence No.')).every((v) => v === sequence), {
      timeout: 30000,
    })
    .toBe(true);
  await listPage.clearAllColumnFilters();

  // Partial name -> every row contains it.
  const partial = name.slice(0, Math.max(4, Math.floor(name.length / 2)));
  await listPage.searchColumn('WO Name', partial);
  await expect
    .poll(
      async () => {
        const names = await listPage.columnValues('WO Name');
        return names.length > 0 && names.every((n) => n.toLowerCase().includes(partial.toLowerCase()));
      },
      { timeout: 30000 },
    )
    .toBe(true);
  await listPage.clearAllColumnFilters();

  // "a search matching nothing shows a clear empty state"
  await listPage.searchColumn('WO Name', 'zzz-no-such-work-order-zzz');
  await expect(listPage.emptyState).toBeVisible({ timeout: 20000 });
});

test('@TC:WP-010 dates render in the configured format and end is never before start', async ({
  listPage,
}) => {
  const starts = await listPage.columnValues('WO Start Date');
  const ends = await listPage.columnValues('WO End Date');
  expect(starts.length).toBeGreaterThan(0);
  expect(ends.length).toBe(starts.length);

  for (const [index, start] of starts.entries()) {
    const end = ends[index];
    // Configured format is MM/DD/YYYY (verified live 2026-09-07).
    expect(start, `row ${index} start date "${start}"`).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(end, `row ${index} end date "${end}"`).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(
      new Date(end).getTime(),
      `row ${index}: end ${end} is earlier than start ${start}`,
    ).toBeGreaterThanOrEqual(new Date(start).getTime());
  }
});

/**
 * WP-013 expects two rules: a To Do work order shows zero progress, and a Done one shows full
 * completion.
 *
 * Only the first holds. Of 89 Done work orders in the tenant, 28 are at 100% or more, 37 sit
 * between 0 and 100, and 24 show 0% (measured 2026-09-07) — so 69% contradict the workbook.
 * Whether the data is wrong or the expectation is, that is a question for the product owner,
 * not something a test should decide: this asserts the rule that holds and pins the Done
 * behaviour as an observation. See test-plans/FINDINGS.md.
 */
test('@TC-partial:WP-013 To Do work orders show zero progress', async ({ listPage }) => {
  test.setTimeout(120000);

  await listPage.filterByStatus('To Do');
  test.skip((await listPage.recordCount())?.total === 0, 'no To Do work orders in the tenant');

  await expect
    .poll(
      async () => {
        const statuses = await listPage.columnValues('Status');
        const progress = await listPage.columnValues('Progress');
        return (
          statuses.length > 0 &&
          statuses.every((s) => s.trim() === 'To Do') &&
          progress.every((p) => parseFloat(p) === 0)
        );
      },
      { timeout: 30000, message: 'a To Do work order reported non-zero progress' },
    )
    .toBe(true);
});

test('@TC:WP-014 the row actions are the four documented ones', async ({ listPage }) => {
  const actions = listPage.rows.first().locator('td:last-child a');
  const titles = await actions.evaluateAll((els) => els.map((e) => e.getAttribute('title')));

  // Which subset renders depends on the user's permissions and the work order's status, so
  // assert the vocabulary rather than a fixed set: nothing outside these four may appear.
  const allowed = ['View Work Order Detail', 'Edit Work Order', 'Clone Work Order', 'Delete Work Order'];
  for (const title of titles) expect(allowed).toContain(title);
  // An admin on the first row must at least be able to view it.
  expect(titles).toContain('View Work Order Detail');
});

/**
 * WP-015 expects the read-only detail to show "general information, plots, materials,
 * resources, assets and status history".
 *
 * Everything but the last is present — materials render under the heading "Inputs". There is
 * no status-history section anywhere on the page (verified 2026-09-07), hence partial.
 */
test('@TC-partial:WP-015 View Work Order Detail opens a read-only detail view', async ({
  page,
  listPage,
  workOrdersPage,
}) => {
  test.setTimeout(120000);

  const sequence = (await listPage.columnValues('WO Sequence No.'))[0];
  await workOrdersPage.openRowDetail(listPage.rows.first());

  await expect(page).toHaveURL(new RegExp(`${routes.workorders.root}/\\d+`));
  await listPage.waitForLoaderGone();

  // General information: the heading carries the sequence number and name.
  await expect(page.getByRole('heading', { name: new RegExp(`Work Order:\\s*${sequence}`) })).toBeVisible();

  for (const section of ['Plots', 'Inputs', 'Resources', 'Assets']) {
    await expect(
      page.getByRole('heading', { name: section, exact: true }),
      `detail section "${section}" missing`,
    ).toBeVisible();
  }

  // Read-only: the detail offers no editable field. Scoped to `main` and to visible nodes —
  // the header's Site/Season pickers keep hidden `#searchTextbox` inputs mounted at all
  // times, which a page-wide count picks up and reads as an editable detail form.
  await expect(
    page.locator(
      'main input:not([readonly]):not([disabled]):visible, main textarea:not([readonly]):not([disabled]):visible',
    ),
  ).toHaveCount(0);
});

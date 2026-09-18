import { test, expect } from '../fixtures';
import type { ListPage } from '../pages/list.page';
import { routes } from '../constants/routes';

/**
 * Settings. Workbook tab `11 Settings`.
 *
 * All non-mutating: the configuration grids and the User Settings preference controls, read
 * and filtered but never saved. Add/Edit cases (ST-016, ST-018, ST-030, ST-031, ST-034,
 * ST-035, ST-038) change tenant configuration that the rest of the suite depends on and are
 * not automated.
 *
 * Every grid here is the shared `app-f3-table`, so `ListPage` applies — see
 * test-plans/FINDINGS.md. Note these grids set their column `title` attribute in lowercase,
 * which `ListPage` matches case-insensitively.
 */

/**
 * Sort a column both ways and confirm the rows actually reorder.
 *
 * ST-013 and ST-027 both carry a warning in the workbook ("sorting has previously failed on
 * several settings grids", "this grid has a history of sort defects — verify each column"),
 * so this checks each column explicitly rather than sampling one.
 *
 * Values are compared with a type-aware comparator: a column of numbers must order
 * numerically and a column of dates chronologically, since a string sort would pass a naive
 * check while being exactly the defect these cases look for. Blank cells are ignored — they
 * sort to one end and say nothing about the ordering of real values.
 */
async function expectColumnSorts(listPage: ListPage, column: string): Promise<void> {
  // Type detection runs on the RAW value. Deriving it by stripping non-digits is wrong:
  // `"AFI".replace(/[^0-9.-]/g,'')` is `""`, and `Number("")` is 0 rather than NaN, so every
  // text column looked numeric and was compared as a column of zeros — which reported a
  // perfectly good sort as broken (the Sites `Code` column, verified sorting correctly live).
  const isNumeric = (v: string) => /^[$(\s-]*[\d,]+(\.\d+)?[\s%)]*$/.test(v.trim());
  const isDate = (v: string) =>
    /\d{1,4}[/-]\d{1,2}[/-]\d{1,4}/.test(v.trim()) && !Number.isNaN(new Date(v).getTime());

  const rank = (values: string[]): number[] | string[] => {
    const meaningful = values.filter((v) => v.trim() !== '');
    if (meaningful.length === 0) return [];
    if (meaningful.every(isNumeric)) {
      return meaningful.map((v) => Number(v.replace(/[^0-9.-]/g, '')));
    }
    if (meaningful.every(isDate)) return meaningful.map((v) => new Date(v).getTime());
    return meaningful.map((v) => v.trim().toLowerCase());
  };
  const ordered = (values: (number | string)[], dir: 'asc' | 'desc') =>
    values.every((v, i) => i === 0 || (dir === 'asc' ? values[i - 1] <= v : values[i - 1] >= v));

  await listPage.sortColumn(column);
  const firstDir = await listPage.sortDirection(column);
  expect(firstDir, `"${column}" did not enter a sorted state`).not.toBeNull();
  const first = rank(await listPage.columnValues(column));
  expect(ordered(first, firstDir!), `"${column}" is not ordered ${firstDir}`).toBe(true);

  await listPage.sortColumn(column);
  const secondDir = firstDir === 'asc' ? 'desc' : 'asc';
  expect(await listPage.sortDirection(column), `"${column}" did not reverse`).toBe(secondDir);
  const second = rank(await listPage.columnValues(column));
  expect(ordered(second, secondDir), `"${column}" is not ordered ${secondDir}`).toBe(true);
}

/** Open a settings grid and wait for real rows. */
async function openGrid(page: import('@playwright/test').Page, listPage: ListPage, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  // Double the default skeleton budget. These reference grids are the slowest in the app —
  // Operations has been measured at 42.8s against the 45s default, i.e. 2s of headroom, which
  // is why it flaked rather than failed. The wait ends when the skeletons clear, so the
  // larger cap costs nothing on a healthy run — but it cannot fit inside the 90s suite-wide
  // test timeout, so the test's own budget is raised to match. Only ever raised: several
  // tests in this file already ask for more.
  if (test.info().timeout < 150000) test.setTimeout(150000);
  await listPage.waitForGridSettled({ timeout: 90000 });
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  await listPage.clearAllColumnFilters();
}

/**
 * ST-001 expects "the General > Home Settings section renders with the saved values".
 *
 * The page renders its five preference controls, but every one reads "Choose your option" —
 * this account has no saved preferences, so the "with the saved values" half is unobservable
 * rather than failing. Tagged partial for that reason.
 */
test('@TC-partial:ST-001 the User Settings page loads its preference controls', async ({
  page,
  headerPage,
}) => {
  await page.goto(routes.settings.userSettings, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();

  await expect(page.getByRole('heading', { name: 'User Settings' })).toBeVisible({ timeout: 30000 });
  // The heading paints before the preference controls do, so each label gets its own wait
  // rather than inheriting the default 5s expect timeout.
  for (const label of [
    'Default Location',
    'Default Season',
    'Default Language',
    'Default Timezone',
    'Default page size',
  ]) {
    await expect(page.getByText(label).first(), `"${label}" missing`).toBeVisible({
      timeout: 30000,
    });
  }
});

/**
 * ST-002 expects the location list to be "searchable" with "the current default preselected".
 *
 * The preselection half holds and is asserted below. The searchable half is not observable:
 * the control is a native `<select>` inside `app-f3-dropdown`, not the searchable
 * `app-f3-select` widget the header Site/Season pickers use, so there is no search box to
 * exercise. Tagged partial for that alone. See test-plans/FINDINGS.md.
 */
test('@TC-partial:ST-002 the Default Location dropdown lists the entitled locations', async ({
  page,
  headerPage,
}) => {
  test.setTimeout(120000);
  await page.goto(routes.settings.userSettings, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();
  await expect(page.getByText('Default Location').first()).toBeVisible({ timeout: 30000 });

  // Anchor on the field's own form-group so a second preference control cannot be picked up.
  const group = page.locator('.form-group').filter({ hasText: 'Default Location' }).first();
  const select = group.locator('select');
  await expect(select).toHaveCount(1);

  const options = select.locator('option');
  await expect.poll(async () => options.count(), { timeout: 30000 }).toBeGreaterThan(1);

  // The user's own site must be offered. Matched loosely: several locations share the name
  // as a prefix ("Colusa", "Colusa Farms", ...), so an exact count of 1 is wrong.
  const site = await headerPage.currentContext('site');
  await expect(options.filter({ hasText: site }).first()).toHaveCount(1);

  // "the current default is preselected" — the saved default resolves to the location the
  // header is currently scoped to. Read the SELECTED option's label rather than the raw
  // value, which is an internal `index: id` pair.
  await expect
    .poll(async () => select.evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.text.trim() ?? ''), {
      timeout: 20000,
      message: 'Default Location never resolved to a saved value',
    })
    .toBe(site);

  // Nothing is changed: this spec must not overwrite the user's saved default.
});

test('@TC:ST-011 the Sites page loads with its configured sites', async ({ page, listPage }) => {
  await openGrid(page, listPage, routes.settings.location);

  await listPage.expectColumns(['Name', 'Code']);
  const count = await listPage.recordCount();
  expect(count!.total).toBeGreaterThan(0);
});

/**
 * ST-012 expects "only sites matching the search term are displayed".
 *
 * That holds for the `Code` column and NOT for `Name`: searching Name registers (the column
 * swaps its search button for a reset button) but the grid returns every record unfiltered —
 * 1,433 of 1,433, rows unchanged. Measured live 2026-09-07; `Code` narrows the same grid to
 * 1 record correctly, so the mechanism works and it is this column that is broken.
 *
 * This asserts the working column properly, and pins the broken one as a characterisation:
 * when Name search is fixed the second assertion fails, which is the signal to promote this
 * case to full coverage. See test-plans/FINDINGS.md.
 */
test('@TC-partial:ST-012 search on the Sites screen filters and clears', async ({
  page,
  listPage,
}) => {
  test.setTimeout(150000);
  await openGrid(page, listPage, routes.settings.location);
  const before = await listPage.recordCount();

  // The Code column filters correctly.
  const code = (await listPage.columnValues('Code'))[0].trim();
  await listPage.searchColumn('Code', code);
  await expect
    .poll(
      async () => {
        const codes = await listPage.columnValues('Code');
        return codes.length > 0 && codes.every((c) => c.trim().includes(code));
      },
      { timeout: 30000, message: 'Code search did not narrow the grid' },
    )
    .toBe(true);
  expect((await listPage.recordCount())!.total).toBeLessThan(before!.total);

  // ...and clears.
  await listPage.clearColumnSearch('Code');
  expect((await listPage.recordCount())!.total).toBe(before!.total);

  // The Name column does not. Documented as the current behaviour, not asserted as correct.
  const term = (await listPage.columnValues('Name'))[0].split(' ')[0];
  await listPage.searchColumn('Name', term);
  expect(
    (await listPage.recordCount())!.total,
    'Name search on the Sites screen now filters — promote ST-012 to full coverage',
  ).toBe(before!.total);

  await listPage.clearAllColumnFilters();
});

test('@TC:ST-013 every column on the Sites screen sorts both ways', async ({ page, listPage }) => {
  test.setTimeout(180000);
  await openGrid(page, listPage, routes.settings.location);

  for (const column of await listPage.columnNames()) {
    await expectColumnSorts(listPage, column);
  }
});

test('@TC:ST-014 pagination and page size on the Sites screen', async ({ page, listPage }) => {
  test.setTimeout(180000);
  await openGrid(page, listPage, routes.settings.location);

  await listPage.setPageSize('10');
  const first = await listPage.recordCount();
  expect(first!.pages).toBeGreaterThan(1);
  expect(await listPage.rows.count()).toBe(10);

  const page1 = await listPage.columnValues('Code');
  await listPage.goToPage('next');
  const second = await listPage.recordCount();
  expect(second!.page).toBe(2);
  expect(second!.from).toBe(first!.to + 1);
  // No row is repeated across the page boundary.
  expect((await listPage.columnValues('Code')).filter((c) => page1.includes(c))).toEqual([]);
  // The total is a property of the dataset, not of the page.
  expect(second!.total).toBe(first!.total);
});

test('@TC:ST-015 the Seasons page lists seasons with their code and date range', async ({
  page,
  listPage,
}) => {
  await openGrid(page, listPage, routes.settings.season);

  await listPage.expectColumns(['Name', 'Code', 'From', 'Till']);
  const from = await listPage.columnValues('From');
  const till = await listPage.columnValues('Till');
  expect(from.length).toBeGreaterThan(0);

  for (const [index, start] of from.entries()) {
    // A season's range must be coherent: end on or after start.
    expect(
      new Date(till[index]).getTime(),
      `season row ${index}: till ${till[index]} precedes from ${start}`,
    ).toBeGreaterThanOrEqual(new Date(start).getTime());
  }
});

test('@TC:ST-020 the Resources page lists resources synced from D365', async ({
  page,
  listPage,
}) => {
  await openGrid(page, listPage, routes.settings.resources);

  await listPage.expectColumns([
    'Name',
    'Code',
    'Resource Group Name',
    'Location Name',
    'Resource Relocation Status',
    'Actions',
  ]);
  expect((await listPage.recordCount())!.total).toBeGreaterThan(0);
});

test('@TC:ST-023 the Resource Group Name column is populated', async ({ page, listPage }) => {
  await openGrid(page, listPage, routes.settings.resources);

  const groups = await listPage.columnValues('Resource Group Name');
  expect(groups.length).toBeGreaterThan(0);
  const blank = groups.filter((g) => g.trim() === '').length;
  expect(blank, `${blank} of ${groups.length} resources have no Resource Group Name`).toBe(0);
});

test('@TC:ST-025 the Materials page lists materials with codes and units', async ({
  page,
  listPage,
}) => {
  await openGrid(page, listPage, routes.settings.materials);

  await listPage.expectColumns([
    'Name',
    'Code',
    'Active Ingredient',
    'Chemical Group',
    'Chemical Type',
    'Base Unit',
    'Usage Unit',
    'Unit Cost ($)',
    'Apply Application Rate',
  ]);
  expect((await listPage.recordCount())!.total).toBeGreaterThan(0);
});

test('@TC:ST-028 the Crops page lists configured crops with their attributes', async ({
  page,
  listPage,
}) => {
  await openGrid(page, listPage, routes.settings.crop);

  await listPage.expectColumns(['Name', 'Code', 'Color', 'Stroke', 'Unit Price', 'Varieties']);
  const names = await listPage.columnValues('Name');
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(name.trim()).not.toBe('');
});

test('@TC:ST-033 the Operations page lists operations with their attributes', async ({
  page,
  listPage,
}) => {
  await openGrid(page, listPage, routes.settings.task);

  await listPage.expectColumns(['Name', 'Can Apply Tank Mixing', 'Task Type Names', 'Color']);
  const names = await listPage.columnValues('Name');
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(name.trim()).not.toBe('');
});

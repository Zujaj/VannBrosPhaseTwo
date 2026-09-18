import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Observations / Points of Interest. Workbook tab `06 WO - Observations`.
 *
 * Observations live on the `Point Of Interests` (a.k.a. `Observations`) sub-tab of the Work Orders list — the
 * workbook calls that tab "Observations" (see FINDINGS #8).
 *
 * Non-mutating: the list and the read-only detail. Creating a work order from an observation
 * (WB-007, WB-008) writes to the tenant and stays manual, as does POI category configuration.
 */

test.beforeEach(async ({ page, listPage, workOrdersPage }) => {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await workOrdersPage.openSubTab('Point Of Interests');
  await listPage.waitForGridSettled();
  await listPage.clearAllColumnFilters();
});

test.afterEach(async ({ listPage }) => {
  await listPage.clearAllColumnFilters().catch(() => {});
});

/**
 * WB-001 carries a warning: "This tab has previously failed with an unknown error - confirm
 * the fix." It loads cleanly now, so this asserts both that records arrive AND that no error
 * surface is rendered — a tab that failed would satisfy the first on its own.
 */
test('@TC:WB-001 the Observations tab loads without error', async ({ page, listPage }) => {
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });
  expect(await listPage.rows.count()).toBeGreaterThan(0);

  const count = await listPage.recordCount();
  expect(count!.total).toBeGreaterThan(0);

  await expect(page.locator('body')).not.toContainText(
    /unknown error|something went wrong|an error occurred|NG0[0-9]{3}/i,
  );
});

test('@TC:WB-002 the Observations column set is present', async ({ listPage }) => {
  // The workbook says "Plots"; this build renders "Blocks" — resolved through ListPage's
  // variant table (see FINDINGS #2).
  await listPage.expectColumns([
    'Title',
    'Farm',
    'Plots',
    'Category',
    'Created Date',
    'Created By',
    'Actions',
  ]);
});

test('@TC:WB-003 search on the observations list filters and clears', async ({ listPage }) => {
  test.setTimeout(150000);
  const before = await listPage.recordCount();

  const term = (await listPage.columnValues('Title'))[0].split(' ')[0];
  expect(term.length, 'no searchable word in the first observation title').toBeGreaterThan(2);

  await listPage.searchColumn('Title', term);
  await expect
    .poll(
      async () => {
        const titles = await listPage.columnValues('Title');
        return titles.length > 0 && titles.every((t) => t.toLowerCase().includes(term.toLowerCase()));
      },
      { timeout: 30000, message: 'observations outside the search term remained' },
    )
    .toBe(true);
  expect((await listPage.recordCount())!.total).toBeLessThanOrEqual(before!.total);

  await listPage.clearColumnSearch('Title');
  expect((await listPage.recordCount())!.total).toBe(before!.total);
});

/**
 * WB-005 expects the detail to show "title, category, plot, season, comments, attachments and
 * creator with timestamps".
 *
 * All but season and comments are present: the detail carries the title, Observation Category,
 * Plot Details, Attachment Detail, Created By and Created Date. Season is implied by the
 * header selector rather than printed on the record, and there is no comments section on the
 * observations examined. Partial for those two.
 */
test('@TC-partial:WB-005 the observation detail opens from the row action', async ({
  page,
  listPage,
}) => {
  test.setTimeout(150000);

  const title = (await listPage.columnValues('Title'))[0].trim();
  const category = (await listPage.columnValues('Category'))[0].trim();

  await listPage.rows.first().getByTitle(/View Point Of Observation Detail/i).click();
  await expect(page).toHaveURL(new RegExp(`${routes.workorders.root}/point-of-interests/\\d+`));
  await listPage.waitForLoaderGone();

  // Title, category and creator, matching the row it was opened from.
  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: 30000 });
  const body = await page.locator('body').innerText();
  expect(body, 'the detail does not name the observation category').toContain(category);

  for (const label of ['Observation Category', 'Plot Details', 'Created By', 'Created Date']) {
    expect(body, `"${label}" missing from the observation detail`).toContain(label);
  }
  // Attachments are reachable from the detail.
  expect(body).toMatch(/Attachment/i);
});

import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Harvest Central. Workbook tab `08 Harvest Central`.
 *
 * All non-mutating: the field/variety list and the read-only halves of a harvest detail.
 * Ticket creation, posting and deletion mutate the shared QA tenant and are not automated.
 *
 * The list is the shared `app-f3-table`, so `ListPage` applies — see test-plans/FINDINGS.md
 * for its skeleton-render and sticky-filter behaviour.
 */

test.beforeEach(async ({ page, listPage }) => {
  await page.goto(routes.harvestCentral.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  await listPage.clearAllColumnFilters();
});

test.afterEach(async ({ listPage }) => {
  await listPage.clearAllColumnFilters().catch(() => {});
});

/**
 * HC-001 expects the columns "Field, Variety, No Of Harvest Tickets, Updated By,
 * Updated By Date and Action".
 *
 * The product has moved on: a single ticket count is now split into `No Of Planned Tickets`
 * and `No Of Actual Tickets`, and the audit pair is `Planned On` / `Planned By` rather than
 * `Updated By` / `Updated By Date`. The workbook is the thing out of date here, so the live
 * set is asserted and the case is tagged partial. See test-plans/FINDINGS.md.
 */
test('@TC-partial:HC-001 the module loads the field/variety list', async ({ page, listPage }) => {
  await expect(page).toHaveURL(new RegExp(routes.harvestCentral.root));

  await listPage.expectColumns([
    'Field',
    'Variety',
    'No Of Planned Tickets',
    'No Of Actual Tickets',
    'Planned On',
    'Planned By',
    'Actions',
  ]);
  expect(await listPage.rows.count()).toBeGreaterThan(0);
});

test('@TC:HC-002 each field/variety combination appears exactly once', async ({ listPage }) => {
  const fields = await listPage.columnValues('Field');
  const varieties = await listPage.columnValues('Variety');
  expect(fields.length).toBeGreaterThan(0);
  expect(varieties.length).toBe(fields.length);

  const pairs = fields.map((field, index) => `${field.trim()} | ${varieties[index].trim()}`);
  const duplicates = pairs.filter((pair, index) => pairs.indexOf(pair) !== index);
  expect(duplicates, `duplicate field/variety rows: ${[...new Set(duplicates)].join(', ')}`).toEqual(
    [],
  );
});

test('@TC:HC-008 View details opens the harvest detail page', async ({ page, listPage }) => {
  await listPage.rows.first().getByTitle(/View details/i).click();

  await expect(page).toHaveURL(new RegExp(`${routes.harvestCentral.root}/\\d+`));
  await listPage.waitForLoaderGone();

  // "the Information panel plus the Harvest Detail grid render"
  await expect(page.getByRole('heading', { name: 'Information', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Harvest Detail', exact: true })).toBeVisible();
});

test('@TC:HC-009 the Information panel matches the selected row and current season', async ({
  page,
  listPage,
  headerPage,
}) => {
  const field = (await listPage.columnValues('Field'))[0].trim();
  const variety = (await listPage.columnValues('Variety'))[0].trim();
  const season = await headerPage.currentContext('season');

  await listPage.rows.first().getByTitle(/View details/i).click();
  await expect(page).toHaveURL(new RegExp(`${routes.harvestCentral.root}/\\d+`));
  await listPage.waitForLoaderGone();

  const panel = page.locator('main').filter({ hasText: 'Information' });
  for (const label of ['Grower', 'Farm', 'Season', 'Field', 'Variety', 'Hulling Location', 'Linked Project']) {
    await expect(panel.getByText(label, { exact: true }).first(), `"${label}" missing`).toBeVisible();
  }

  // "...and match the selected row and current season."
  await expect(page.getByRole('heading', { name: new RegExp(`Harvest Central:\\s*${field}`) })).toBeVisible();
  await expect(panel).toContainText(variety);
  await expect(panel).toContainText(season);
});

/**
 * HC-010 lists `Linked Project` among the Harvest Detail grid's columns. Live, Linked Project
 * is on the Information panel instead and is not a grid column — every other column the case
 * names is present. Tagged partial for that one difference.
 */
test('@TC-partial:HC-010 the Harvest Detail grid renders its column set', async ({
  page,
  listPage,
}) => {
  await listPage.rows.first().getByTitle(/View details/i).click();
  await expect(page).toHaveURL(new RegExp(`${routes.harvestCentral.root}/\\d+`));
  await listPage.waitForLoaderGone();

  const columns = await listPage.columnNames();
  for (const expected of [
    'Harvest Ticket No',
    'Manual Ticket No',
    'Load Type',
    'Standard Quantity',
    'Actual Weight',
    'Driver Name',
    'Truck License Plate',
    'Front Trailer Plate',
    'Rear Trailer Plate',
    'Updated Date/Time',
    'Updated By',
  ]) {
    expect(columns, `Harvest Detail column "${expected}" missing`).toContain(expected);
  }

  // The leading select checkbox the case calls for.
  await expect(listPage.table.locator('thead input[type="checkbox"]')).toHaveCount(1);
});

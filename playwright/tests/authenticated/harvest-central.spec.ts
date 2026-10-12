import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Harvest Central. Workbook tab `08 Harvest Central`; test plan
 * test-plans/authenticated/harvest-central.md, which also lists the PSD v2 cases (HCP / HCM / HCI)
 * from "Harvesting Permanent Planting v2". Those are unverified on QA and not automated yet.
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

/*
 * PSD "Harvesting Permanent Planting" v2 (test-plans/authenticated/harvest-central.md, HCP-xx).
 * Only the parts QA has shipped are asserted, as checked live 2026-10-12. Every panel is closed
 * with Cancel, so nothing is saved.
 */

test('@PSD-harvest-central HCP-11 the detail page carries Post Ticket, planning and the status summary', async ({
  page,
  harvestCentralPage,
}) => {
  await harvestCentralPage.openDetail();

  for (const name of ['Post Ticket', 'Plan Harvest Tickets', 'Add New Ticket']) {
    await expect(page.getByRole('button', { name, exact: true }), `"${name}" missing`).toBeVisible();
  }
  await expect(page.getByText(/^\d+ Planned · \d+ In Progress · \d+ Received · \d+ Posted$/)).toBeVisible();
});

test('@PSD-harvest-central HCP-10 ticket numbers follow HT-<field>-<random>-<YY> and are unique', async ({
  harvestCentralPage,
}) => {
  const field = (await harvestCentralPage.columnValues('Field'))[0].trim();
  await harvestCentralPage.openDetail();

  const numbers = (await harvestCentralPage.columnValues('Harvest Ticket No')).map((n) => n.trim()).filter(Boolean);
  expect(numbers.length).toBeGreaterThan(0);
  for (const number of numbers) {
    expect(number).toMatch(new RegExp(`^HT-${field}-[A-Z0-9]+-\\d{2}$`));
  }
  expect(new Set(numbers).size, 'duplicate ticket numbers').toBe(numbers.length);
});

test('@PSD-harvest-central HCP-23 Actual Weight is read-only on the detail grid', async ({ harvestCentralPage }) => {
  await harvestCentralPage.openDetail();

  const column = await harvestCentralPage.columnIndex('Actual Weight');
  await expect(harvestCentralPage.rows.locator(`td:nth-child(${column}) input`)).toHaveCount(0);
});

test('@PSD-harvest-central HCP-13 planning from the detail page locks Field and Variety', async ({
  page,
  harvestCentralPage,
}) => {
  await harvestCentralPage.openDetail();
  const panel = harvestCentralPage.panel('Plan Harvest Tickets');
  await harvestCentralPage.clickPastLoader(page.getByRole('button', { name: 'Plan Harvest Tickets', exact: true }), () =>
    expect(panel).toBeVisible({ timeout: 5000 }),
  );

  for (const label of ['Grower', 'Farm', 'Season', 'Hulling Location']) {
    await expect(panel.getByText(label, { exact: true }), `"${label}" missing`).toBeVisible();
  }
  await expect(harvestCentralPage.dropdownToggle(['Field *'])).toBeDisabled();
  await expect(harvestCentralPage.dropdownToggle(['Variety *'])).toBeDisabled();

  await harvestCentralPage.cancel(panel);
});

/**
 * HCP-14..16 need a ticket that has not been captured yet (`Set on site`); seed one with
 * `pnpm seed:tickets` if none is left. PSD drift, live: the drawer is `Edit Harvest Ticket` (PSD
 * "Harvest Ticket <no>"), has no Project or "not arrived yet" notice, and the split radios are
 * `Front Only` / `Back Only` (PSD "Front trailer" / "Rear trailer").
 */
test('@PSD-harvest-central HCP-15 Split Load reveals one-of Front Only / Back Only and disables the other plate', async ({
  harvestCentralPage,
}) => {
  const blocks = await harvestCentralPage.rows.count();
  const plannedRow = harvestCentralPage.rows.filter({ hasText: 'Set on site' }).first();
  for (let index = 0; index < blocks; index++) {
    if (index) await harvestCentralPage.open();
    await harvestCentralPage.openDetail(index);
    if (await plannedRow.count()) break;
  }
  test.skip(!(await plannedRow.count()), 'no "Set on site" ticket on QA; run pnpm seed:tickets');
  const number = (await plannedRow.locator('td').nth(1).innerText()).trim();

  const drawer = await harvestCentralPage.openEditDrawer(number);
  await expect(drawer.getByText(number, { exact: true })).toBeVisible();
  for (const label of ['Grower', 'Farm', 'Season', 'Hulling Location', 'Field', 'Variety', 'Created', 'Received']) {
    await expect(drawer.getByText(label, { exact: true }), `"${label}" missing`).toBeVisible();
  }

  // HCP-16: the trailer radios exist only with Split Load.
  const front = drawer.getByRole('radio', { name: 'Front Only' });
  const back = drawer.getByRole('radio', { name: 'Back Only' });
  await expect(front).toHaveCount(0);
  // A real click does not toggle these inputs (Playwright: "did not change its state"); the
  // element's own click event does, as a user's click on the label would.
  await drawer.getByRole('checkbox', { name: 'Split Load' }).dispatchEvent('click');
  await expect(front).toBeChecked();
  await expect(back).not.toBeChecked();
  const plate = (label: string) =>
    drawer.locator(`xpath=.//*[normalize-space(text())="${label}"]/following::button[1]`).first();
  await expect(plate('Rear Trailer Plate')).toBeDisabled();

  await back.dispatchEvent('click');
  await expect(front).not.toBeChecked();
  await expect(plate('Front Trailer Plate')).toBeDisabled();

  await harvestCentralPage.cancel(drawer);
  await expect(plannedRow).toContainText('Set on site');
});

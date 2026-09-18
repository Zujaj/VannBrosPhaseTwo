import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { MAP_LAYERS } from '../pages/maps.page';

/**
 * Maps. Workbook tab `02 Maps`.
 *
 * All non-mutating. The map is a Google Maps canvas, so polygon rendering, layer colouring,
 * marker placement and on-map labels cannot be read from the DOM — the cases that turn on
 * those (MP-012..MP-022, MP-029, MP-030) stay manual, and the ones covered here assert the
 * surrounding chrome, which is where the checkable expectations live.
 *
 * Map Toggle Config (MP-023..MP-027) saves tenant configuration and is not automated.
 */

test('@TC:MP-002 the farm summary counters reconcile with the sidebar', async ({ mapsPage }) => {
  await mapsPage.open();

  for (const label of ['Farm Name', 'Location', 'No of Fields', 'Total Area']) {
    await expect(mapsPage.aside, `"${label}" missing from the Summary`).toContainText(label);
  }

  const fieldCount = await mapsPage.asideValue('No of Fields');
  const totalArea = await mapsPage.asideValue('Total Area');
  expect(fieldCount).toMatch(/^\d+$/);
  expect(totalArea).toMatch(/^[\d,]+(\.\d+)?\s*ac$/);

  // "reconcile exactly with the sidebar field list" — the farm node badges the same count.
  const farmNode = (await mapsPage.treeNodes.first().innerText()).replace(/\s+/g, ' ');
  expect(farmNode, `farm node "${farmNode}" does not carry the field count ${fieldCount}`).toContain(
    fieldCount!,
  );
});

test('@TC:MP-005 the Map / Satellite base-layer toggle is offered', async ({ mapsPage }) => {
  await mapsPage.open();

  const map = mapsPage.baseLayer('map');
  const satellite = mapsPage.baseLayer('satellite');
  await expect(map).toBeVisible();
  await expect(satellite).toBeVisible();

  // Selecting one checks it and unchecks the other — these are radio-semantics widgets, so
  // the state lives in `aria-checked`.
  await map.click();
  await expect(map).toHaveAttribute('aria-checked', 'true', { timeout: 15000 });
  await expect(satellite).toHaveAttribute('aria-checked', 'false');

  await satellite.click();
  await expect(satellite).toHaveAttribute('aria-checked', 'true', { timeout: 15000 });
  await expect(map).toHaveAttribute('aria-checked', 'false');
});

/**
 * MP-011 lists the layers as "... Observations and Point of Interest".
 *
 * Live offers no **Observations** layer, and adds a **Draft Work Orders** layer the workbook
 * does not mention. Everything else matches. The live set is asserted and the case tagged
 * partial. See test-plans/FINDINGS.md.
 */
test('@TC-partial:MP-011 the Maps Control panel lists the configured layers', async ({
  mapsPage,
}) => {
  await mapsPage.open();

  // Presence, not visibility: the panel overlays the map and its lower rows are clipped at a
  // 1280x720 viewport, and `app-map-control-panel` itself has a zero-height box. The case
  // asks what the panel LISTS, which is what count checks.
  for (const layer of MAP_LAYERS) {
    await expect(mapsPage.layerLabel(layer), `layer "${layer}" missing`).toHaveCount(1);
  }

  // Documents the gap rather than asserting the product is fine: if an Observations layer is
  // added this flips and the case can be promoted to full coverage.
  await expect(
    mapsPage.layerLabel('Observations'),
    'an Observations layer now exists — promote MP-011 to full coverage',
  ).toHaveCount(0);
});

/**
 * MP-028 expects the filter panel to expose "Upcoming/Active/Completed Work Order tiles,
 * Active/Completed Inspection tiles, Task/Operation, Season, Farm, Start Date and End Date".
 *
 * The panel has been redesigned: it offers a WO Date Range (a start/end pair), a Filter Type
 * dropdown carrying the layer selection the tiles used to represent, plus Task and Crop —
 * and no Season or Farm criteria at all. Partial, with the divergence recorded.
 */
test('@TC-partial:MP-028 the filter panel opens with its criteria', async ({ mapsPage }) => {
  test.setTimeout(120000);
  await mapsPage.open();
  const panel = await mapsPage.openFilters();

  // Presence rather than visibility — the aside's lower fields are below the fold at this
  // viewport, and the case is about which criteria the panel exposes.
  for (const label of ['WO Date Range', 'Filter Type', 'Task', 'Crop']) {
    // `toHaveCount` would over-specify: "Task" appears both as a field label and as an option
    // inside the Filter Type list. The case asks which criteria are exposed, so presence of at
    // least one is the assertion.
    await expect
      .poll(async () => panel.getByText(label, { exact: true }).count(), { timeout: 20000 })
      .toBeGreaterThan(0);
  }
  await expect(panel.getByRole('button', { name: 'Apply' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Reset' })).toBeVisible();

  // The date range is a start/end pair, which is MP-028's Start Date / End Date.
  await expect(panel.locator('input.mat-start-date')).toHaveCount(1);
  await expect(panel.locator('input.mat-end-date')).toHaveCount(1);
});

/*
 * MP-032 (Reset clears the filter criteria) is NOT automated.
 *
 * Reset does not restore the Filter Type control to the value it held when the panel opened,
 * so "all criteria are cleared and the map returns to the unfiltered default view" cannot be
 * asserted through that control, and the map itself is a canvas. Establishing what Reset is
 * meant to do — clear to blank, restore the default, or only clear the date range — is a
 * question for the product owner rather than something a test should encode. Left manual.
 */

test('@TC:MP-034 the sidebar renders the Farm > Field > Plot hierarchy', async ({ mapsPage }) => {
  await mapsPage.open();

  // Root: the farm, badged with its field and crop counts.
  const farm = (await mapsPage.treeNodes.first().innerText()).replace(/\s+/g, ' ').trim();
  expect(farm, `farm node: ${farm}`).toMatch(/[A-Za-z].*\d+.*\d+/);

  // Each field node shows its number and acreage.
  const fields = (await mapsPage.fieldNodes.allInnerTexts()).slice(0, 8);
  expect(fields.length).toBeGreaterThan(0);
  for (const field of fields) {
    const flat = field.replace(/\s+/g, ' ').trim();
    expect(flat, `field node: ${flat}`).toMatch(/^\d+\s/);
    expect(flat, `field node: ${flat}`).toMatch(/[\d.]+\s*ac/);
  }
});

/**
 * MP-035 and MP-036 both turn on the sidebar search narrowing the tree. It does not.
 *
 * Typing into the box changes nothing: all 104 field nodes remain for a field number ("130"),
 * a crop name ("FIELDRUN"), a single digit ("1") and a nonsense string ("ZZZZZZ"), with and
 * without Enter. The same box behaves the same way in Planning, so it is the shared tree-
 * search widget that is inert rather than anything specific to Maps. Measured 2026-09-08.
 *
 * These assert what does hold — the box exists and accepts input — and pin the non-filtering,
 * so both tests fail once the search works, which is the signal to promote them.
 * See test-plans/FINDINGS.md.
 */
test('@TC-partial:MP-035 the sidebar search box accepts input', async ({ mapsPage }) => {
  test.setTimeout(120000);
  await mapsPage.open();

  const total = await mapsPage.fieldNodes.count();
  expect(total).toBeGreaterThan(0);
  const number = (await mapsPage.fieldNodes.first().innerText()).match(/^\s*(\d+)/)?.[1];
  expect(number, 'no field number to search for').toBeTruthy();

  await mapsPage.search.fill(number!);
  await expect(mapsPage.search).toHaveValue(number!);

  expect(
    await mapsPage.fieldNodes.count(),
    'the sidebar search now filters the tree — promote MP-035 to full coverage',
  ).toBe(total);

  await mapsPage.search.fill('');
  await expect(mapsPage.search).toHaveValue('');
});

test('@TC-partial:MP-036 a non-matching search does not break the tree', async ({
  page,
  mapsPage,
}) => {
  test.setTimeout(120000);
  await mapsPage.open();
  const total = await mapsPage.fieldNodes.count();

  await mapsPage.search.fill('ZZZZ-no-such-field');

  // No error is surfaced and the app shell survives — which is the half of MP-036 that holds.
  await expect(page.locator('body')).not.toContainText(/Cannot match any routes|NG0[0-9]{3}/i);
  await expect(mapsPage.treeNodes.first()).toBeVisible();

  // No empty state either, because nothing is filtered in the first place.
  expect(
    await mapsPage.fieldNodes.count(),
    'the sidebar search now filters the tree — promote MP-036 to full coverage',
  ).toBe(total);

  await mapsPage.search.fill('');
  await expect(mapsPage.search).toHaveValue('');
});

test('@TC:MP-037 selecting a field focuses it and marks it selected', async ({ page, mapsPage }) => {
  test.setTimeout(120000);
  await mapsPage.open();

  const label = await mapsPage.selectField();
  const number = label.match(/^(\d+)/)?.[1];
  expect(number).toBeTruthy();

  // The selection is reflected in the aside and the URL. The breadcrumb renders each part as
  // its own node, so a ">"-joined regex matches nothing — it is checked via its container.
  await expect(mapsPage.aside).toContainText(number!);
  await expect(page.locator('app-f3-breadcrumb-v3, main').first()).toContainText(number!);
  expect(page.url(), 'the selected field is not carried in the URL').toMatch(/\?qp=/);
});

/**
 * MP-038 wants the acreage identical "across tree, map label and Details panel".
 *
 * The map label is drawn on the Google Maps canvas and cannot be read from the DOM, so only
 * the tree-vs-Details half is asserted. Partial for that reason.
 */
test('@TC-partial:MP-038 field acreage agrees between the tree and the aside', async ({
  mapsPage,
}) => {
  test.setTimeout(120000);
  await mapsPage.open();

  const label = await mapsPage.selectField();
  const treeArea = label.match(/([\d,]+\.\d{2})\s*ac/)?.[1];
  expect(treeArea, `tree node must show an area. Node: ${label}`).toBeTruthy();

  // "identical to two decimal places"
  const asideArea = (await mapsPage.asideValue('Area'))?.match(/([\d,]+\.\d{2})\s*ac/)?.[1];
  expect(asideArea).toBe(treeArea);
});

test('@TC:MP-039 the aside offers Summary and Details and both render', async ({
  page,
  mapsPage,
}) => {
  test.setTimeout(120000);
  await mapsPage.open();
  await mapsPage.selectField();

  const summary = page.getByRole('button', { name: 'Summary', exact: true });
  const details = page.getByRole('button', { name: 'Details', exact: true });
  await expect(details).toBeVisible();

  // Both tabs render field information without error.
  await details.click();
  await expect(mapsPage.aside).toContainText('Field Name', { timeout: 30000 });
  await expect(page.locator('body')).not.toContainText(/NG0[0-9]{3}|Cannot read propert/i);

  if (await summary.count()) {
    await summary.first().click();
    await expect(mapsPage.aside).toContainText('Field Name', { timeout: 30000 });
  }
});

test('@TC:MP-044 the Maps state survives a browser refresh', async ({ page, mapsPage }) => {
  test.setTimeout(120000);
  await mapsPage.open();

  const label = await mapsPage.selectField();
  const number = label.match(/^(\d+)/)?.[1];
  const selectedUrl = page.url();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await mapsPage.waitForLoaderGone();

  // "reloads to a valid Maps state without error; the selection is either restored or cleanly
  // reset per design" — here it is restored, because the selection lives in the URL.
  await expect(page).toHaveURL(selectedUrl);
  await expect(mapsPage.treeNodes.first()).toBeVisible({ timeout: 45000 });
  await expect(mapsPage.aside).toContainText(number!, { timeout: 45000 });
  await expect(page.locator('body')).not.toContainText(/NG0[0-9]{3}|Cannot match any routes/i);
});

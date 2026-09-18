import path from 'path';
import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { extractPdfText, missingFrom, readPdfFacts } from '../helpers/pdf';
import { SUB_TABS, type SubTabName } from '../pages/work-orders.page';

/**
 * Attachments & PDF Export. Workbook tab `15 Attachments & PDF`.
 *
 * Non-mutating: work orders are exported, never edited. The attachment cases (AP-001..AP-010)
 * upload and delete files on a shared tenant and stay manual.
 *
 * Content is read with `pdf-parse` (see `helpers/pdf.ts`). Text comes back in reading order
 * with the column layout collapsed, so these assert that sections and values are PRESENT
 * rather than how they are arranged — which is what the workbook's data cases ask.
 *
 * Section names follow the same Plot/Block build split seen elsewhere: a planned work order
 * exports "Plots"/"Plots Progress"/"Plot Map" while a harvest one exports
 * "Blocks"/"Blocks Progress"/"Block Map".
 */

// PDF generation is server-side and heavy — the export of a single work order is ~400KB with
// embedded imagery. Running these in parallel puts several generations in flight at once and
// every one of them exceeds the download timeout; serially they complete in ~20s each.
test.describe.configure({ mode: 'serial' });

const EXPORT_TITLE = 'Export Work Order Details';

/**
 * Open the work-order list and wait for real rows.
 *
 * `waitForGridSettled()` alone is not enough before READING columns: it waits out the
 * skeletons, and the skeleton count is zero while the table has not mounted at all, so a
 * column read straight after it sees an empty header row.
 */
async function openList(
  page: import('@playwright/test').Page,
  listPage: import('../pages/list.page').ListPage,
): Promise<void> {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });
}

/** Open the first work order on a sub-tab and export it, returning the saved file. */
async function exportFirstWorkOrder(
  page: import('@playwright/test').Page,
  listPage: import('../pages/list.page').ListPage,
  workOrdersPage: import('../pages/work-orders.page').WorkOrdersPage,
  subTab: SubTabName,
  testInfo: import('@playwright/test').TestInfo,
  status?: string,
  /** Export the first row whose value in this column is non-empty, rather than row 1. */
  requireColumn?: string,
): Promise<{ file: string; name: string } | null> {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();

  if (subTab !== 'Work Orders') {
    await workOrdersPage.openSubTab(subTab);
    await listPage.waitForGridSettled();
  }

  // Distinguish "this tab genuinely holds no work orders" from "the grid has not loaded yet".
  // Swallowing that difference made a slow load — the environment tires after several PDF
  // generations — look like an empty tab, and the caller then skipped a case that had data.
  const loaded = await expect
    .poll(async () => listPage.rows.count(), { timeout: 90000 })
    .toBeGreaterThan(0)
    .then(() => true)
    .catch(() => false);
  if (!loaded) {
    if (await listPage.emptyState.isVisible().catch(() => false)) return null;
    throw new Error(`The ${subTab} grid never loaded any rows`);
  }

  // Narrow to a status when the case needs a work order in a particular state — the grid's
  // default order is not stable between runs, so "the first row" is a different work order
  // each time and may not carry the data the case is about.
  if (status) {
    await listPage.filterByStatus(status);
    if ((await listPage.rows.count()) === 0) return null;
  }

  // Choose the row deliberately when the case needs particular data present. The grid's
  // default order is not stable between runs, so "the first row" is a different work order
  // each time — which previously made this group skip or fail depending on what happened to
  // be on top.
  let row = listPage.rows.first();
  if (requireColumn) {
    const values = await listPage.columnValues(requireColumn);
    const index = values.findIndex((value) => value.trim() !== '');
    if (index < 0) return null;
    row = listPage.rows.nth(index);
  }

  await workOrdersPage.openRowDetail(row);
  await expect(page).toHaveURL(new RegExp(`${routes.workorders.root}/\\d+`));
  await listPage.waitForLoaderGone();

  // Wait for the detail to actually render before exporting. The export control is present in
  // the toolbar well before the page is wired up, and a click that lands early is accepted and
  // then does nothing — no download, no dialog, no toast, just a silent no-op that reads as a
  // 120s timeout. Anchoring on the work-order heading (and a short settle) is what makes the
  // click stick; measured live 2026-09-08, the export itself then completes in ~5s.
  await expect(page.getByRole('heading', { name: /Work Order:/ })).toBeVisible({ timeout: 45000 });
  await page.waitForTimeout(3000);

  const exportButton = page.getByTitle(EXPORT_TITLE);
  await expect(exportButton, `no "${EXPORT_TITLE}" control on the ${subTab} detail`).toBeVisible({
    timeout: 30000,
  });

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 120000 }),
    exportButton.click(),
  ]);
  const file = path.join(testInfo.outputDir, download.suggestedFilename());
  await download.saveAs(file);
  return { file, name: download.suggestedFilename() };
}

test('@TC:AP-020 the export control generates a PDF', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(180000);

  const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, 'Work Orders', testInfo);
  expect(exported, 'no work orders to export').not.toBeNull();

  // "A PDF is generated and downloaded without error."
  expect(exported!.name, `downloaded ${exported!.name}`).toMatch(/\.pdf$/i);

  const facts = readPdfFacts(exported!.file);
  expect(facts.isPdf, 'the downloaded file is not a PDF').toBe(true);
  expect(facts.version).toMatch(/^\d+\.\d+$/);
  expect(facts.pages, 'the PDF has no pages').toBeGreaterThan(0);
  // A blank or errored export would be a near-empty file.
  expect(facts.bytes).toBeGreaterThan(10_000);
});

/**
 * AP-025 is the case the workbook singles out: "Every type exports successfully without error.
 * This has previously failed for some types - verify each."
 *
 * So each work-order type is exported in turn rather than sampling one. A tab holding no work
 * orders is skipped with a message rather than failing — that is missing data, not a defect.
 */
test('@TC:AP-025 every work-order type exports successfully', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(600000);

  const results: Record<string, { pages: number; bytes: number } | 'no rows'> = {};
  // Point Of Interests holds observations rather than work orders and has no export.
  const types = SUB_TABS.filter((tab) => tab !== 'Point Of Interests');

  for (const subTab of types) {
    const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, subTab, testInfo);
    if (!exported) {
      results[subTab] = 'no rows';
      continue;
    }
    const facts = readPdfFacts(exported.file);
    expect(facts.isPdf, `${subTab}: the export is not a PDF`).toBe(true);
    expect(facts.pages, `${subTab}: the exported PDF has no pages`).toBeGreaterThan(0);
    expect(facts.bytes, `${subTab}: the exported PDF is suspiciously small`).toBeGreaterThan(10_000);
    results[subTab] = { pages: facts.pages, bytes: facts.bytes };
  }

  // At least one type must actually have been exercised, or the test proves nothing.
  const exercised = Object.values(results).filter((r) => r !== 'no rows');
  expect(exercised.length, `no work orders on any tab: ${JSON.stringify(results)}`).toBeGreaterThan(0);
});

/**
 * AP-028 asks that the map "renders clearly and legibly in the PDF", flagged as a known defect
 * area with "verify the map is not blank".
 *
 * Legibility is a human judgement and the map is rasterised into the PDF, so what is checkable
 * is that the export embeds image data at all — a blank map would show up as an export with no
 * images. Partial for the clarity half.
 */
test('@TC-partial:AP-028 the exported PDF embeds image content', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(180000);

  const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, 'Work Orders', testInfo);
  expect(exported, 'no work orders to export').not.toBeNull();

  const facts = readPdfFacts(exported!.file);
  expect(
    facts.images,
    'the export embeds no images at all — the map and photo sections would be blank',
  ).toBeGreaterThan(0);
});

test('@TC:AP-021 the PDF content matches the work order detail', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(240000);

  // Capture the values the detail screen shows, before exporting.
  await openList(page, listPage);
  const row = {
    sequence: (await listPage.columnValues('WO Sequence No.'))[0].trim(),
    name: (await listPage.columnValues('WO Name'))[0].trim(),
    start: (await listPage.columnValues('WO Start Date'))[0].trim(),
    end: (await listPage.columnValues('WO End Date'))[0].trim(),
    farm: (await listPage.columnValues('Farm'))[0].trim(),
  };

  const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, 'Work Orders', testInfo);
  expect(exported).not.toBeNull();
  const text = await extractPdfText(exported!.file);

  // "All data in the PDF matches the work order detail exactly, including dates ... and names."
  expect(
    missingFrom(text, [row.sequence, row.name, row.start, row.end, row.farm]),
    `values on the detail row that never appear in the PDF (WO ${row.sequence})`,
  ).toEqual([]);
});

test('@TC:AP-026 the block progress section appears in the PDF', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(240000);

  await openList(page, listPage);
  // The list's Plots column names the plots this work order covers.
  const plots = (await listPage.columnValues('Plots'))[0]
    .split(',')
    .map((plot) => plot.trim())
    .filter(Boolean);

  const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, 'Work Orders', testInfo);
  expect(exported).not.toBeNull();
  const text = await extractPdfText(exported!.file);

  expect(text, 'no progress section in the export').toMatch(/(Plots|Blocks) Progress:/);
  // "Every block appears" — each plot from the list is named in the PDF.
  expect(missingFrom(text, plots), 'plots on the work order missing from the PDF').toEqual([]);
});

test('@TC:AP-027 the resources and assets sections appear with their hours', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(240000);

  const exported = await exportFirstWorkOrder(page, listPage, workOrdersPage, 'Work Orders', testInfo);
  expect(exported).not.toBeNull();
  const text = await extractPdfText(exported!.file);

  expect(missingFrom(text, ['Resources:', 'Assets:']), 'sections missing from the export').toEqual([]);
  // Both sections carry hours per entry.
  expect(text, 'the Resources/Assets sections carry no hours').toMatch(/\d+\s*hours?,\s*\d+\s*mins?/);
  // ...and are grouped by resource group, as the detail screen groups them.
  expect(text).toContain('Resource Group Name');
});

/**
 * AP-036 asks that "every material, rate, unit and application value matches the template
 * definition". The export's Inputs table is asserted to carry materials with rates and units,
 * but the comparison is against the work order rather than against the material template's own
 * definition — reaching that would mean opening Template Management and reconciling by hand.
 * Partial for that half.
 */
test('@TC-partial:AP-036 the material rows appear in the PDF with rates and units', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(240000);

  // Take the first work order that actually HAS materials rather than skipping when row 1
  // happens not to — the case is about the Inputs table, and a row with no materials cannot
  // demonstrate it either way.
  await openList(page, listPage);
  const materialCells = await listPage.columnValues('Materials');
  const withMaterials = materialCells.findIndex((cell) => cell.trim() !== '');
  test.skip(withMaterials < 0, 'no work order on the first page carries materials');

  const materials = materialCells[withMaterials]
    .split(',')
    .map((material) => material.trim().replace(/\s*\(.*$/, ''))
    .filter((material) => material.length > 3);

  const exported = await exportFirstWorkOrder(
    page, listPage, workOrdersPage, 'Work Orders', testInfo, undefined, 'Materials',
  );
  expect(exported).not.toBeNull();
  const text = await extractPdfText(exported!.file);

  expect(text, 'no Inputs section in the export').toContain('Inputs:');
  // Each material named on the list row appears in the PDF...
  expect(missingFrom(text, materials.slice(0, 3)), 'materials missing from the PDF').toEqual([]);
  // ...with a rate and a unit against it. The unit is matched generically rather than from a
  // list: the grid's default order is not stable between runs, so a different work order comes
  // first each time and the tenant measures materials in everything from `fl. oz` to `t`.
  expect(text, 'the Inputs table carries no rate/unit values').toMatch(
    /[\d.]+\s*[A-Za-z.][A-Za-z. ]{0,9}\/\s*acre/i,
  );
});

test('@TC:AP-023 the inspection PDF carries its inspection detail and progress sections', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(300000);

  // A **completed** inspection: the Inspection Detail section only exists once attributes have
  // actually been captured on the mobile app. An In Progress inspection at 0% exports Plots,
  // Resources, Weather and progress but no attribute table — which is missing data, not a
  // missing feature (observed live on WO-1218, 2026-09-14).
  const exported = await exportFirstWorkOrder(
    page, listPage, workOrdersPage, 'Inspection Work Orders', testInfo, 'Done',
  );
  test.skip(exported === null, 'no completed inspection work orders in the tenant');
  const text = await extractPdfText(exported!.file);

  // The inspection information: the captured attribute/value pairs.
  expect(text, 'no inspection detail section').toContain('Inspection Detail');
  expect(text, 'no attribute/value table').toMatch(/Attribute\s+Value/);
  // ...and the block progress section.
  expect(text, 'no progress section').toMatch(/(Plots|Blocks) Progress:/);
});

/**
 * AP-024 expects a harvest export to carry "the picked summary, block progress, assets and
 * resources sections".
 *
 * Only block progress is asserted. The harvest work orders in this tenant are Drafts with no
 * resources, assets or picked quantities recorded, so the other three sections are absent
 * because there is nothing to print — missing data, not a missing feature. Partial until a
 * harvest work order with recorded progress exists to export.
 */
test('@TC-partial:AP-024 the harvest PDF carries its block progress section', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(300000);

  const exported = await exportFirstWorkOrder(
    page, listPage, workOrdersPage, 'Harvest Work Orders', testInfo,
  );
  test.skip(exported === null, 'no harvest work orders in the tenant');
  const text = await extractPdfText(exported!.file);

  expect(text, 'no progress section in the harvest export').toMatch(/(Plots|Blocks) Progress:/);
  expect(text, 'no map section in the harvest export').toMatch(/(Plot|Block) Map:/);
});

test('@TC:AP-037 the weather table appears in the PDF with its readings', async ({
  page,
  listPage,
  workOrdersPage,
}, testInfo) => {
  test.setTimeout(300000);

  // Weather is recorded against inspection work orders in this tenant.
  const exported = await exportFirstWorkOrder(
    page, listPage, workOrdersPage, 'Inspection Work Orders', testInfo,
  );
  test.skip(exported === null, 'no inspection work orders in the tenant');
  const text = await extractPdfText(exported!.file);
  test.skip(!text.includes('Weather'), 'the exported work order has no weather readings');

  // "timestamp, temperature, wind speed and direction for each start and end event"
  expect(
    missingFrom(text, ['Date Time', 'Temperature', 'Wind Speed', 'Wind Direction']),
    'weather table columns missing from the PDF',
  ).toEqual([]);
  // At least one reading row: a date, a time and a numeric temperature.
  expect(text, 'the weather table has no readings').toMatch(
    /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}\s*(AM|PM)\s+[\d.]+/i,
  );
});

import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { FIELD_CODE_MAX_LENGTH, PLOT_FORM_LABELS } from '../pages/settings-plot.page';
import { testData, byLabel } from '../helpers/testData';

/**
 * Settings > Plot — create a field from the web app. ADO #26093.
 *
 * Not a regression-workbook flow: the workbook's `11 Settings` tab (ST-001..ST-040) predates
 * this enhancement and has no Plot case, so these specs carry no `@TC:` tag — an invented one
 * would be an orphan and `pnpm coverage` would (rightly) fail on it. They are tagged
 * `@ADO-26093` instead, which `--grep` reads the same way:
 *
 *     pnpm test:chromium -- --grep @ADO-26093
 *
 * Acceptance criteria and their automation split (full detail in
 * `test-plans/authenticated/settings-plot.md`):
 *
 *   AC #1  coordinates optional on Add Plot ............. automated (TC-1 contract, TC-2 behaviour)
 *   AC #2  no duplicate entries for the same farm ....... automated (TC-2, second half)
 *   AC #3  PlotJobField service enabled and functional .. half automated (TC-5); "functional"
 *                                                         is a D365 round-trip, manual
 *   AC #4  web-created plots sync to FinOps ............. web half automated (TC-3); the FinOps
 *                                                         half is manual — see the plan, D365
 *                                                         exposes no read service for plots
 *   AC #5  FinOps project syncs back to the web app ..... manual (starts in D365)
 *
 * **Mutating footprint: exactly one plot, on Site `Colusa`.** TC-2 is the only spec here that
 * writes, and it makes one successful submission per run. Its duplicate-rejection half
 * re-submits the SAME identity, so a working build creates nothing further — see the note on
 * that test for what happens on a build where AC #2 is not yet implemented.
 *
 * Source of truth for labels: `vannbrosphasetwo-knowledge/references/plots-fields.md`.
 */

/** The work item's own screenshots are Site `Colusa`; the suite's mutating footprint is scoped to it. */
const SITE = 'Colusa';
const FARM = byLabel(testData.farms.items, 'Vann Farm (VBSF)').label;

/**
 * Tenant values for the two dropdowns, taken from the work item's screenshots. They are not
 * in `fixtures/` (no metadata snapshot covers irrigation), so they are named here once.
 */
const IRRIGATION_METHOD = 'Drip (01)';
const IRRIGATION_SOURCE = 'Glenn-Colusa Irrigation District (GCID)';

/**
 * `Field Code` is capped at 10 characters, so a timestamp cannot be used whole. The low 6
 * digits of the epoch second roll over every ~11.6 days, which is far longer than a suite run
 * and keeps the code inside the cap.
 */
function uniquePlot(): { name: string; code: string } {
  const stamp = String(Math.floor(Date.now() / 1000)).slice(-6);
  return { name: `QA Test Plot ${stamp}`, code: `T${stamp}` };
}

/**
 * TC-1 (AC #1, non-mutating) — the form marks `Coordinate` as the one optional field.
 *
 * The cheap half of AC #1: it asserts the *contract* the criterion states, without writing a
 * plot to the shared QA tenant. TC-2 proves the behaviour behind it.
 */
test('@ADO-26093 the Add Plot form marks every field required except Coordinate', async ({
  plotPage,
}) => {
  test.setTimeout(150000);
  await plotPage.open();
  await plotPage.openAddPlotForm();

  for (const label of [
    PLOT_FORM_LABELS.farm,
    PLOT_FORM_LABELS.fieldName,
    PLOT_FORM_LABELS.fieldCode,
    PLOT_FORM_LABELS.irrigationMethod,
    PLOT_FORM_LABELS.irrigationSources,
    PLOT_FORM_LABELS.totalArea,
  ]) {
    expect(await plotPage.isRequired(label), `"${label}" should be required`).toBe(true);
  }

  // AC #1: "Coordinates are optional on the Add Plot form".
  expect(
    await plotPage.isRequired(PLOT_FORM_LABELS.coordinate),
    'Coordinate is marked required — AC #1 of ADO #26093 says it must be optional',
  ).toBe(false);

  // The control exists and is empty, i.e. optional-but-present rather than absent.
  await expect(plotPage.input(PLOT_FORM_LABELS.coordinate)).toBeVisible();
  await expect(plotPage.input(PLOT_FORM_LABELS.coordinate)).toHaveValue('');
});

/**
 * TC-2 (AC #1 + AC #2, `@mutating`) — the suite's single write.
 *
 * One submission on Site `Colusa`: save a plot with the Coordinate box blank (AC #1), confirm
 * it lands in the grid, then re-submit the same farm + code and confirm the app refuses it
 * (AC #2). A required-marker check alone would pass while the server still rejected a
 * coordinate-less payload, so the save is the real assertion of AC #1.
 *
 * On the duplicate half: the re-submission reuses the identity just created, so on a build
 * that implements AC #2 nothing further is written. On a build that does NOT, the app saves a
 * second plot — the test fails, which is the point, and the failure message carries the code
 * so the pair can be removed. There is no teardown either way; delete with
 * `DELETE /api/Field/{id}` (vannbrosphasetwo-vann-api-qa skill).
 *
 * The Site selector is stored server-side per user, so it is restored in a `finally` — leaving
 * the account on Colusa would silently re-scope every later spec and the next person to log in.
 */
test.describe('plot creation', () => {
  /**
   * No retries, for the same reason the `seed` project sets `retries: 0`: a retry re-runs the
   * whole test, so a flake landing *after* the save would write a second plot and blow the
   * one-submission budget. That is not hypothetical here — the QA host's DNS resolution is
   * intermittent from this network (three specs hit `ERR_NAME_NOT_RESOLVED` on 2026-09-23 and
   * passed on retry). Scoped to this block so the read-only specs keep their retry.
   */
  test.describe.configure({ retries: 0 });

  test('@mutating @ADO-26093 saves a Colusa plot with no coordinates and refuses a duplicate', async ({
    plotPage,
    listPage,
    headerPage,
  }) => {
    test.setTimeout(300000);
    const plot = uniquePlot();

    await plotPage.open();
    const previousSite = await headerPage.switchContext('site', SITE);

    try {
      // --- AC #1: one submission, no coordinates -------------------------------------------
      await plotPage.openAddPlotForm();
      await plotPage.fill({
        farm: FARM,
        fieldName: plot.name,
        fieldCode: plot.code,
        irrigationMethod: IRRIGATION_METHOD,
        irrigationSources: [IRRIGATION_SOURCE],
        totalArea: '12',
        // coordinate deliberately omitted — this is the criterion under test.
      });

      // The Summary panel reflects the entry before it is committed.
      await expect(plotPage.summary).toContainText(plot.name);
      await expect(plotPage.summary).toContainText(plot.code);

      await plotPage.save();

      // The plot exists in the grid it was created from.
      await listPage.waitForGridSettled();
      await listPage.searchColumn('Field Code', plot.code);
      await expect
        .poll(async () => listPage.columnValues('Field Name'), {
          timeout: 30000,
          message: `plot "${plot.name}" did not appear in the Plot grid after save`,
        })
        .toContain(plot.name);

      // --- AC #2: the same farm cannot take the same plot twice ------------------------------
      await listPage.clearAllColumnFilters();
      await plotPage.openAddPlotForm();
      await plotPage.fill({
        farm: FARM,
        fieldName: plot.name,
        fieldCode: plot.code,
        irrigationMethod: IRRIGATION_METHOD,
        irrigationSources: [IRRIGATION_SOURCE],
        totalArea: '12',
      });
      await plotPage.attemptSave();

      // Rejected, not saved: the form stays open and the app says why.
      await expect(
        plotPage.formHeading,
        `the Add Plot form closed on a duplicate — AC #2 of ADO #26093 says "${plot.code}" must be refused for ${FARM}`,
      ).toBeVisible({ timeout: 15000 });
      await expect(
        plotPage.errorToast,
        'no error was surfaced when re-saving an existing plot code',
      ).toBeVisible({ timeout: 15000 });

      // The invariant behind the criterion: one code, one row.
      await plotPage.close();
      await listPage.waitForGridSettled();
      await listPage.searchColumn('Field Code', plot.code);
      await expect
        .poll(async () => (await listPage.columnValues('Field Code')).length, {
          timeout: 30000,
          message: `duplicate plots exist for code "${plot.code}" on ${FARM} — delete them (DELETE /api/Field/{id})`,
        })
        .toBe(1);
    } finally {
      // Best-effort restore. If the test already failed by timing out, the page is closed and
      // this throws "Target page, context or browser has been closed" — which then REPLACES the
      // real failure in the report and sends the reader to header.page.ts instead of to the
      // actual problem (this happened on 2026-09-23 and hid a 300s hang in the form). Swallow
      // it: the restore is housekeeping, never the finding.
      await headerPage.switchContext('site', previousSite).catch(() => {});
    }
  });
});

/**
 * TC-3 (AC #4, web half) — the Plot grid is the web-side record that FinOps syncs against.
 *
 * AC #4's own assertion lives in D365 (`AgriERP management > Plots/Fields`) and cannot be made
 * from this app — nor from the FinOps services, which expose `create` for plots but no `get`
 * (vannbrosphasetwo-finops-api skill). What IS assertable here is the precondition: the grid
 * exposes the identity columns FinOps matches on, populated for every row. A blank `Field Code`
 * breaks the sync regardless of the batch job's state, so this is a real guard.
 */
test('@ADO-26093 the Plot grid exposes the identity columns FinOps syncs on', async ({
  page,
  listPage,
}) => {
  test.setTimeout(150000);
  await page.goto(routes.settings.plot, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled({ timeout: 90000 });
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  await listPage.clearAllColumnFilters();

  await listPage.expectColumns([
    'Site',
    'Farm',
    'Field Code',
    'Field Name',
    'Total Area',
    'Irrigation Method',
    'Irrigation Sources',
  ]);

  const count = await listPage.recordCount();
  expect(count!.total).toBeGreaterThan(0);

  // Every row carries the pair FinOps keys on.
  const codes = await listPage.columnValues('Field Code');
  const names = await listPage.columnValues('Field Name');
  expect(codes.length).toBeGreaterThan(0);
  for (const [index, code] of codes.entries()) {
    expect(code.trim(), `plot row ${index} has no Field Code`).not.toBe('');
    expect(names[index].trim(), `plot "${code}" has no Field Name`).not.toBe('');
  }
});

/**
 * TC-4 — `Field Code` enforces its 10-character cap.
 *
 * The work item asks for creation "via form **with limitations**", and the API model caps
 * `code` at 10 (`PlotFieldAPIModel`, vannbrosphasetwo-vann-api-qa skill). The form is expected
 * to enforce that client-side rather than let the server reject the save. Non-mutating: the
 * form is filled and abandoned, never saved.
 */
test('@ADO-26093 Field Code is capped at 10 characters', async ({ plotPage }) => {
  test.setTimeout(150000);
  await plotPage.open();
  await plotPage.openAddPlotForm();

  const code = plotPage.input(PLOT_FORM_LABELS.fieldCode);
  await code.fill('12345678901234');
  await expect(
    code,
    `Field Code accepted more than ${FIELD_CODE_MAX_LENGTH} characters — the API model rejects it`,
  ).toHaveValue(/^.{1,10}$/);
});

/**
 * TC-5 (AC #3, "enabled" half) — PlotJobField is registered and running in the Sync Console.
 *
 * AC #3 has two halves. "Enabled" is observable from the web app: the Sync Console's Service
 * Status grid lists every sync service with its `Job Status`. "Functional" means rows actually
 * reach D365 and stays manual.
 *
 * This is also the check that the 2026-09-16 regression on this work item would have caught —
 * the service was found **inactive** while plots silently failed to sync.
 */
test('@ADO-26093 the PlotJobField sync service is listed and active', async ({
  page,
  listPage,
}) => {
  test.setTimeout(150000);
  await page.goto(routes.syncConsole.serviceStatus, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled({ timeout: 90000 });
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });

  // The work item spells it both ways (`PlotJobField` in the acceptance criteria,
  // `PlotFieldJob` in the 2026-09-18 comment); match either rather than pick one.
  const names = await listPage.columnValues('Service Name');
  const statuses = await listPage.columnValues('Job Status');
  const index = names.findIndex((name) => /plot\s*(job\s*field|field\s*job)/i.test(name));

  expect(index, `no plot sync service in the Service Status grid — saw: ${names.join(', ')}`)
    .toBeGreaterThan(-1);
  expect(
    statuses[index].trim().toLowerCase(),
    `plot sync service "${names[index]}" is not active (AC #3 of ADO #26093)`,
  ).toMatch(/active|running|enabled|started/);
});

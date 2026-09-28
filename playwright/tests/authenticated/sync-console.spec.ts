import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Sync Console. Workbook tab `13 Sync Console & D365`.
 *
 * Read-only: the console's pages and their content. The integration cases (SD-003, SD-007,
 * SD-013..SD-024) need a D365 round-trip or a posting batch and stay manual. The exception is
 * SD-020, which checks the web-side Sync History log for expense postings but not D365. SD-006
 * ("Stop All Services" asks for confirmation) is not automated — see FINDINGS.md.
 *
 * The console is admin-only; the non-admin half of that gate (GN-036, SD access) needs a
 * lower-privileged session, which is still blocked by the tenant's MFA policy.
 */

test('@TC-partial:SD-001 the console loads with its sub-navigation', async ({ page, listPage }) => {
  await page.goto(routes.syncConsole.root, { waitUntil: 'domcontentloaded' });
  await listPage.waitForLoaderGone();

  // The workbook lists five sections; the product has since added Logs, Message Stats and
  // User App Version, and renamed two ("Sync History V2", "Api Logs"). Partial for that drift.
  for (const [label, href] of [
    ['Connections', routes.syncConsole.connections],
    ['Service Status', routes.syncConsole.serviceStatus],
    ['Sync History V2', routes.syncConsole.syncHistoryV2],
    ['Api Logs', routes.syncConsole.apiLogs],
    ['Messages', routes.syncConsole.messages],
  ] as const) {
    const link = page.getByRole('link', { name: label, exact: true });
    await expect(link, `sub-navigation entry "${label}" missing`).toHaveCount(1);
    await expect(link).toHaveAttribute('href', href);
  }
});

test('@TC:SD-002 the Connections page lists each connection with its endpoints and status', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.syncConsole.connections, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });

  await listPage.expectColumns([
    'Store Name',
    'Software Endpoint 1',
    'Software Endpoint 2',
    'Status',
  ]);

  // Every configured connection reports a store and a status.
  const stores = await listPage.columnValues('Store Name');
  const statuses = await listPage.columnValues('Status');
  expect(stores.length).toBeGreaterThan(0);
  for (const [index, store] of stores.entries()) {
    expect(store.trim(), `connection row ${index} has no store name`).not.toBe('');
    expect(statuses[index].trim(), `connection "${store}" has no status`).not.toBe('');
  }
});

/**
 * SD-004 expects "Service ID, Store Name, Service Name, Synchronization Frequency, Fetch
 * Marker, Sync Direction and ...".
 *
 * The column is rendered **`Synchronization Frequecy`** — misspelled in the product. The live
 * spelling is asserted so the test reflects reality; correcting the product would fail this
 * and is the signal to update it. See test-plans/FINDINGS.md.
 */
test('@TC-partial:SD-004 the Service Status page lists each service and its settings', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.syncConsole.serviceStatus, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });

  await listPage.expectColumns([
    'Service ID',
    'Store Name',
    'Service Name',
    'Synchronization Frequecy',
    'Fetch Marker',
    'Sync Direction',
    'Job Status',
    'Actions',
  ]);
  // This grid pages with a "Last Page" control rather than the usual
  // "Showing X - Y of Z records" footer, so there is no record count to read — assert on the
  // rendered rows instead.
  expect(await listPage.rows.count()).toBeGreaterThan(0);
});

/**
 * SD-012 carries a warning: "This view has previously failed with an unhandled error - confirm
 * the fix." It renders now, so this asserts the page reaches its own content rather than
 * merely returning a 200 — a crashed view would still route.
 */
test('@TC:SD-012 the message statistics view loads without error', async ({ page, listPage }) => {
  await page.goto(routes.syncConsole.stats, { waitUntil: 'domcontentloaded' });
  await listPage.waitForLoaderGone();

  // Its own controls, not the shell's.
  await expect(page.getByText('Errors Only', { exact: false }).first()).toBeVisible({
    timeout: 45000,
  });
  for (const control of ['Graphical', 'Tabular']) {
    await expect(page.getByText(control, { exact: true }).first(), `"${control}" view missing`)
      .toBeVisible();
  }

  await expect(page.locator('body')).not.toContainText(
    /unhandled|something went wrong|an error occurred|404|NG0[0-9]{3}/i,
  );
});

/**
 * SD-008: "Verify Sync History filters" (connection, log level, log type, date range, keyword,
 * then Reset).
 *
 * Only the keyword filter and Reset are automated. The dropdown filters (connection, log level,
 * log type, range) and their AND-combination are still manual. Partial for that reason.
 */
test('@TC-partial:SD-008 the Sync History keyword filter narrows the grid and Reset clears it', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.syncConsole.syncHistoryV2, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('heading', { name: 'Sync History V2' })).toBeVisible();

  await listPage.expectColumns([
    'Store Name',
    'Service Name',
    'Log Type',
    'Status',
    'Date (UTC +05:00)',
    'Message',
  ]);

  const total = async () => (await listPage.recordCount())?.total ?? -1;
  const unfiltered = await total();
  expect(unfiltered, 'Sync History footer never reported a record count').toBeGreaterThan(0);

  const keyword = page.getByRole('textbox', { name: 'Search Keyword' });
  await keyword.fill('expense');
  await page.getByRole('button', { name: 'Apply' }).click();
  await listPage.waitForGridSettled();

  await expect
    .poll(total, { timeout: 30000, message: 'keyword filter did not narrow the grid' })
    .toBeLessThan(unfiltered);
  expect(await total()).toBeGreaterThan(0);

  // Every row the filter returns carries the keyword somewhere in it.
  for (const text of await listPage.rows.allInnerTexts()) {
    expect(text, 'a row without the keyword survived the filter').toMatch(/expense/i);
  }

  await page.getByRole('button', { name: 'Reset' }).click();
  await listPage.waitForGridSettled();
  await expect(keyword).toHaveValue('');
  await expect
    .poll(total, { timeout: 30000, message: 'Reset did not restore the unfiltered grid' })
    .toBe(unfiltered);
});

/**
 * SD-020: "Verify expense job posting". The expected result is that "The expense posts to
 * the correct project and account in D365."
 *
 * An approved work order's expense lines go to FinOps through
 * `PlanningLinePostingHourLogJob`, which logs one row per Operation/Project pair in Sync
 * History V2 (e.g. `Starting sync for Expense Journal with Work order id 31226, Operation
 * 'VBS-008862', Project 'PRJ_000109'`) and then `Expense Journal with Work Order '31306'
 * synced to FinOps. record has been successfully synced.`. The `Work order id` is the
 * internal ID, not the `WO-###` sequence number.
 *
 * Read-only: this asserts that the job has run and logs in that shape, against existing
 * history. It does not approve a WO, and it cannot see the D365 side (a `PEJ`
 * "Project Expense Journal" batch under PM&A > Journals > Expense), so it stays partial.
 */
test('@TC-partial:SD-020 expense journal postings are logged by PlanningLinePostingHourLogJob', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.syncConsole.syncHistoryV2, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 45000 });

  await page.getByRole('textbox', { name: 'Search Keyword' }).fill('expense');
  await page.getByRole('button', { name: 'Apply' }).click();
  await listPage.waitForGridSettled();

  // Wait for the filtered result rather than the unfiltered page it replaces.
  await expect
    .poll(async () => (await listPage.columnValues('Service Name')).join('|'), { timeout: 30000 })
    .toMatch(/^PlanningLinePostingHourLogJob(\|PlanningLinePostingHourLogJob)*$/);

  const stores = await listPage.columnValues('Store Name');
  const messages = await listPage.columnValues('Message');
  expect(stores.every((s) => s === 'FinOps Sync'), `unexpected stores: ${[...new Set(stores)]}`)
    .toBe(true);

  const started = /^Starting sync for Expense Journal with Work order id \d+, Operation 'VBS-\d+', Project 'PRJ_\d+'\.?$/;
  const synced = /^Expense Journal with Work Order '\d+' synced to FinOps\. record has been successfully synced\.$/;
  for (const message of messages) {
    expect(message, 'expense row in an unrecognised format').toMatch(
      new RegExp(`${started.source}|${synced.source}`),
    );
  }
  expect(messages.some((m) => started.test(m)), 'no "Starting sync" row on the first page')
    .toBe(true);
});

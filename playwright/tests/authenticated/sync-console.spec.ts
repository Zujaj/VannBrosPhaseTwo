import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Sync Console. Workbook tab `13 Sync Console & D365`.
 *
 * Read-only: the console's pages and their content. The integration cases (SD-003, SD-007,
 * SD-013..SD-024) need a D365 round-trip or a posting batch and stay manual, and SD-006
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

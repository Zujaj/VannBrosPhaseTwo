import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Work Orders — Weather section (read-only web surface).
 * Plan: test-plans/authenticated/work-order-weather.md
 * Source of truth: `resources/Vann Brothers test cases/.../Weather TestCases.xlsx`
 * (sheet `Wind-24287`, `FOR WEB`, TC_WEB_01).
 *
 * WO-WX-001 is the one case in this plan that only needs a fresh, unstarted WO
 * (Draft/To Do/Queue) — every other case needs a WO with mobile-recorded weather data,
 * which isn't reliably available in the shared QA env (see the plan's "Automation
 * notes"). This spec is NON-MUTATING: it opens an existing WO's read-only details page
 * via the list's "View Work Order Detail" action only — no create/edit/submit/delete.
 */
test.describe('Work Order Weather Logging (Web)', () => {
  test('@TC:WT-001 Weather section renders empty before job start', async ({
    page,
    listPage,
    workOrdersPage,
  }) => {
    // 1. Open the Work Order details page on the Web.
    await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await workOrdersPage.waitForLoaderGone();
    await workOrdersPage.waitForToastsGone();
    // Settle the grid and drop any column filter a previous spec left behind before looking
    // for a row: the skeleton placeholders carry no status cell, and this env's column
    // filters persist across sessions (see ListPage.clearAllColumnFilters), so either one
    // makes "no To Do work order exists" the wrong conclusion from an empty match.
    await listPage.waitForGridSettled();
    await listPage.clearAllColumnFilters();

    // Any row still "To Do" (job not started on mobile) satisfies the Draft/To Do/Queue
    // precondition — the live QA list has many; take the first.
    const toDoRow = page
      .locator('table tbody tr')
      .filter({ has: page.getByRole('cell', { name: 'To Do', exact: true }) })
      .first();
    await expect(toDoRow).toBeVisible({ timeout: 20000 });
    await workOrdersPage.openRowDetail(toDoRow);
    await workOrdersPage.waitForLoaderGone();

    // 2. Locate the Weather section (rendered above the Map).
    const weatherHeading = page.getByRole('heading', { name: 'Weather', exact: true });
    // Live wording: the map section is titled "Plots Map" (plan says "Map" generically).
    const mapHeading = page.getByRole('heading', { name: 'Plots Map', exact: true });
    // The detail page paints its sections progressively, so both headings get a real budget
    // instead of the 5s default — the map section is consistently the last to arrive.
    await expect(weatherHeading).toBeVisible({ timeout: 20000 });
    await expect(mapHeading).toBeVisible({ timeout: 20000 });

    const weatherBox = await weatherHeading.boundingBox();
    const mapBox = await mapHeading.boundingBox();
    expect(weatherBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(weatherBox!.y).toBeLessThan(mapBox!.y);

    // Expected result: the Weather section is present but shows no data rows (no job has
    // been started yet) — the grid renders only its "No Record Found" placeholder row.
    const weatherSection = weatherHeading.locator('xpath=parent::div');
    await expect(weatherSection.getByRole('cell', { name: 'No Record Found' })).toBeVisible();
    await expect(weatherSection.locator('tbody tr')).toHaveCount(1);
  });
});

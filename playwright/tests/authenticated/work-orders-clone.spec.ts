import { test, expect } from '../fixtures';
import { savedToast } from '../pages/work-orders.page';
import { routes } from '../constants/routes';

/**
 * Smoke row WO-20, "Verify WO Clones successfully after hitting submit".
 *
 * Verified live on UAT 2026-10-12 (WO-145, Done → clone WO-147): the row's `Clone Work Order`
 * opens the Create form pre-filled as `Copy of <name>`; Submit → "Create Work Order" confirm →
 * Save stores the clone as a NEW work order in **To Do** at 0%, whatever the source's status.
 * Any WO type can be deleted while in To Do (product rule, 2026-10-09), which is how the clone
 * is removed again.
 *
 * @mutating: creates a real work order, then deletes it while it is still To Do. `afterEach`
 * repeats the delete when the test stops early, so a run leaves nothing behind.
 */
test.describe('Work order clone', () => {
  let cloneName: string | undefined;

  test.afterEach(async ({ page, workOrdersPage, listPage }) => {
    if (!cloneName) return;
    const name = cloneName;
    cloneName = undefined;
    await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await listPage.searchColumn('WO Name', name);
    const leftover = listPage.rows.filter({ hasText: name });
    if (await leftover.count()) await workOrdersPage.deleteRow(leftover.first());
  });

  test('@SMK:WO-20 @mutating a submitted clone saves as a new To Do work order, which can then be deleted', async ({
    page,
    workOrdersPage,
    listPage,
  }) => {
    test.setTimeout(240000);
    await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await listPage.waitForGridSettled();

    // Any row will do: Clone is offered on every status.
    const source = listPage.rows.first();
    const nameColumn = await listPage.columnIndex('WO Name');
    const sourceName = (await source.locator(`td:nth-child(${nameColumn})`).innerText()).trim();

    await workOrdersPage.cloneRow(source);
    const nameInput = page.getByPlaceholder('Enter Work Order Name');
    await expect(nameInput).toHaveValue(`Copy of ${sourceName}`, { timeout: 20000 });

    // A unique name finds the clone again and keeps teardown away from anyone else's WO.
    const name = `SMK Clone ${Date.now()}`;
    await nameInput.fill(name);
    await workOrdersPage.submitAndConfirm();
    cloneName = name;
    await expect(page.getByText(savedToast(name))).toBeVisible({ timeout: 30000 });

    await listPage.searchColumn('WO Name', name);
    const clone = listPage.rows.filter({ hasText: name });
    await expect(clone).toHaveCount(1, { timeout: 30000 });
    const statusColumn = await listPage.columnIndex('Status');
    await expect(clone.locator(`td:nth-child(${statusColumn})`)).toHaveText('To Do');

    await workOrdersPage.deleteRow(clone);
    cloneName = undefined;
  });
});

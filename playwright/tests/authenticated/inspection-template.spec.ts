import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { ApiSession } from '../helpers/templateApi';

/**
 * Inspection Template smoke rows (TI-01..TI-12), workbook `Inspection Template` scenario under
 * Template Management. TI-01/02/05 were already partly covered by `template-management.spec.ts`
 * (TM-013/015); this file covers the rest of the wizard, the list actions and — in one
 * `@mutating` flow that deletes what it creates — the save paths.
 *
 * Live layout (verified 2026-09-27): the Create wizard is a single step ("Enter Title & Select
 * Attributes") with General (Name*, Default Locations* numeric defaulting to 1, Template Status*
 * toggle) and Select Attribute* (Available / Selected lists, each with a "Type & Enter" search).
 * Row actions: `View Detail` on every row, `Clone Template` only on Enabled rows. A Draft's
 * detail page offers `Publish Template`. No Edit control exists on the list or on either detail
 * page, so TI-11 is not automated (see the note at the bottom).
 */

const SAVE_DRAFT = /^Save\s+[Aa]s\s+Draft$/;
const SAVE_PUBLISH = /^Save\s+(And|&)\s+Publish$/;
const WIZARD = /^Create New Template/;

async function openList(page: Page, listPage: { waitForGridSettled: () => Promise<void> }) {
  test.setTimeout(120000); // the template list is slow to mount under parallel load
  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
}

/** The wizard's Available Attributes tiles (Angular CDK drag items). */
function availableTiles(page: Page): Locator {
  return page.locator('.available-attributes .cdk-drop-list .cdk-drag');
}

/** The Selected Attributes drop list: the wizard's other CDK drop list. */
function selectedList(page: Page): Locator {
  return page.locator(
    'xpath=//div[contains(@class,"cdk-drop-list") and not(ancestor::*[contains(@class,"available-attributes")])]',
  ).first();
}

/** A tile's attribute name (`label.name`; the second label is its type). */
async function tileName(tile: Locator): Promise<string> {
  return (await tile.locator('label.name').innerText()).trim();
}

/**
 * Drag an Available tile into Selected Attributes. Angular CDK only starts a drag after the
 * pointer has moved a few pixels with the button held, so a one-jump `dragTo` can be ignored;
 * move in steps instead.
 */
async function dragToSelected(page: Page, tile: Locator): Promise<void> {
  const from = await tile.boundingBox();
  const to = await selectedList(page).boundingBox();
  if (!from || !to) throw new Error('attribute tile or Selected Attributes list not on screen');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + Math.min(40, to.height / 2), { steps: 20 });
  await page.mouse.up();
}

test('@SMK:TI-02 @SMK:TI-03 the General section takes a Name and a numeric Default Locations', async ({
  page,
  listPage,
  templatesPage,
}) => {
  await openList(page, listPage);
  await templatesPage.openCreateWizard();

  // TI-02: Name is required and accepts free text.
  const name = page.getByRole('textbox', { name: /^Name\*/ });
  await expect(page.getByText('Name*', { exact: true })).toBeVisible();
  await name.fill('SMK-AUTO name check (not saved)');
  await expect(name).toHaveValue('SMK-AUTO name check (not saved)');

  // TI-03: Default Locations is required, numeric, and defaults to 1.
  const locations = page.getByRole('spinbutton', { name: 'Default Locations*' });
  await expect(locations).toHaveValue('1');
  await locations.fill('3');
  await expect(locations).toHaveValue('3');
});

// Asserts the CORRECT behaviour and is marked `test.fail()` for a known QA bug: typing in the
// Available Attributes search and pressing Enter leaves every tile in place and sends no
// request, and the search icon only clears the box (verified 2026-09-27). Playwright reports
// "expected to fail, but passed" once it is fixed — drop the `test.fail()` line then.
test('@SMK:TI-04 the Available Attributes search narrows the list', async ({ page, listPage, templatesPage }) => {
  test.fail(true, 'Known QA bug (SMOKE-NOTES TI-ATTR-SEARCH): Available Attributes search does not filter');
  await openList(page, listPage);
  await templatesPage.openCreateWizard();

  const tiles = availableTiles(page);
  await expect.poll(() => tiles.count(), { timeout: 20000 }).toBeGreaterThan(1);
  const before = await tiles.count();
  const target = await tileName(tiles.first());

  // Placeholder drifts between "Type & Enter" and "Type And Enter" (same label-set drift as the
  // Material Template wizard), so locate the box by its place, not its text.
  const search = page.locator('.available-attributes input.filter-input');
  await search.pressSequentially(target, { delay: 30 });
  await search.press('Enter');

  await expect.poll(() => tiles.count(), { timeout: 15000 }).toBeLessThan(before);
  for (const name of await tiles.locator('label.name').allInnerTexts()) {
    expect(name.toLowerCase()).toContain(target.toLowerCase());
  }
});

test('@SMK:TI-05 dragging an attribute moves it to Selected Attributes', async ({
  page,
  listPage,
  templatesPage,
}) => {
  await openList(page, listPage);
  await templatesPage.openCreateWizard();

  await page.getByRole('textbox', { name: /^Name\*/ }).fill('SMK-AUTO select check (not saved)');
  // Both saves enable on a name alone (observed 2026-09-27), so the attribute requirement is
  // not enforced by the buttons; this asserts the selection itself.
  const tile = availableTiles(page).first();
  const name = await tileName(tile);
  await dragToSelected(page, tile);

  await expect(selectedList(page)).toContainText(name, { timeout: 10000 });
  await expect(availableTiles(page).locator('label.name', { hasText: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })).toHaveCount(0);
  // Deliberately not clicked: saving creates a real template (see the @mutating flow).
});

test('@SMK:TI-08 Close discards the wizard without saving', async ({ page, listPage, templatesPage }) => {
  await openList(page, listPage);
  const before = (await listPage.recordCount())?.total;

  await templatesPage.openCreateWizard();
  await page.getByRole('textbox', { name: /^Name\*/ }).fill('SMK-AUTO should not persist');
  await page.getByRole('button', { name: SAVE_PUBLISH }).locator('xpath=following-sibling::*[1]').click();

  await expect(page.getByRole('heading', { name: WIZARD })).toBeHidden({ timeout: 10000 });
  await listPage.waitForGridSettled();
  if (before !== undefined) expect((await listPage.recordCount())?.total).toBe(before);
});

test('@SMK:TI-12 View Detail opens the template detail page', async ({ page, listPage }) => {
  await openList(page, listPage);
  const name = (await listPage.columnValues('Name'))[0].trim();

  await listPage.rows.first().getByTitle('View Detail').click();

  await expect(page).toHaveURL(new RegExp(`${routes.templateMgmt.inspectionTemplates}/\\d+$`));
  await expect(page.getByRole('heading', { name: `Inspection Detail: ${name}`, level: 1 })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText(/Default Locations:/)).toBeVisible();
});

test('@SMK-partial:TI-10 Clone Template opens the wizard pre-filled as "Copy Of <name>"', async ({
  page,
  listPage,
}) => {
  await openList(page, listPage);

  // Clone is only offered on Enabled templates.
  const row = listPage.rows.filter({ has: page.getByTitle('Clone Template') }).first();
  const source = (await row.locator('td').first().innerText()).trim();
  await row.getByTitle('Clone Template').click();

  await expect(page.getByRole('heading', { name: WIZARD })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('textbox', { name: /^Name\*/ })).toHaveValue(`Copy Of ${source}`, { timeout: 15000 });
  // Partial: the copied attributes land in Selected Attributes and Save is offered, but the
  // clone is not saved here (the @mutating flow covers saving).
  await expect(page.getByRole('button', { name: SAVE_PUBLISH })).toBeEnabled();
});

/**
 * Creates two templates (one Draft, one Published) and publishes the Draft from its detail
 * page. Every template it creates is named `SMK-AUTO <stamp> ...`; `afterEach` deletes them by
 * that prefix through the API, which Playwright runs even when the test times out. Excluded
 * from `pnpm test:smoke` / `test:clean`; run with `pnpm test:smoke:all`.
 */
test.describe('@mutating inspection template save paths', () => {
  // Parked 2026-09-27: with a Name and a dragged-in attribute on screen, clicking Save As Draft
  // sends no request at all (the api-write log stays empty), so either the app silently blocks
  // the save or the synthetic drag moves the tile without updating the form model. A single
  // manual save on QA tells which; until then this would only ever fail.
  test.fixme(true, 'Save As Draft sends no request after a synthetic drag — needs one manual check (SMOKE-NOTES TI-SAVE-NOOP)');

  const prefix = `SMK-AUTO ${Date.now()} `;
  let api: ApiSession;

  test.beforeEach(({ page }) => {
    api = ApiSession.watch(page);
    // Record every write the app makes, so a failed save shows its status in the report.
    page.on('response', (response) => {
      const request = response.request();
      if (request.method() !== 'GET' && /\/api\//.test(request.url())) {
        const path = new URL(request.url()).pathname;
        test.info().annotations.push({ type: 'api-write', description: `${request.method()} ${path} -> ${response.status()}` });
      }
    });
  });

  test.afterEach(async () => {
    for (const line of await api.deleteByPrefix('template', prefix)) {
      test.info().annotations.push({ type: 'cleanup', description: `DELETE ${line}` });
    }
    expect(await api.findByPrefix('template', prefix), 'SMK-AUTO templates left on QA').toEqual([]);
  });

  test('@mutating @SMK:TI-01 @SMK:TI-06 @SMK:TI-07 @SMK:TI-09 create as Draft, publish it, and create Published', async ({
    page,
    listPage,
    templatesPage,
  }) => {
    test.setTimeout(300000);

    const createTemplate = async (name: string, save: RegExp) => {
      await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
      await listPage.waitForGridSettled();
      await templatesPage.openCreateWizard();
      await page.getByRole('textbox', { name: /^Name\*/ }).fill(name);
      await dragToSelected(page, availableTiles(page).first());
      await expect(selectedList(page).locator('.cdk-drag')).not.toHaveCount(0);
      await page.getByRole('button', { name: save }).click();
      await expect(page.getByText('Template created successfully')).toBeVisible({ timeout: 20000 });
    };

    // TI-01 / TI-06: a Normal inspection template saved as Draft.
    const draftName = `${prefix}draft`;
    await createTemplate(draftName, SAVE_DRAFT);
    await templatesPage.switchStatusTab('Draft');
    const draftRow = listPage.rows.filter({ hasText: draftName }).first();
    await expect(draftRow).toContainText('Draft', { timeout: 20000 });

    // TI-09: publish it from its detail page.
    await draftRow.getByTitle('View Detail').click();
    await page.getByRole('button', { name: 'Publish Template' }).click();
    await expect(page.getByText('Published', { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // TI-07: a second template saved straight to Published.
    const publishedName = `${prefix}published`;
    await createTemplate(publishedName, SAVE_PUBLISH);
    await templatesPage.switchStatusTab('Published');
    await expect(listPage.rows.filter({ hasText: publishedName }).first()).toContainText('Published', {
      timeout: 20000,
    });
  });
});

// Not automated — TI-11 "Edit template from detail screen": no Edit control exists on the
// inspection-template list or on a Draft or Published detail page (checked 2026-09-27; the
// detail pages offer only Back and, on a Draft, Publish Template). Confirm with the product
// team whether editing was removed or is missing.

import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { ApiSession } from '../helpers/templateApi';

/**
 * Attribute Template smoke rows (TA-01..TA-10), workbook `Attribute Template` scenario under
 * Template Management.
 *
 * Live layout (verified 2026-09-27): the Attributes screen is a card deck (`TemplatesPage.
 * attributeCards`), each card carrying a `Normal` badge, its name, a preview and an
 * Enable/Disable switch, with a `Search Attributes` box and `Create` above it. Create opens the
 * "Add New Attribute" panel: step 1 "Select Attribute" (type tiles: Comment Box, Custom Slider,
 * Date Time Picker, List Picker, Number Pad, Number Slider, Switch, Key Value) → `Next` → step 2
 * "Attribute Details" (Name*, Attribute Status* Enable toggle) with `Back`. Save / Save & Add
 * New stay disabled until a name is entered. The Save & Add New label drifts between
 * "Save & Add New" and "Save And Add New" per load, like the Material Template wizard.
 */

const WIZARD = 'Add New Attribute';
const SAVE_AND_ADD_NEW = /^Save (&|And) Add New$/;

async function openAttributes(page: Page) {
  // Never shorten a longer timeout a caller already set (the @mutating flows set 300s).
  test.setTimeout(Math.max(test.info().timeout, 120000));
  await page.goto(routes.templateMgmt.templateAttribute, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Attributes', level: 1 })).toBeVisible({ timeout: 45000 });
  await expect(page.getByRole('textbox', { name: 'Search Attributes' })).toBeVisible();
  // The deck loads after the toolbar; count nothing until it has.
  await expect.poll(async () => (await cardNames(page)).length, { timeout: 30000 }).toBeGreaterThan(1);
}

/** Attribute names on the deck: every card's level-6 heading except the `Normal` badge. */
async function cardNames(page: Page): Promise<string[]> {
  const headings = await page.locator('app-f3-template-card .card').getByRole('heading', { level: 6 }).allInnerTexts();
  return headings.map((h) => h.trim()).filter((h) => h && h !== 'Normal');
}

function cardByName(page: Page, name: string): Locator {
  return page
    .locator('app-f3-template-card .card')
    .filter({ has: page.getByRole('heading', { name, level: 6, exact: true }) })
    .first();
}

/**
 * A type tile in the Add New Attribute panel. Card names on the deck can repeat a type name
 * (there is a "Custom Slider" attribute), and the panel renders after the deck, so take the
 * last match.
 */
function typeTile(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).last();
}

async function openWizard(page: Page) {
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { name: WIZARD, level: 2 })).toBeVisible({ timeout: 20000 });
}

test('@SMK:TA-02 @SMK:TA-03 @SMK:TA-04 select an attribute type, then Next and Back', async ({ page }) => {
  await openAttributes(page);
  await openWizard(page);

  // TA-02: picking a type tile records it in the Summary.
  await typeTile(page, 'Comment Box').click();
  await expect(page.getByText(/Attribute\s*Comment Box/).last()).toBeVisible();

  // TA-03: Next moves to Attribute Details — Name* plus the Attribute Status toggle (on).
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Details', level: 3 })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Name\*/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Enable' }).last()).toBeChecked();
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();

  // TA-04: Back returns to the type tiles with the choice kept.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Details', level: 3 })).toBeHidden();
  await expect(typeTile(page, 'Custom Slider')).toBeVisible();
  await expect(page.getByText(/Attribute\s*Comment Box/).last()).toBeVisible();
});

test('@SMK:TA-06 Close discards the Add New Attribute panel', async ({ page }) => {
  await openAttributes(page);
  const before = (await cardNames(page)).length;
  await openWizard(page);
  await typeTile(page, 'Comment Box').click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('textbox', { name: /^Name\*/ }).fill('SMK-AUTO should not persist');

  // The close (X) icon is the control right after Save & Add New in the panel header.
  await page.getByRole('button', { name: SAVE_AND_ADD_NEW }).locator('xpath=following-sibling::*[1]').click();

  await expect(page.getByRole('heading', { name: WIZARD, level: 2 })).toBeHidden({ timeout: 10000 });
  expect((await cardNames(page)).length).toBe(before);
  expect(await cardNames(page)).not.toContain('SMK-AUTO should not persist');
});

test('@SMK:TA-07 Search Attributes narrows the deck to matching cards', async ({ page }) => {
  await openAttributes(page);
  const before = await cardNames(page);
  const target = before.find((n) => /^[A-Za-z]/.test(n) && before.filter((m) => m.includes(n)).length === 1) ?? before[0];

  const search = page.getByRole('textbox', { name: 'Search Attributes' });
  await search.pressSequentially(target, { delay: 30 });
  await search.press('Enter');

  await expect.poll(async () => (await cardNames(page)).length, { timeout: 15000 }).toBeLessThan(before.length);
  for (const name of await cardNames(page)) expect(name.toLowerCase()).toContain(target.toLowerCase());
});

/**
 * The attribute save paths. Every attribute created here is named `SMK-AUTO <stamp> ...`, and
 * `afterEach` (which Playwright runs even after a timeout) tries to delete them by that prefix.
 *
 * GATED OFF by default: on QA `DELETE /api/Form/inputfields/{id}` returns 500, and so does the
 * Disable switch (`PUT .../toggleStatus`), so every attribute these tests create stays on the
 * shared tenant, enabled, for good (SMOKE-NOTES TA-DELETE-500 — two are already there from
 * 2026-09-27, ids 366/367). Run only with `ALLOW_UNDELETABLE_ATTRIBUTES=1`, or once the backend
 * can delete attributes; the afterEach assertion then proves nothing is left behind.
 */
test.describe('@mutating attribute save paths', () => {
  test.skip(
    !process.env.ALLOW_UNDELETABLE_ATTRIBUTES,
    'creates attributes QA cannot delete (DELETE /api/Form/inputfields/{id} -> 500); set ALLOW_UNDELETABLE_ATTRIBUTES=1 to run',
  );

  const prefix = `SMK-AUTO ${Date.now()} `;
  let api: ApiSession;

  test.beforeEach(({ page }) => {
    api = ApiSession.watch(page);
  });

  test.afterEach(async () => {
    for (const line of await api.deleteByPrefix('attribute', prefix)) {
      test.info().annotations.push({ type: 'cleanup', description: `DELETE ${line}` });
    }
    expect(await api.findByPrefix('attribute', prefix), 'SMK-AUTO attributes left on QA').toEqual([]);
  });

  const createAttribute = async (page: Page, name: string, save: RegExp | string) => {
    await typeTile(page, 'Comment Box').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('textbox', { name: /^Name\*/ }).fill(name);
    await page.getByRole('button', { name: save, exact: typeof save === 'string' }).click();
    await expect(page.getByText('Attribute created successfully').last()).toBeVisible({ timeout: 20000 });
  };

  test('@mutating @SMK:TA-01 @SMK:TA-05 Save & Add New, then Save, create attributes', async ({ page }) => {
    test.setTimeout(300000);
    await openAttributes(page);
    await openWizard(page);

    // TA-05: Save & Add New saves and resets the panel to step 1 for the next attribute.
    await createAttribute(page, `${prefix}a`, SAVE_AND_ADD_NEW);
    await expect(page.getByRole('heading', { name: WIZARD, level: 2 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();

    // TA-01: Save creates the attribute and closes the panel; both cards are on the deck.
    await createAttribute(page, `${prefix}b`, 'Save');
    await expect(page.getByRole('heading', { name: WIZARD, level: 2 })).toBeHidden({ timeout: 15000 });
    await expect(cardByName(page, `${prefix}b`)).toBeVisible({ timeout: 30000 });
    await expect(cardByName(page, `${prefix}a`)).toBeVisible();
  });

  // Asserts the CORRECT behaviour and is marked `test.fail()`: on QA the switch's
  // `PUT /api/form/inputfields/{id}/toggleStatus` returns 500 and the card stays Enabled
  // (verified 2026-09-27 through the app's own UI). Drop `test.fail()` once it is fixed.
  test('@mutating @SMK:TA-08 @SMK:TA-09 disable, then enable, an attribute', async ({ page }) => {
    test.fail(true, 'Known QA bug (SMOKE-NOTES TA-DELETE-500): attribute toggleStatus returns 500');
    test.setTimeout(300000);
    await openAttributes(page);
    await openWizard(page);
    await createAttribute(page, `${prefix}toggle`, 'Save');

    // The switch is a visually hidden `input#<attributeId>` driven by its `label[for]`.
    const card = cardByName(page, `${prefix}toggle`);
    await expect(card).toBeVisible({ timeout: 30000 });
    const input = card.locator('input[type=checkbox]');
    const toggle = async () => {
      await card.locator('label.custom-control-label').click();
      await page.getByRole('button', { name: 'Ok', exact: true }).click(); // "Disable Attribute" confirm
    };

    await toggle(); // TA-09
    await expect(input).not.toBeChecked({ timeout: 15000 });
    await toggle(); // TA-08
    await expect(input).toBeChecked({ timeout: 15000 });
  });
});

// Not automated — TA-10 "Verify filters": the Attributes screen shows no filter control. The
// only candidate, the unlabelled icon beside Search Attributes, opens nothing (checked
// 2026-09-27). Confirm with the product team what "filters" refers to here.

import { test, expect } from '../fixtures';
import { HEADER_MODULES, USER_MENU_ENTRIES } from '../pages/header.page';
import { QA_ENVIRONMENT_LABEL, routes, routeUrl } from '../constants/routes';
import { testData } from '../helpers/testData';

/**
 * Global & Navigation — the application header.
 * Workbook tab: `01 Global & Navigation`.
 *
 * All non-mutating: these read the header and navigate. The Site/Season switching cases live
 * in `global-context.spec.ts` because they DO change stored per-user state and must restore it.
 */

test.beforeEach(async ({ page, headerPage }) => {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();
});

test('@TC:GN-013 header shows every primary module exactly once', async ({ headerPage }) => {
  for (const { label } of HEADER_MODULES) {
    // `toHaveCount(1)` is the assertion GN-013 actually asks for — "no missing or DUPLICATED
    // entries" — which `toBeVisible()` on a strict locator would not distinguish.
    await expect(headerPage.navLink(label)).toHaveCount(1);
    await expect(headerPage.navLink(label)).toBeVisible();
  }
});

test('@TC:GN-014 each header module link routes to its own page', async ({ page, headerPage }) => {
  for (const { label, route, root } of HEADER_MODULES) {
    // Retry the click-and-route as a unit. Under parallel load the SPA can swallow a nav
    // click that lands while it is still settling the previous module, leaving the URL
    // unchanged — a dropped click, not a routing bug, so re-clicking is the right response.
    await expect(async () => {
      await headerPage.waitForLoaderGone();
      await headerPage.navLink(label).click({ timeout: 8000 });
      await expect(page).toHaveURL(new RegExp(`${route}(/|$|\\?)`), { timeout: 8000 });
    }).toPass({ timeout: 45000 });
    await headerPage.waitForLoaderGone();
    // "each rendering its own page without error": a routed-but-broken module still paints
    // the shell, so assert the module's OWN component mounted. See HEADER_MODULES for why
    // this is not a heading assertion.
    await expect(page.locator(root)).toBeVisible({ timeout: 20000 });
  }
});

test('@TC:GN-015 the active module is highlighted and survives a refresh', async ({
  page,
  headerPage,
}) => {
  const active = headerPage.navLink('Work Orders');
  const inactive = headerPage.navLink('Maps');
  // The router marks the active link with Angular's routerLinkActive class.
  await expect(active).toHaveClass(/active/);
  await expect(inactive).not.toHaveClass(/active/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();
  await expect(headerPage.navLink('Work Orders')).toHaveClass(/active/);
});

test('@TC:GN-029 the D365 shortcut points at a QA environment, never production', async ({
  headerPage,
}) => {
  const href = await headerPage.erpLink.getAttribute('href', { timeout: 20000 });
  expect(href, 'header must expose the D365 shortcut').toBeTruthy();

  const host = new URL(href!).host;
  // The workbook's real requirement is the safety one: "A QA build must never link to the
  // production D365 environment." Assert the QA marker positively rather than trying to
  // enumerate what production might look like.
  expect(host, `D365 link resolved to ${host}`).toMatch(/-qa-|qa\./i);
  expect(host).toContain('dynamics.com');
});

test('@TC:GN-032 the user menu shows the expected entries for an admin', async ({ headerPage }) => {
  const menu = await headerPage.openUserMenu();

  for (const entry of USER_MENU_ENTRIES) {
    await expect(menu).toContainText(entry);
  }
  // Admin flag, and the admin-only console entry. Live label is "Comax Console" — the
  // workbook calls it Sync Console; same entry, and GN-036 covers the role gate itself.
  await expect(menu).toContainText(/Admin:\s*Yes/i);
  await expect(menu).toContainText(/Comax Console|Sync Console/i);
  // Display name / role.
  await expect(menu).toContainText('Crop Planner');
});

test('@TC-partial:GN-033 the user menu reports a well-formed application version', async ({
  headerPage,
}) => {
  const menu = await headerPage.openUserMenu();
  const version = await headerPage.userMenuValue(menu, 'Version');

  expect(version, 'user menu must expose a Version').toBeTruthy();
  // Partial by design: confirming the string matches the build actually deployed needs the
  // release notes / pipeline for the environment, which automation has no access to. What is
  // checkable here is that a real version is rendered rather than a blank or a raw token.
  expect(version).toMatch(/^\d+\.\d+\.\d+/);
});

test('@TC:GN-034 the Environment label matches the environment under test', async ({
  headerPage,
}) => {
  const menu = await headerPage.openUserMenu();
  const environment = await headerPage.userMenuValue(menu, 'Environment');

  // Guards the "a production build must never display a QA label or vice versa" direction:
  // the label is compared against the tenant this suite is pinned to at the auth gateway.
  expect(environment).toBe(QA_ENVIRONMENT_LABEL);
});

test('@TC:GN-021 the Site selector lists permitted sites and filters as you type', async ({
  headerPage,
}) => {
  const panel = await headerPage.openContext('site');
  const options = headerPage.contextOptions(panel);

  const all = (await options.allInnerTexts()).map((t) => t.trim());
  expect(all.length).toBeGreaterThan(1);
  expect(all).toContain('Colusa');

  const search = panel.locator('#searchTextbox');
  await search.fill('Col');
  await expect(options.filter({ hasText: 'Colusa' })).toHaveCount(1);
  // The type-ahead must actually narrow the list, not just highlight — otherwise a broken
  // filter would still pass the assertion above.
  expect(await options.count()).toBeLessThan(all.length);

  // Clearing restores the full list.
  await search.fill('');
  await expect(options).toHaveCount(all.length);
});

test('@TC:GN-024 the Season selector lists the configured crop years and marks the current one', async ({
  headerPage,
}) => {
  const expected = testData.seasons.items.map((s) => s.name);
  const panel = await headerPage.openContext('season');
  const options = headerPage.contextOptions(panel);

  const listed = (await options.allInnerTexts()).map((t) => t.trim());
  expect(listed.sort()).toEqual([...expected].sort());

  // "and marks the currently selected one" — the open panel flags it with `.active`.
  const current = await headerPage.currentContext('season');
  await expect(options.filter({ hasText: current })).toHaveClass(/active/);
});

test('@TC:GN-016 the breadcrumb reflects the current location and is navigable', async ({
  page,
  headerPage,
}) => {
  await expect(headerPage.breadcrumb.filter({ hasText: 'Home' })).toBeVisible();
  const trailing = headerPage.breadcrumb.filter({ hasText: 'Work Orders' }).last();
  await expect(trailing).toBeVisible();
  // "the trailing node is not clickable" — the current page is rendered as plain text.
  await expect(trailing.getByRole('link')).toHaveCount(0);

  // Same dropped-click risk as GN-014 under load.
  await expect(async () => {
    await headerPage.waitForLoaderGone();
    await headerPage.breadcrumb.getByRole('link', { name: 'Home' }).click({ timeout: 8000 });
    await expect(page).not.toHaveURL(new RegExp(routes.workorders.root), { timeout: 8000 });
  }).toPass({ timeout: 45000 });
});

/**
 * GN-045 expects "the custom 404 page ... with a working route back into the application".
 *
 * Live behaviour (2026-09-07) delivers only half of that: an unknown route renders a bare
 * `404` with NO header, nav or link back — the user's only way out is the browser Back
 * button or editing the URL. That is a product gap, not a test defect, so this asserts the
 * half that holds (a handled 404, no framework error leaking) and is tagged partial. The
 * missing navigation is written up in test-plans/FINDINGS.md for QA to raise.
 */
test('@TC-partial:GN-045 an unknown route renders a handled 404, not a framework error', async ({
  page,
  headerPage,
}) => {
  await page.goto('/this-route-does-not-exist-9f3a', { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();

  await expect(page.getByText(/404/)).toBeVisible();
  // No raw framework error is exposed.
  await expect(page.locator('body')).not.toContainText(/Cannot match any routes|NG0[0-9]{3}/i);

  // Documents the gap rather than asserting the app is fine: if a route back is ever added,
  // this flips and the case can be promoted to full coverage.
  await expect(
    headerPage.navLink('Maps'),
    'GN-045 expects a route back into the app from the 404 page; the live page offers none',
  ).toHaveCount(0);
});

test('@TC:GN-036 an admin reaches the Sync Console from the menu and by URL', async ({
  page,
  headerPage,
}) => {
  // The admin half of the role gate. The non-admin half (entry hidden AND direct URL denied)
  // needs a lower-privileged session — see global-permissions.spec.ts.
  const menu = await headerPage.openUserMenu();
  await expect(menu).toContainText(/Comax Console|Sync Console/i);

  await page.goto(routes.syncConsole.root, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();
  expect(page.url()).not.toMatch(/accessdenied|unauthorized|forbidden/i);
  await expect(page).toHaveURL(new RegExp(routes.syncConsole.root));
});

/**
 * GN-046 requires that no raw i18n key, `undefined` label or empty tooltip appears anywhere.
 *
 * The app is clean everywhere scanned EXCEPT the Communication Center's Send button, whose
 * tooltip is the unresolved resource key `type_message_to_send` (verified live 2026-09-08).
 * The clean modules are asserted properly and the known offender is pinned, so this test
 * fails — deliberately — once the key is translated, which is the signal to promote the case
 * to full coverage. See test-plans/FINDINGS.md.
 */
test('@TC-partial:GN-046 visible labels are resolved translation strings', async ({
  page,
  headerPage,
}) => {
  test.setTimeout(180000);

  /** Attribute and text values that look like an unresolved `snake_case` resource key. */
  const rawKeys = () =>
    page.evaluate(() => {
      const key = /^[a-z0-9]+(_[a-z0-9]+){1,}$/;
      const found: string[] = [];
      for (const el of document.querySelectorAll('[title],[aria-label],[placeholder]')) {
        for (const attr of ['title', 'aria-label', 'placeholder']) {
          const value = el.getAttribute(attr)?.trim();
          if (value && key.test(value)) found.push(`${attr}="${value}"`);
        }
      }
      for (const el of document.querySelectorAll('*')) {
        const text = el.children.length === 0 ? el.textContent?.trim() : '';
        if (text && key.test(text)) found.push(`text="${text}"`);
      }
      return [...new Set(found)];
    });

  for (const route of [routes.workorders.root, routes.cropMgmt, routes.harvestCentral.root]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await headerPage.waitForLoaderGone();
    await page.waitForTimeout(6000); // let the module finish painting before scanning
    expect(await rawKeys(), `raw i18n keys on ${route}`).toEqual([]);
  }

  // No `undefined` label leaks either.
  await expect(page.locator('body')).not.toContainText(/\bundefined\b/);

  // The known offender, pinned as current behaviour rather than asserted as correct.
  await page.goto(routes.messaging, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();
  await expect(page.locator('app-chathead-card').first()).toBeVisible({ timeout: 45000 });
  await page.locator('app-chathead-card').first().click();
  await expect(page.getByPlaceholder('Type A Message')).toBeVisible({ timeout: 30000 });

  expect(
    await page.getByRole('button', { name: 'Send', exact: true }).getAttribute('title'),
    'the Send tooltip is translated now — promote GN-046 to full coverage',
  ).toBe('type_message_to_send');
});

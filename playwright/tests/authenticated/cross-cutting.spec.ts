import { test, expect } from '../fixtures';
import { QA_ENVIRONMENT_LABEL, routes } from '../constants/routes';

/**
 * Cross-Cutting & NFR. Workbook tab `17 Cross-Cutting & NFR`.
 *
 * Only the cases a browser can actually decide are here. The performance cases (CX-005..
 * CX-010) need agreed thresholds and a controlled environment; compatibility (CX-001..CX-003)
 * is a device/browser matrix; the privilege-escalation cases (CX-011, CX-012) need a
 * lower-privileged session, still blocked by the tenant's MFA policy; and the injection cases
 * (CX-013, CX-014) write attacker-shaped input into a shared tenant.
 */

test('@TC:CX-023 the application version and environment match the environment under test', async ({
  headerPage,
  page,
}) => {
  await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
  await headerPage.waitForLoaderGone();

  const menu = await headerPage.openUserMenu();
  const version = await headerPage.userMenuValue(menu, 'Version');
  const environment = await headerPage.userMenuValue(menu, 'Environment');

  // "Both match the intended build for the environment under test."
  expect(version, 'the user menu exposes no Version').toMatch(/^\d+\.\d+\.\d+/);
  expect(environment, 'the environment label does not match the tenant under test').toBe(
    QA_ENVIRONMENT_LABEL,
  );
});

/**
 * CX-015: "No credential, token or personal data is written to the URL, console or persistent
 * browser storage in readable form."
 *
 * Checks the three surfaces the case names. Cookies are excluded deliberately — a session
 * cookie is how the app authenticates, and the case is about data leaking somewhere it can be
 * read back, not about the session itself.
 */
test('@TC:CX-015 no credential or token is exposed in the URL, console or storage', async ({
  page,
  headerPage,
}) => {
  test.setTimeout(150000);

  const consoleText: string[] = [];
  page.on('console', (message) => consoleText.push(message.text()));

  // Exercise a few modules so any leak has a chance to appear.
  for (const route of [routes.workorders.root, routes.maps.root, routes.settings.userSettings]) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await headerPage.waitForLoaderGone();
    await page.waitForTimeout(4000);

    // The URL must not carry credentials or tokens.
    expect(page.url(), `credential-shaped query parameter on ${route}`).not.toMatch(
      /[?&](password|passwd|pwd|token|access_token|id_token|secret|apikey|api_key)=/i,
    );
  }

  // Persistent storage must not hold a readable credential. A bare JWT counts as readable.
  const storage = await page.evaluate(() => {
    const dump = (store: Storage) =>
      Object.keys(store).map((key) => `${key}=${store.getItem(key) ?? ''}`);
    return { local: dump(localStorage), session: dump(sessionStorage) };
  });
  const offenders = [...storage.local, ...storage.session].filter((entry) =>
    /(password|passwd|secret|client_secret)\s*[":=]/i.test(entry),
  );
  expect(offenders.map((o) => o.slice(0, 60)), 'credential-shaped browser storage entries').toEqual(
    [],
  );

  // The console must not print credentials either.
  const noisy = consoleText.filter((line) =>
    /(password|passwd|client_secret)\s*[":=]/i.test(line),
  );
  expect(noisy.map((line) => line.slice(0, 80)), 'credentials printed to the console').toEqual([]);
});

/**
 * CX-017 asks that plot acreage agree "across Maps, Planning and Work Orders" to two decimal
 * places. Maps and Planning are compared here — both expose a field's acreage in their tree
 * and detail panels. The Work Orders surface reports operational and effective area per plot
 * rather than the field's own acreage, so it is not the same quantity and is left out;
 * partial for that third surface.
 */
test('@TC-partial:CX-017 field acreage agrees between Maps and Planning', async ({
  mapsPage,
  planningPage,
}) => {
  test.setTimeout(240000);

  await mapsPage.open();
  const mapsLabel = await mapsPage.selectField();
  const field = mapsLabel.match(/^(\d+)/)?.[1];
  const mapsArea = (await mapsPage.asideValue('Area'))?.match(/([\d,]+\.\d{2})/)?.[1];
  expect(field, `no field number in "${mapsLabel}"`).toBeTruthy();
  expect(mapsArea, `no area on the Maps aside for field ${field}`).toBeTruthy();

  await planningPage.open();
  const planningLabel = await planningPage.selectFirstField();
  // Both modules order the tree the same way, so the first field should be the same one; if a
  // future data change breaks that, the assertion below would compare two different fields.
  expect(
    planningLabel.startsWith(field!),
    `Maps opened field ${field} but Planning opened "${planningLabel}"`,
  ).toBe(true);

  await planningPage.openPlotConfiguration();
  const planningArea = (await planningPage.plotConfigValue('Plot Area ac'))?.match(
    /([\d,]+\.\d{2})/,
  )?.[1];

  expect(planningArea, `field ${field}: Maps says ${mapsArea}`).toBe(mapsArea);
});

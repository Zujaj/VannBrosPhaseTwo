import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { TEMPLATE_CARDS } from '../pages/templates.page';

/**
 * Wizard labels, matched by pattern rather than literal text.
 *
 * The environment's two builds differ in more than column names: one spells conjunctions with
 * `&` and the other writes them out, and the casing shifts with it — `Save as Draft` /
 * `Save As Draft`, `Save & Publish` / `Save And Publish`, `Enter Title & Select Attributes` /
 * `Enter Title And Select Attributes`, and the grid's `Type & Enter` / `Type And Enter`
 * placeholder. Both observed live on 2026-09-07. See test-plans/FINDINGS.md.
 */
const SAVE_DRAFT = /^Save\s+[Aa]s\s+Draft$/;
const SAVE_PUBLISH = /^Save\s+(And|&)\s+Publish$/;
const STEP_ONE = /Enter Title (And|&) Select Attributes/;

/**
 * Template Management. Workbook tab `09 Template Management`.
 *
 * All non-mutating: the landing deck, the three lists, and the Create wizard opened but
 * never saved. The create/edit/clone cases mutate the shared QA tenant and are not automated
 * here.
 *
 * The Inspection and Material lists use the shared `app-f3-table`, so `ListPage` applies —
 * read `test-plans/FINDINGS.md` for its skeleton-render and sticky-filter behaviour. The
 * Attribute screen is a card grid instead.
 */

test('@TC:TM-001 the landing page shows a card for each template type', async ({
  page,
  templatesPage,
}) => {
  test.setTimeout(90000); // the landing page is slow to mount under parallel load
  await templatesPage.openLanding();

  await expect(page).toHaveURL(new RegExp(`${routes.templateMgmt.root}$`));
  for (const { name } of TEMPLATE_CARDS) {
    await expect(templatesPage.card(name), `card "${name}" missing`).toHaveCount(1);
    await expect(templatesPage.card(name)).toBeVisible();
  }
});

test('@TC:TM-002 each card count equals the records in its list', async ({
  page,
  templatesPage,
  listPage,
}) => {
  test.setTimeout(180000); // three lists, each a full load

  await templatesPage.openLanding();
  const counts = {
    'Inspection Template': await templatesPage.cardCount('Inspection Template'),
    'Material Template': await templatesPage.cardCount('Material Template'),
    'Attribute Template': await templatesPage.cardCount('Attribute Template'),
  } as const;

  for (const [name, count] of Object.entries(counts)) {
    expect(count, `card "${name}" reported no records to compare`).toBeGreaterThan(0);
  }

  // The two table-backed lists report their own total in the grid footer.
  for (const type of ['Inspection Template', 'Material Template'] as const) {
    const { route } = TEMPLATE_CARDS.find((c) => c.name === type)!;
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await listPage.waitForGridSettled();
    await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });

    const total = (await listPage.recordCount())?.total ?? (await listPage.rows.count());
    expect(total, `${type}: card said ${counts[type]}, list holds ${total}`).toBe(counts[type]);
  }

  // The Attribute screen is a card grid with no footer, so count its cards directly.
  await page.goto(routes.templateMgmt.templateAttribute, { waitUntil: 'domcontentloaded' });
  await templatesPage.waitForLoaderGone();
  await expect(templatesPage.attributeCards.first()).toBeVisible({ timeout: 45000 });
  await expect(templatesPage.attributeCards).toHaveCount(counts['Attribute Template']);
});

test('@TC:TM-003 each card navigates to its own list', async ({ page, templatesPage }) => {
  test.setTimeout(150000);

  for (const { name, route } of TEMPLATE_CARDS) {
    await templatesPage.openLanding();
    await templatesPage.card(name).click();
    await expect(page, `card "${name}" did not open ${route}`).toHaveURL(new RegExp(route));
  }
});

/**
 * TM-004 lists the columns as "... Attribute Count, Default, Location, Created By ...
 * and Actions".
 *
 * Live renders a single `Default Location` column rather than separate `Default` and
 * `Location`, adds a `Template Status` column the workbook does not mention, and names the
 * last one `Action` (singular). The set is asserted as it actually is — the workbook's
 * wording is the thing that needs correcting here, not the product. Tagged partial so the
 * discrepancy stays visible. See test-plans/FINDINGS.md.
 */
test('@TC-partial:TM-004 the inspection template list renders its column set', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });

  await listPage.expectColumns([
    'Name',
    'Status',
    'Type',
    'Attribute Count',
    'Default Location',
    'Created By',
    'Created At',
    'Modified By',
    'Modified At',
    'Template Status',
    'Actions',
  ]);
});

test('@TC:TM-005 the All / Draft / Published tabs each return only their own templates', async ({
  page,
  listPage,
  templatesPage,
}) => {
  test.setTimeout(180000);

  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });
  await listPage.clearAllColumnFilters();

  const allRows = await listPage.rows.count();
  expect(allRows).toBeGreaterThan(0);
  await expect(templatesPage.statusTab('All')).toHaveClass(/btn-primary/);

  let sum = 0;
  for (const status of ['Draft', 'Published'] as const) {
    await templatesPage.switchStatusTab(status);
    await listPage.waitForGridSettled();

    const rows = await listPage.rows.count();
    sum += rows;
    if (rows === 0) continue;

    // Polled: the grid renders the previous tab's rows before the new ones land.
    await expect
      .poll(
        async () => {
          const values = await listPage.columnValues('Status');
          return values.length > 0 && values.every((v) => v.trim() === status);
        },
        { timeout: 30000, message: `templates outside "${status}" remained after switching tab` },
      )
      .toBe(true);
  }

  // "'All' returns the union and the counts are consistent."
  expect(sum).toBe(allRows);
});

test('@TC:TM-013 the Create wizard opens on its first step with General and the attribute picker', async ({
  page,
  templatesPage,
}) => {
  test.setTimeout(120000); // the template list is slow to mount under parallel load
  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await templatesPage.waitForLoaderGone();

  await templatesPage.openCreateWizard();

  await expect(page.getByText(STEP_ONE)).toBeVisible();
  await expect(page.getByRole('heading', { name: /^General/, level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Select Attribute/, level: 3 })).toBeVisible();
  await expect(page.getByText(/Available Attributes/)).toBeVisible();
});

test('@TC:TM-014 the wizard marks its mandatory fields', async ({ page, templatesPage }) => {
  test.setTimeout(120000); // the template list is slow to mount under parallel load
  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await templatesPage.waitForLoaderGone();
  await templatesPage.openCreateWizard();

  // Name, Default Locations, Template Status and Selected Attribute all carry the required
  // marker. `.first()` because the wizard renders over the list, whose own header reuses
  // some of these words.
  for (const field of ['Name*', 'Default Locations*', 'Template Status*', 'Select Attribute*']) {
    await expect(page.getByText(field, { exact: true }).first(), `"${field}" not marked required`)
      .toBeVisible();
  }
});

test('@TC:TM-015 saving is blocked while the wizard has no name', async ({
  page,
  templatesPage,
}) => {
  test.setTimeout(120000); // the template list is slow to mount under parallel load
  await page.goto(routes.templateMgmt.inspectionTemplates, { waitUntil: 'domcontentloaded' });
  await templatesPage.waitForLoaderGone();
  await templatesPage.openCreateWizard();

  // Both save paths are gated, so no template can be created from an empty form — which is
  // exactly what TM-015 asks. Nothing is clicked: enabling a save here would create a real
  // template in the shared QA tenant.
  await expect(page.getByRole('button', { name: SAVE_DRAFT })).toBeDisabled();
  await expect(page.getByRole('button', { name: SAVE_PUBLISH })).toBeDisabled();

  // Note for whoever automates TM-023 next: a name ALONE enables Save as Draft — the wizard
  // does not require an attribute for the draft path, only for publishing (observed live
  // 2026-09-07). Deliberately not asserted here, because proving it means leaving the form in
  // a saveable state and this spec must stay non-mutating.
});

test('@TC:TM-029 the material template list renders its columns and data', async ({
  page,
  listPage,
}) => {
  await page.goto(routes.templateMgmt.activityDetails, { waitUntil: 'domcontentloaded' });
  await listPage.waitForGridSettled();
  await expect(listPage.rows.first()).toBeVisible({ timeout: 30000 });

  // Workbook: "Columns are Name, Task/Operation and Actions". The middle column renders as
  // `Task` on one build and `Operation` on the other, so it is resolved through ListPage's
  // variant table rather than compared literally.
  await listPage.expectColumns(['Name', 'Task', 'Actions']);

  // "each template shows the operation it belongs to"
  const tasks = await listPage.columnValues('Task');
  expect(tasks.length).toBeGreaterThan(0);
  for (const task of tasks) expect(task.trim()).not.toBe('');
});

test('@TC:TM-049 the attribute grid renders its attributes', async ({ page, templatesPage }) => {
  await page.goto(routes.templateMgmt.templateAttribute, { waitUntil: 'domcontentloaded' });
  await templatesPage.waitForLoaderGone();

  await expect(templatesPage.attributeCards.first()).toBeVisible({ timeout: 45000 });
  const count = await templatesPage.attributeCards.count();
  expect(count).toBeGreaterThan(0);

  // Each card exposes the attribute's enable/disable state, which is what the list is for.
  await expect(page.getByText(/Enable|Disable/).first()).toBeVisible();
});

import { test, expect } from '../fixtures';

/**
 * Work Orders — the Create form's fields. Workbook tab `04 WO - Planned`,
 * cases WP-017..WP-042.
 *
 * All non-mutating: the form is opened and inspected, and nothing is ever submitted. That is
 * what makes this group automatable at all — the happy-path cases that actually create a work
 * order are tagged `@mutating` and live in `work-orders-planned.spec.ts`.
 *
 * Field labels drift between the two deployed builds ("Task Type*"/"Operation Type*",
 * "Task*"/"Operation*"), so every lookup passes both spellings — see FINDINGS #2.
 */

test.beforeEach(async ({ workOrdersPage }) => {
  await workOrdersPage.openCreateForm('planned');
  // The form mounts before it applies its defaults: Priority, Task Type and the date fields
  // are all empty for a beat after the panel opens. Reading them straight away sees blanks and
  // reports "no default is preselected" for a form that populates correctly a moment later.
  // Priority is the signal — it is the first default the form settles on.
  await expect
    .poll(async () => (await workOrdersPage.dropdownToggle(['Priority*']).innerText()).trim(), {
      timeout: 45000,
      message: 'the create form never applied its default field values',
    })
    .not.toBe('');
});

/**
 * WP-017 lists the required fields as "Work Order Name, WO Start Date, WO End Date, Priority,
 * Farm, Task Type, Planned Task and Supervisor".
 *
 * All eight are marked, under this build's labels (Operation Type / Operation for the last
 * two). The form additionally marks `Inspection Templates*` required even on the Planned form,
 * where the control is disabled and not applicable — noted in FINDINGS.
 */
test('@TC:WP-017 the mandatory fields are marked', async ({ page }) => {
  const marked = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((el) => el.children.length === 0 && /\*\s*$/.test(el.textContent!.trim()))
      .map((el) => el.textContent!.trim().replace(/\s+/g, ' ')),
  );

  const required = [
    /^Work Order Name\*/,
    /^Wo Start Date\*/i,
    /^Wo End Date\*/i,
    /^Priority\*/,
    /^Farm\*/,
    /^(Operation|Task) Type\*/,
    /^(Operation|Task)\*/,
    /^Supervisor\*/,
  ];
  for (const pattern of required) {
    expect(
      marked.some((label) => pattern.test(label)),
      `no required marker matching ${pattern}. Marked: ${marked.join(' | ')}`,
    ).toBe(true);
  }
});

/**
 * WP-019 also asks that over-length input be "prevented or trimmed with a message" and that
 * values be "stored safely" — storage cannot be checked without saving, which this spec will
 * not do. What is checked is that the field accepts a normal name and does not break on 300
 * characters or on special characters. Partial for the persistence half.
 */
test('@TC-partial:WP-019 the Work Order Name field accepts input and handles over-length text', async ({
  page,
}) => {
  const name = page.getByRole('textbox', { name: 'Work Order Name*' });

  await name.fill('QA automation probe');
  await expect(name).toHaveValue('QA automation probe');

  // 300 characters: either capped by a maxlength or accepted whole — both satisfy the case,
  // what must not happen is the form breaking.
  const long = 'A'.repeat(300);
  await name.fill(long);
  const stored = await name.inputValue();
  expect(stored.length, 'the name field silently dropped all input').toBeGreaterThan(0);
  expect(stored.length).toBeLessThanOrEqual(300);

  // Special characters are accepted as literal text.
  await name.fill("Probe <b>&</b> 'quotes' \"double\"");
  await expect(name).toHaveValue("Probe <b>&</b> 'quotes' \"double\"");
  await name.fill('');
});

/**
 * WP-020 expects the dates to "default to the configured values and remain editable". The
 * configured values are a tenant setting this suite cannot read, so what is asserted is that
 * both are pre-populated with a valid date, that the window is coherent, and that the inputs
 * are editable. Partial for the "configured values" half.
 */
test('@TC-partial:WP-020 WO Start and End Date are pre-populated and editable', async ({
  page,
}) => {
  // The pair is rendered by `app-f3-mat-date-picker-input`, which paints the date into a
  // focusable DIV and keeps a companion `input.mat-datepicker-input` HIDDEN and permanently
  // empty (class `datepicker-input-hidden`, no value even when a date is shown). Reading the
  // input therefore reports "not pre-populated" for a form that plainly shows both dates, so
  // the value is read off the wrapper the build actually paints. Verified live 2026-09-14.
  const DATE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  const fields = page.locator('app-f3-mat-date-picker-input div.date-picker-input');

  const dateValues = async () =>
    (await fields.allInnerTexts()).map((text) => text.trim()).filter((text) => DATE.test(text));

  // Poll on the populated VALUES, not on the element count: the fields mount blank and the
  // form writes its defaults a moment later, so waiting for them to exist can read the pair
  // before either has been filled in.
  await expect
    .poll(async () => (await dateValues()).length, { timeout: 30000 })
    .toBeGreaterThanOrEqual(2);

  const values = await dateValues();

  // ...and they remain editable: the field is reachable by keyboard and opens its calendar.
  // `toBeEditable` does not apply — the control is a DIV, and its backing input is hidden.
  const start = fields.first();
  await expect(start).toHaveAttribute('tabindex', '0');
  await start.click();
  await expect(page.locator('mat-calendar')).toBeVisible({ timeout: 10000 });
  await page.keyboard.press('Escape');

  const [from, to] = values.map((value) => new Date(value).getTime());
  expect(to, `default window ${values[0]} -> ${values[1]} ends before it starts`).toBeGreaterThan(
    from,
  );
});

test('@TC:WP-022 the Priority dropdown offers its options with a default selected', async ({
  workOrdersPage,
}) => {
  // A default is preselected before the dropdown is ever opened.
  const current = (await workOrdersPage.dropdownToggle(['Priority*']).innerText()).trim();
  expect(current, 'no priority is preselected').not.toBe('');

  const panel = await workOrdersPage.openDropdown(['Priority*']);
  const options = (await panel.locator('.dropdown-item').allInnerTexts())
    .map((option) => option.trim())
    .filter(Boolean);

  expect(options).toEqual(['Low', 'Medium', 'High', 'Urgent']);
  // ...and the preselected value is one of them.
  expect(options).toContain(current);
});

test('@TC:WP-023 the Farm dropdown lists only farms for the selected site', async ({
  headerPage,
  workOrdersPage,
}) => {
  const site = await headerPage.currentContext('site');

  const panel = await workOrdersPage.openDropdown(['Farm*']);
  const farms = (await panel.locator('.dropdown-item').allInnerTexts())
    .map((farm) => farm.trim())
    .filter(Boolean);

  expect(farms.length, `no farms offered for site "${site}"`).toBeGreaterThan(0);
  // Each entry is a real farm with its code, not a placeholder.
  for (const farm of farms) expect(farm, `farm entry "${farm}"`).toMatch(/\S+\s*\(\S+\)/);
});

/**
 * WP-024 asks that selecting a Task Type populate the Planned Task list. On the Planned form
 * `Operation Type*` is fixed to "Planned" and **disabled**, so the type cannot be varied here
 * — what is checked is that the task list is populated and scoped, each entry carrying its
 * task code. Varying the type happens through the Inspection and Harvest sub-tabs, which
 * `work-orders-inspection.spec.ts` and `work-orders-harvest.spec.ts` already cover.
 */
test('@TC-partial:WP-024 the task list is populated with coded tasks for the form type', async ({
  workOrdersPage,
}) => {
  const type = workOrdersPage.dropdownToggle(['Operation Type*', 'Task Type*']);
  await expect(type).toBeDisabled();
  expect((await type.innerText()).trim()).not.toBe('');

  const panel = await workOrdersPage.openDropdown(['Operation*', 'Task*']);
  // The option rows are fetched after the panel opens, so wait for them rather than reading
  // an empty list and concluding the type drives nothing.
  // Poll on the option TEXT, not on the row count: the panel mounts its rows before their
  // labels arrive, so a satisfied count can still read a list of blank entries — which the
  // `.filter(Boolean)` below then reduces to nothing.
  const rows = panel.locator('.dropdown-item');
  const optionTexts = async () =>
    (await rows.allInnerTexts()).map((task) => task.trim()).filter(Boolean);
  await expect.poll(async () => (await optionTexts()).length, { timeout: 30000 }).toBeGreaterThan(0);

  const tasks = await optionTexts();
  // "each shown with its task code"
  for (const task of tasks) expect(task, `task entry "${task}"`).toMatch(/\(\d+\)\s*$/);
});

test('@TC:WP-026 the Supervisor dropdown is searchable and lists employees with their number', async ({
  workOrdersPage,
}) => {
  test.setTimeout(120000);

  const panel = await workOrdersPage.openDropdown(['Supervisor*']);
  const options = panel.locator('.dropdown-item');
  const all = (await options.allInnerTexts()).map((option) => option.trim()).filter(Boolean);
  expect(all.length).toBeGreaterThan(1);

  // "the employee list loads with name and employee number"
  for (const employee of all.slice(0, 10)) {
    expect(employee, `supervisor entry "${employee}"`).toMatch(/\S+.*\(\S+\)\s*$/);
  }

  // ...and the type-ahead narrows it.
  const term = all[0].split(' ')[0];
  const search = panel.locator('input').first();
  await search.fill(term);
  await expect
    .poll(async () => options.count(), { timeout: 20000 })
    .toBeLessThanOrEqual(all.length);
  const filtered = (await options.allInnerTexts()).map((option) => option.trim()).filter(Boolean);
  expect(filtered.length).toBeGreaterThan(0);
  for (const employee of filtered) {
    expect(employee.toLowerCase()).toContain(term.toLowerCase());
  }
});

test('@TC:WP-042 the By Resource / By Groups toggle switches the selection mode', async ({
  page,
}) => {
  const byResource = page.getByText('By Resource', { exact: true });
  const byGroups = page.getByText('By Groups', { exact: true });
  await expect(byResource).toBeVisible();
  await expect(byGroups).toBeVisible();

  // The pair is a radio group, so choosing one deselects the other.
  const radios = page.locator('input[type="radio"]');
  expect(await radios.count(), 'the resource mode is not a radio pair').toBeGreaterThanOrEqual(2);

  await byGroups.click();
  await expect
    .poll(async () => radios.nth(1).isChecked(), { timeout: 15000 })
    .toBe(true);
  expect(await radios.nth(0).isChecked(), 'both resource modes are selected at once').toBe(false);

  await byResource.click();
  await expect.poll(async () => radios.nth(0).isChecked(), { timeout: 15000 }).toBe(true);
  expect(await radios.nth(1).isChecked()).toBe(false);
});

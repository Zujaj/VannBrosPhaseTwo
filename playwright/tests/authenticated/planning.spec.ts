import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';
import { ACTIVITY_TAGS, CARD_STATUSES, EMPTY_BOARD } from '../pages/planning.page';

/**
 * Planning. Workbook tab `03 Planning`.
 *
 * All non-mutating: the tree is browsed and the board read; nothing is created or edited.
 * The D365 sync cases (PL-002..PL-006) and the Actual-tab cases (PL-033..PL-035) need a
 * D365 round-trip or mobile submissions and stay manual.
 *
 * A field with plots is chosen from the tree rather than hardcoded, so the specs survive
 * tenant data changing.
 */

// Fields are chosen at runtime by `selectFieldWithPlots()`: not every field carries a
// project, so a hardcoded pick fails for want of data rather than because of a defect.

test('@TC:PL-001 the module opens with the farm tree and an empty work area', async ({
  page,
  planningPage,
}) => {
  await planningPage.open();

  await expect(page).toHaveURL(new RegExp(routes.cropMgmt));
  // The sidebar renders the farm/field tree...
  expect(await planningPage.treeNodes.count()).toBeGreaterThan(1);
  // ...and the work area prompts for a plot rather than showing a blank panel.
  await expect(planningPage.board).toContainText(EMPTY_BOARD, { timeout: 30000 });
});

test('@TC:PL-007 expanding a field reveals its plots with project code and designation', async ({
  planningPage,
}) => {
  test.setTimeout(120000);
  await planningPage.open();

  const before = await planningPage.treeNodes.count();
  const field = await planningPage.fieldNodes.first().innerText();

  // Expanding is the chevron, not the row — the row selects the field and loads its board
  // while leaving the plots collapsed.
  const plots = await planningPage.expandField(field.split('\n')[0].trim());
  expect(await planningPage.treeNodes.count()).toBeGreaterThan(before);

  // Plot nodes carry `<crop> - PRJ_xxxxxx <Primary|Secondary>`.
  const label = await plots.first().innerText();
  expect(label, `plot node text: ${label}`).toMatch(/PRJ_\d+/);
  expect(label).toMatch(/Primary|Secondary/i);
});

test('@TC:PL-008 selecting a plot loads its planning board', async ({ planningPage }) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();

  // "Field | Season code - PRJ_xxxxxx | Crop"
  const board = await planningPage.board.innerText();
  expect(board, 'board header must carry the season code and project').toMatch(
    /[\d.]+\s*-\s*PRJ_\d+/,
  );

  // ...and the stages and activity cards load for that plot.
  await expect(planningPage.board.getByText('Stages', { exact: true }).first()).toBeVisible();
  await expect(planningPage.cards.first()).toBeVisible({ timeout: 30000 });
});

test('@TC:PL-011 the Plot Configuration panel shows the plot attributes', async ({
  planningPage,
}) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();
  await planningPage.openPlotConfiguration();

  for (const label of ['Crop', 'Plot Area', 'No. of rows / Plot']) {
    await expect(
      planningPage.board.getByText(label, { exact: false }).first(),
      `"${label}" missing from Plot Configuration`,
    ).toBeVisible();
  }

  const area = await planningPage.plotConfigValue('Plot Area ac');
  expect(area, 'Plot Area must carry a numeric value').toMatch(/^[\d,]+(\.\d+)?$/);
});

/**
 * PL-012 asks that plot area match "across Planning, Maps and the underlying field record".
 * Only the Planning half is checked here — the tree node and the Plot Configuration panel
 * must agree — because comparing against Maps means driving a second module and against the
 * field record means a data source the browser cannot see. Tagged partial for that reason.
 */
test('@TC-partial:PL-012 plot area agrees between the tree and Plot Configuration', async ({
  planningPage,
}) => {
  test.setTimeout(120000);
  await planningPage.open();

  const label = await planningPage.selectFirstField();
  const nodeArea = label.match(/([\d,]+\.\d{2})\s*ac/)?.[1];
  expect(nodeArea, `tree node must show an area. Label: ${label}`).toBeTruthy();

  await planningPage.openPlotConfiguration();

  // "identical to two decimal places"
  expect(await planningPage.plotConfigValue('Plot Area ac')).toBe(nodeArea);
});

test('@TC:PL-013 No. of rows / Plot renders a value when it is not configured', async ({
  planningPage,
}) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();
  await planningPage.openPlotConfiguration();

  const rows = await planningPage.plotConfigValue('No. of rows / Plot');
  // "0 or an explicit 'not set' indicator rather than a blank cell or 'undefined'"
  expect(rows, 'No. of rows / Plot is blank').toBeTruthy();
  expect(rows!.toLowerCase()).not.toBe('undefined');
  expect(rows).toMatch(/^\d+$|not set/i);
});

test('@TC:PL-014 the stage wizard lists the growth stages for the plot', async ({
  planningPage,
}) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();

  await expect(planningPage.board.getByText('Stages', { exact: true }).first()).toBeVisible();
  // At least one named stage renders beside the Stages heading.
  await expect(planningPage.board).toContainText(/Pre Harvest|Harvest|Post Harvest|General/i);
});

test('@TC:PL-018 the Tags row lists every activity status filter', async ({ planningPage }) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();

  for (const tag of ACTIVITY_TAGS) {
    await expect(planningPage.tag(tag), `tag "${tag}" missing`).toBeVisible();
  }
});

test('@TC:PL-019 each status tag filters the activity cards', async ({ planningPage }) => {
  test.setTimeout(180000);
  await planningPage.open();
  await planningPage.selectFirstField();

  await planningPage.filterByTag('All Activities');
  const all = await planningPage.cards.count();
  expect(all).toBeGreaterThan(0);

  // Drive the statuses that actually have cards on this plot; a tag with none is legitimate
  // and simply has nothing to assert.
  for (const tag of ['To Do', 'Draft', 'In Progress', 'Review', 'Done'] as const) {
    await planningPage.filterByTag(tag);
    const count = await planningPage.cards.count();
    if (count === 0) continue;

    expect(count, `"${tag}" returned more cards than "All Activities"`).toBeLessThanOrEqual(all);
    // Every visible card carries the selected status.
    const badge = tag.toUpperCase();
    const others = CARD_STATUSES.filter((s) => s !== badge);
    const text = await planningPage.board.innerText();
    for (const other of others) {
      expect(
        new RegExp(`\\b${other}\\b`).test(text),
        `"${tag}" filter left a card badged ${other}`,
      ).toBe(false);
    }
  }

  await planningPage.filterByTag('All Activities');
  expect(await planningPage.cards.count()).toBe(all);
});

test('@TC:PL-021 each activity card carries the required information', async ({ planningPage }) => {
  test.setTimeout(120000);
  await planningPage.open();
  await planningPage.selectFirstField();
  await expect(planningPage.cards.first()).toBeVisible({ timeout: 30000 });

  // Sample the rendered cards rather than all of them — the board holds well over a hundred.
  const sample = Math.min(8, await planningPage.cards.count());
  for (let index = 0; index < sample; index += 1) {
    const text = (await planningPage.cards.nth(index).innerText()).replace(/\s+/g, ' ');
    expect(text, `card ${index}: no task name with code`).toMatch(/.+\(\d+\)/);
    expect(text, `card ${index}: no date range`).toMatch(
      /Date:\s*\d{2}\/\d{2}\/\d{4}\s*-\s*\d{2}\/\d{2}\/\d{4}/,
    );
    expect(text, `card ${index}: no progress`).toMatch(/%|Area Completed/);
    expect(text, `card ${index}: no status badge`).toMatch(
      new RegExp(`\\b(${CARD_STATUSES.join('|')})\\b`),
    );
  }
});

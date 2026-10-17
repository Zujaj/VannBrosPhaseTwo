import { test, expect } from '../fixtures';
import type { WorkOrdersPage, PlotBlock } from '../pages/work-orders.page';
import { blockVarietyNames } from '../pages/work-orders.page';
import { routes } from '../constants/routes';
import { plannedScenario } from '../helpers/workOrderScenarios';
import { upcoming } from '../helpers/upcoming';
import { apiAs } from '../helpers/roleApi';

/**
 * Variety Management — Product Specifications Document v1.0 (Aug 07, 2026),
 * `resources/product-specifications-document/Variety Mapping.pdf`.
 * Plan: `test-plans/authenticated/variety-management.md` (case ids VM-xx, PSD section per case).
 *
 * New scope: the regression workbook has no Variety cases, so nothing here carries `@TC:`.
 * Every test is tagged `@PSD-variety` (`--grep @PSD-variety` runs the set). Tests for behaviour
 * QA has not shipped are also tagged `@upcoming` and parked by `upcoming()` — see
 * `helpers/upcoming.ts`.
 *
 * What QA serves (verified live 2026-10-16): GP field-to-variety data on 68 of 100 Vann Farm
 * plots (FINDINGS #33 update); the Create form's Variety multi-select, which sends
 * `cropVarietyIDs` to the plot picker; the list's Variety column, search and Set Filters entry;
 * the detail Plots grid's Variety column; Maps' Variety filter and the field aside's Varieties
 * accordion; Planning's Plot Configuration Variety chips / `Multiple Varieties` tag. Known gap:
 * swapping the variety leaves an unmapped plot on the form (FINDINGS #57, VM-08).
 *
 * None of these tests saves anything.
 */

const WO = plannedScenario();

/** Plot-picker blocks for the farm + task with no variety chosen, cached per worker. */
let unfiltered: PlotBlock[] | null = null;

async function openFormForPlots(workOrdersPage: WorkOrdersPage) {
  await workOrdersPage.openCreateForm('planned');
  await workOrdersPage.selectFromDropdown(['Farm*'], WO.farm);
  await workOrdersPage.selectFromDropdown(['Operation*', 'Task*'], WO.task);
}

async function unfilteredBlocks(workOrdersPage: WorkOrdersPage): Promise<PlotBlock[]> {
  if (!unfiltered) {
    const picker = await workOrdersPage.openPlotPicker();
    unfiltered = picker.blocks;
    await workOrdersPage.closePlotPicker(picker);
  }
  return unfiltered;
}

/** Variety name → the unfiltered blocks GP maps it to. */
function mappedVarieties(blocks: PlotBlock[]): Map<string, PlotBlock[]> {
  const map = new Map<string, PlotBlock[]>();
  for (const b of blocks) for (const v of blockVarietyNames(b)) map.set(v, [...(map.get(v) ?? []), b]);
  return map;
}

const NO_GP_DATA =
  'no plot on QA carries a GP field-to-variety mapping yet (every block has varieties: []), see FINDINGS #33';

test.describe('Create Work Order — Variety field (R1 FR-2)', () => {
  test.beforeEach(async ({ workOrdersPage }) => {
    await openFormForPlots(workOrdersPage);
  });

  test('@PSD-variety VM-01 the Variety field is a multi-select', async ({ workOrdersPage }) => {
    const options = await workOrdersPage.varietyOptions();
    expect(options.length, 'the Variety field lists no varieties').toBeGreaterThan(1);

    const [first, second] = options;
    await workOrdersPage.selectVarieties([first, second]);
    expect(await workOrdersPage.selectedVarieties()).toEqual([first, second]);

    await workOrdersPage.deselectVariety(first);
    expect(await workOrdersPage.selectedVarieties()).toEqual([second]);
  });

  test('@PSD-variety VM-02 the plot picker is fetched for exactly the selected varieties', async ({
    workOrdersPage,
  }) => {
    const [first, second] = await workOrdersPage.varietyOptions();

    let picker = await workOrdersPage.openPlotPicker();
    expect(picker.cropVarietyIDs, 'no variety selected, yet the picker was filtered').toEqual([]);
    unfiltered ??= picker.blocks;
    await workOrdersPage.closePlotPicker(picker);

    await workOrdersPage.selectVarieties([first]);
    picker = await workOrdersPage.openPlotPicker();
    expect(picker.cropVarietyIDs).toHaveLength(1);
    const firstId = picker.cropVarietyIDs[0];
    await workOrdersPage.closePlotPicker(picker);

    // Two varieties: the picker asks for the union (FR-2 "combined valid Fields").
    await workOrdersPage.selectVarieties([second]);
    picker = await workOrdersPage.openPlotPicker();
    expect(picker.cropVarietyIDs).toHaveLength(2);
    expect(picker.cropVarietyIDs).toContain(firstId);
    await workOrdersPage.closePlotPicker(picker);
  });

  test('@PSD-variety VM-03 a variety mapped to no plot of the farm empties the picker', async ({
    workOrdersPage,
  }) => {
    const mapped = mappedVarieties(await unfilteredBlocks(workOrdersPage));
    const unmapped = (await workOrdersPage.varietyOptions()).find((v) => !mapped.has(v));
    test.skip(!unmapped, 'every variety maps to a plot of this farm + task');

    await workOrdersPage.selectVarieties([unmapped!]);
    const picker = await workOrdersPage.openPlotPicker();
    expect(picker.blocks).toEqual([]);
    await expect(picker.rows).toHaveCount(0);
    await expect(picker.panel.getByText('0 Total Records')).toBeVisible();
    await workOrdersPage.closePlotPicker(picker);
  });

  test('@PSD-variety VM-04 GP sync delivers each plot\'s varieties (R1 FR-1)', async ({
    workOrdersPage,
  }) => {
    const blocks = await unfilteredBlocks(workOrdersPage);
    const withVarieties = blocks.filter((b) => b.varieties.length > 0);
    expect(
      withVarieties.length,
      `${blocks.length} plots on ${WO.farm} / ${WO.task}, none with a variety mapping`,
    ).toBeGreaterThan(0);
  });

  test('@PSD-variety VM-05 selecting a variety lists only the plots mapped to it', async ({
    workOrdersPage,
  }) => {
    const mapped = mappedVarieties(await unfilteredBlocks(workOrdersPage));
    test.skip(mapped.size === 0, NO_GP_DATA);

    const [variety, expected] = [...mapped.entries()][0];
    await workOrdersPage.selectVarieties([variety]);
    const picker = await workOrdersPage.openPlotPicker();
    expect(picker.blocks.map((b) => b.batchCode).sort()).toEqual(expected.map((b) => b.batchCode).sort());
    for (const b of picker.blocks) expect(blockVarietyNames(b)).toContain(variety);
    await expect(picker.rows).toHaveCount(expected.length);
    await workOrdersPage.closePlotPicker(picker);
  });

  test('@PSD-variety VM-06 two varieties list the union of their plots', async ({ workOrdersPage }) => {
    const mapped = mappedVarieties(await unfilteredBlocks(workOrdersPage));
    test.skip(mapped.size < 2, NO_GP_DATA);

    const [[a, aBlocks], [b, bBlocks]] = [...mapped.entries()];
    const union = new Set([...aBlocks, ...bBlocks].map((x) => x.batchCode));
    await workOrdersPage.selectVarieties([a, b]);
    const picker = await workOrdersPage.openPlotPicker();
    expect(new Set(picker.blocks.map((x) => x.batchCode))).toEqual(union);
    await workOrdersPage.closePlotPicker(picker);
  });

  test('@PSD-variety VM-07 a field under two selected varieties shows their summed acreage', async ({
    workOrdersPage,
  }) => {
    const blocks = await unfilteredBlocks(workOrdersPage);
    const shared = blocks.find((b) => b.varieties.length >= 2);
    test.skip(!shared, NO_GP_DATA.replace('mapping', 'mapping with two varieties on one field'));

    const names = blockVarietyNames(shared!).slice(0, 2);
    // GP serves `acreage` per variety (FieldVarietyDTO); confirm AgriERP keeps the key on first run.
    const acreage = shared!.varieties.slice(0, 2).map((v) => {
      const o = v as Record<string, unknown>;
      return Number(o.acreage ?? o.varietyAcreage ?? o.area);
    });
    await workOrdersPage.selectVarieties(names);
    const picker = await workOrdersPage.openPlotPicker();
    const block = picker.blocks.find((b) => b.batchCode === shared!.batchCode);
    expect(block, `${shared!.fieldName} missing once both its varieties are selected`).toBeTruthy();
    expect(block!.totalApplicableAcreage).toBeCloseTo(acreage[0] + acreage[1], 2);
    await workOrdersPage.closePlotPicker(picker);
  });

  test('@PSD-variety VM-08 changing the variety drops a selected plot it no longer maps', async ({
    page,
    workOrdersPage,
  }) => {
    const blocks = await unfilteredBlocks(workOrdersPage);
    const mapped = mappedVarieties(blocks);
    test.skip(mapped.size === 0, NO_GP_DATA);

    const [variety] = [...mapped.keys()];
    const other = (await workOrdersPage.varietyOptions()).find((v) => v !== variety && !mapped.has(v));
    test.skip(!other, 'every variety maps to a plot, so none can stand in as "unmapped"');
    test.fail(true, 'Known QA bug (FINDINGS #57): the plot stays on the form, its Variety cell blanked');

    await workOrdersPage.selectVarieties([variety]);
    const picker = await workOrdersPage.openPlotPicker();
    await workOrdersPage.addPlotsFromPicker(picker, 1);
    const grid = workOrdersPage.sectionTable(['Select Plot', 'Select Block']);
    await expect(grid.locator('tbody tr').filter({ has: page.locator('input') })).toHaveCount(1);

    await workOrdersPage.deselectVariety(variety);
    await workOrdersPage.selectVarieties([other!]);
    await expect(grid.getByText('No Record Found').or(grid.getByText(/No (blocks|plots) found/i))).toBeVisible();
  });
});

test.describe('Work Orders list — Variety (R1 FR-5)', () => {
  test.beforeEach(async ({ page, listPage }) => {
    await page.goto(routes.workorders.root, { waitUntil: 'domcontentloaded' });
    await listPage.waitForGridSettled();
    await listPage.clearAllColumnFilters();
  });

  test.afterEach(async ({ listPage }) => {
    await listPage.clearAllColumnFilters().catch(() => {});
  });

  /**
   * A variety some work order of the season carries, read from `GET /api/WorkOrder`. Only WOs
   * created with a Variety chosen hold one (6 of 110 on 2026-10-16), and none of them need be on
   * the list's first page, so the grid itself cannot be the source. Skips when no WO has one.
   */
  async function aListedVariety(): Promise<string> {
    const api = await apiAs('admin');
    try {
      for (let page = 1; page <= 5; page++) {
        const res = await api.get('/api/WorkOrder', {
          params: { LocationID: 2, SeasonID: 13, Category: 1, Page: page, Limit: 50 },
        });
        const body = await res.json();
        const rows: Array<{ varieties?: Array<{ cropVarietyName: string }> }> = body.data?.data ?? body.data ?? [];
        const name = rows.find((r) => r.varieties?.length)?.varieties?.[0].cropVarietyName;
        if (name) return name;
        if (rows.length < 50) break;
      }
    } finally {
      await api.dispose();
    }
    test.skip(true, 'no work order this season carries a Variety');
    return '';
  }

  test('@PSD-variety VM-10 the list shows each work order\'s varieties', async ({ listPage }) => {
    await expect(listPage.header('Variety')).toHaveCount(1);
    await listPage.searchColumn('Variety', await aListedVariety());
    const values = (await listPage.columnValues('Variety')).filter((v) => v.trim());
    expect(values.length, 'no listed work order shows a Variety').toBeGreaterThan(0);
    // Several varieties render as one comma-separated cell ("WOOD COLONY, NONPAREIL").
    for (const v of values) expect(v).toMatch(/^[^,]+(, [^,]+)*$/);
  });

  test('@PSD-variety VM-11 Set Filters → Variety lists only work orders with that variety', async ({
    listPage,
    workOrdersPage,
  }) => {
    const variety = await aListedVariety();
    const before = await listPage.recordCount();
    try {
      await workOrdersPage.applyListFilter('Variety', variety);
      await listPage.waitForGridSettled();
      const after = await listPage.recordCount();
      expect(after!.total).toBeGreaterThan(0);
      expect(after!.total).toBeLessThanOrEqual(before!.total);
      await expect
        .poll(async () => (await listPage.columnValues('Variety')).every((v) => v.split(', ').includes(variety)), {
          message: `rows without "${variety}" survived the filter`,
          timeout: 20000,
        })
        .toBe(true);
    } finally {
      await workOrdersPage.resetListFilters();
    }
  });

  test('@PSD-variety VM-12 the Variety column search narrows the list', async ({ listPage }) => {
    const variety = await aListedVariety();
    await listPage.searchColumn('Variety', variety);
    await expect
      .poll(async () => {
        const values = await listPage.columnValues('Variety');
        return values.length > 0 && values.every((v) => v.toUpperCase().includes(variety.toUpperCase()));
      }, { timeout: 20000 })
      .toBe(true);
  });

  test('@PSD-variety VM-13 the detail Plots grid carries a Variety column (R1 FR-6)', async ({
    page,
    listPage,
    workOrdersPage,
  }) => {
    const variety = await aListedVariety();
    await listPage.searchColumn('Variety', variety);
    await expect(listPage.rows.first()).toBeVisible();
    const woVarieties = (await listPage.columnValues('Variety'))[0].split(', ');

    await workOrdersPage.openRowDetail(listPage.rows.first());
    await workOrdersPage.waitForLoaderGone();
    const plots = page.locator('table').filter({ has: page.getByRole('columnheader', { name: 'Crop Variety' }) }).first();
    const header = plots.getByRole('columnheader', { name: 'Variety', exact: true });
    await expect(header).toHaveCount(1);

    // Each plot's Variety must be one of the work order's (FR-6 "Field-to-Variety relationship").
    const heads = (await plots.locator('thead th').allInnerTexts()).map((h) => h.trim());
    const col = heads.indexOf('Variety');
    const readCells = () =>
      plots
        .locator('tbody tr')
        .evaluateAll((trs, i) => trs.map((tr) => (tr.children[i] as HTMLElement)?.innerText.trim() ?? ''), col);
    // The grid paints "Skeleton Text" placeholders before its rows land.
    await expect.poll(async () => (await readCells()).some((c) => /skeleton/i.test(c)), { timeout: 30000 }).toBe(false);
    const cells = await readCells();
    const filled = cells.filter(Boolean);
    test.skip(filled.length === 0, `detail shows no per-plot Variety (pre-sync WOs, FINDINGS #58)`);
    for (const cell of filled) {
      for (const v of cell.split(/,\s*/)) expect(woVarieties).toContain(v);
    }
  });
});

test.describe('Maps — Variety (R1 FR-3)', () => {
  test('@PSD-variety VM-20 Set Filters offers a Variety filter, and Maps Control a Variety layer', async ({
    mapsPage,
  }) => {
    await mapsPage.open();
    await expect(mapsPage.layerLabel('Variety')).toBeVisible();

    const panel = await mapsPage.openFilters();
    // Labels here are `line-height-0`, zero-height boxes Playwright reports as hidden — so the
    // label is asserted attached, and the control after it is what must be on screen.
    const label = panel.locator('label', { hasText: /^\s*Variety\s*$/ });
    await expect(label).toBeAttached();
    await expect(label.locator('xpath=following::button[1]')).toBeVisible();
  });

  test('@PSD-variety VM-21 a selected field lists its varieties with acreage', async ({ mapsPage }) => {
    await mapsPage.open();
    await mapsPage.selectField();
    // Live 2026-10-16: a collapsed "Varieties" accordion under Jobs; expanded, each variety is
    // a name line then a "<n> ac" line (the PSD mock reads "acres").
    const section = mapsPage.aside.getByRole('button', { name: /^Varieties/ });
    await expect(section).toBeVisible();
    await section.click();
    await expect(mapsPage.aside.getByText(/^[\d.]+ ac$/).first()).toBeVisible();
  });
});

test.describe('Planning — Variety (R1 FR-4)', () => {
  test('@PSD-variety VM-25 the Field Summary shows the field\'s varieties', async ({
    page,
    planningPage,
  }) => {
    await planningPage.open();
    await planningPage.selectFirstField();
    await planningPage.waitForBoardSettled();
    // The Field Summary is the collapsed Plot Configuration accordion (live 2026-10-16).
    // Up to three names are listed; more than three collapse into a "Multiple Varieties" tag.
    await planningPage.openPlotConfiguration();
    const summary = page.getByText('Variety', { exact: true }).first();
    await expect(summary).toBeVisible();
    const tag = page.getByText('Multiple Varieties', { exact: true });
    if (await tag.count()) {
      await tag.first().hover();
      await expect(page.getByRole('tooltip').or(page.locator('.tooltip, .popover'))).toBeVisible();
    }
  });
});

test.describe('Settings → Plot — Plot-to-Variety mapping (R2)', () => {
  upcoming('R2 Settings → Plot variety mapping is not built');

  test('@PSD-variety @upcoming VM-30 a plot can be opened to maintain its variety mapping', async ({
    page,
    listPage,
  }) => {
    await page.goto(routes.settings.plot, { waitUntil: 'domcontentloaded' });
    await listPage.waitForGridSettled();
    // R2 FR-1: each plot shows its identifying context and total acreage.
    for (const column of ['Farm', 'Field Name', 'Total Area']) {
      await expect(listPage.header(column)).toHaveCount(1);
    }
    // R2 FR-2: the plot opens onto a Variety mapping with an acreage per variety. The PSD names
    // no labels for this screen, so only its existence is asserted; see the plan for VM-31..34.
    await listPage.rows.first().click();
    await expect(page.getByText(/Variet(y|ies)/).first()).toBeVisible();
    await expect(page.getByText(/Acreage/i).first()).toBeVisible();
  });
});

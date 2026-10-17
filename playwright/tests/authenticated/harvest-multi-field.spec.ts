import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../fixtures';
import { apiAs } from '../helpers/roleApi';
import contractFields from '../../fixtures/harvestContractFields.json';

/**
 * Multi-Field / Multi-Variety Harvest Planning — ADO #26493.
 * Plan: `test-plans/authenticated/harvest-multi-field.md` (case ids HMF-xx).
 * Ticket + release note: `resources/work-items/26493-multi-field-multi-variety-harvest-planning.md`.
 *
 * Read-only. API probes that hit `tickets/plan` use empty or unknown ids so nothing can be
 * created, and the web check aborts its request. Cases that plan real tickets are manual.
 *
 * Plan body as the web sends it (live 2026-10-16): `{ seasonID, hullingLocation, quantity,
 * standardQuantity, fields: [{ id, fieldName, code, varieties: [cropVarietyID] }] }`.
 */

const SEASON_ID = 13; // Crop Year 2026

/**
 * Plots with an active GP contract under Vann Grower (`VSM-0EY10-26`, `YSA-A4VMW-26` + addenda), the
 * plots offered today only through other growers' contracts (FINDINGS #60), and Vann plots whose only
 * contracts are closed 2025 ones. Snapshot in fixtures/.
 */
const VANN_PLOTS = contractFields.items.map((f) => f.plot);
const NON_VANN_PLOTS = contractFields.nonVannPlots;
const CLOSED_CONTRACT_ONLY_PLOTS = contractFields.closedContractOnlyPlots;

interface HarvestField { farmId: number; farmCode: string; text: string; value: number }
interface HarvestVarieties {
  fieldID: number;
  fieldName: string;
  varieties: Array<{ cropVarietyID: number; cropVarietyName: string; acreage: number | null }>;
}

let api: APIRequestContext;

test.beforeAll(async () => {
  api = await apiAs('admin');
});

test.afterAll(async () => {
  await api.dispose();
});

async function harvestFields(): Promise<HarvestField[]> {
  const res = await api.get('/api/Metadata/GetFieldsForHarvesting');
  expect(res.status()).toBe(200);
  return res.json();
}

async function harvestVarieties(fieldIds: number[]): Promise<HarvestVarieties[]> {
  const res = await api.post('/api/Metadata/GetVarietiesForHarvesting', { data: { fieldIds } });
  expect(res.status()).toBe(200);
  return res.json();
}

/** `POST tickets/plan` with a body that must be refused; returns status and error text. */
async function refusedPlan(body: unknown): Promise<{ status: number; text: string }> {
  const res = await api.post('/api/harvestcentral/tickets/plan', { data: body });
  return { status: res.status(), text: await res.text() };
}

test.describe('Harvest planning lists (API)', () => {
  test('@ADO-26493 HMF-01 the plot list holds only Vann-contracted plots', async () => {
    test.fail(true, 'Known QA bug (FINDINGS #60): plots named on other growers\' contracts are offered');
    const offered = (await harvestFields()).map((f) => f.text);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((name) => NON_VANN_PLOTS.includes(name))).toEqual([]);
    expect([...offered].sort()).toEqual([...VANN_PLOTS].sort());
  });

  test('@ADO-26493 HMF-07 plots on closed contracts only are not offered', async () => {
    // GP Vann fields 280, 286, 287 and 301 are only on the Closed 2025 contracts (VSM-07673-25, YSS-168E7-25).
    const offered = (await harvestFields()).map((f) => f.text);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((name) => CLOSED_CONTRACT_ONLY_PLOTS.includes(name))).toEqual([]);
  });

  test('@ADO-26493 HMF-02 every offered plot has a variety to harvest', async () => {
    test.fail(true, 'Known QA bug (FINDINGS #60): "Almonds Splits & Meats" is offered with no varieties');
    const fields = await harvestFields();
    const varieties = await harvestVarieties(fields.map((f) => f.value));
    expect(varieties.filter((f) => f.varieties.length === 0).map((f) => f.fieldName)).toEqual([]);
  });

  test('@ADO-26493 HMF-03 varieties are limited to what grows in each plot', async () => {
    const fields = await harvestFields();
    const varieties = await harvestVarieties(fields.map((f) => f.value));

    const day = (offset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return `${d.toISOString().slice(0, 10)}T00:00:00.000`;
    };
    // Any farm task returns every plot with its GP varieties; 9 = Fertilization on Vann Farm.
    const blocksRes = await api.post('/api/activity/blocks', {
      data: {
        page: 1, limit: 1000, isASC: true, locationID: 2, seasonID: SEASON_ID, farmID: 2,
        operationID: 9, startDate: day(-1), endDate: day(0), cropVarietyIDs: [],
      },
    });
    expect(blocksRes.status()).toBe(200);
    const blocks: Array<{ fieldName: string; varieties: Array<{ cropVarietyName: string }> }> =
      (await blocksRes.json()).data ?? [];
    const growing = new Map(blocks.map((b) => [b.fieldName, new Set(b.varieties.map((v) => v.cropVarietyName))]));

    const notGrowing = varieties.flatMap((f) =>
      f.varieties
        .filter((v) => !growing.get(f.fieldName)?.has(v.cropVarietyName))
        .map((v) => `${f.fieldName}/${v.cropVarietyName}`),
    );
    expect(notGrowing, 'varieties offered that the plot does not grow').toEqual([]);
  });

  test('@ADO-26493 HMF-04 varieties follow the contract (306 → BUTTE/PADRE only)', async () => {
    const plot = (await harvestFields()).find((f) => f.text === '306');
    test.skip(!plot, 'plot 306 is not offered for harvesting');
    const [field] = await harvestVarieties([plot!.value]);
    // GP contracts 306 for BUTTE, PADRE and BUTTE/PADRE; the plot grows BUTTE/PADRE only.
    expect(field.varieties.map((v) => v.cropVarietyName)).toEqual(['BUTTE/PADRE']);
  });

  test('@ADO-26493 HMF-05 the varieties endpoint takes {fieldIds}, not a bare array', async () => {
    const [plot] = await harvestFields();
    const bare = await api.post('/api/Metadata/GetVarietiesForHarvesting', { data: [plot.value] });
    expect(bare.status()).toBe(400);
    const wrapped = await harvestVarieties([plot.value]);
    expect(wrapped.map((f) => f.fieldID)).toEqual([plot.value]);
  });
});

test.describe('Plan Incoming Loads validation (API, nothing created)', () => {
  test('@ADO-26493 HMF-10 a plan needs at least one plot', async () => {
    const r = await refusedPlan({ fields: [], seasonID: SEASON_ID, quantity: 1 });
    expect(r.status).toBe(400);
    expect(r.text).toContain('At least one field is required.');
  });

  test('@ADO-26493 HMF-11 an unknown plot is refused', async () => {
    const r = await refusedPlan({ fields: [{ id: 999999, varieties: [22] }], seasonID: SEASON_ID, quantity: 1 });
    expect(r.status).toBe(400);
    expect(r.text).toContain('Selected field was not found.');
  });

  test('@ADO-26493 HMF-19 an unknown variety on a real plot is refused', async () => {
    // 130 (id 2) is a real plot; 888888 is no variety, so nothing can be created.
    const r = await refusedPlan({ fields: [{ id: 2, varieties: [888888] }], seasonID: SEASON_ID, quantity: 1 });
    expect(r.status).toBe(400);
    expect(r.text).toContain('Selected crop variety was not found.');
  });

  test('@ADO-26493 HMF-12 quantity must be at least 1', async () => {
    const r = await refusedPlan({ fields: [{ id: 999999, varieties: [22] }], seasonID: SEASON_ID, quantity: 0 });
    expect(r.status).toBe(400);
    expect(r.text).toContain('Quantity must be at least 1.');
  });
});

test.describe('Harvest Central web plan panel', () => {
  /** The plan panel's Field and Variety `ng-multiselect-dropdown`s (shipped 2026-10-16). */
  function pickers(page: import('@playwright/test').Page) {
    const panel = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: /^Plan (Harvest Tickets|Incoming Loads)$/, level: 2 }) })
      .filter({ has: page.getByRole('button', { name: 'Cancel', exact: true }) })
      .last();
    const dropdowns = panel.locator('ng-multiselect-dropdown');
    const close = () => panel.getByRole('heading', { level: 2 }).click();
    const open = async (dd: import('@playwright/test').Locator) => {
      const list = dd.locator('.dropdown-list');
      await expect(async () => {
        if (!(await list.isVisible())) await dd.locator('.dropdown-multiselect__caret').click({ timeout: 5000 });
        await expect(list).toBeVisible({ timeout: 3000 });
      }).toPass({ timeout: 30000 });
      return list;
    };
    const options = async (dd: import('@playwright/test').Locator) => {
      const list = await open(dd);
      const names = (await list.locator('ul.item2 li').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
      await close();
      return names;
    };
    const tick = async (dd: import('@playwright/test').Locator, names: string[]) => {
      for (const name of names) {
        const list = await open(dd);
        await list.locator('input[aria-label="multiselect-search"]').fill(name);
        await list.locator('li.multiselect-item-checkbox').filter({ has: page.getByText(name, { exact: true }) }).click();
        await list.locator('input[aria-label="multiselect-search"]').fill('');
      }
      await close();
    };
    return { panel, field: dropdowns.nth(0), variety: dropdowns.nth(1), options, tick };
  }

  test.beforeEach(async ({ page, harvestCentralPage }) => {
    await harvestCentralPage.open();
    await harvestCentralPage.clickPastLoader(page.getByRole('button', { name: /^Plan (Harvest Tickets|Incoming Loads)$/ }), () =>
      expect(page.getByRole('heading', { name: /^Plan (Harvest Tickets|Incoming Loads)$/, level: 2 })).toBeVisible({ timeout: 5000 }),
    );
  });

  test('@ADO-26493 HMF-21 the Field picker offers exactly the harvestable plots', async ({ page }) => {
    const { field, options } = pickers(page);
    const offered = (await options(field)).filter((o) => o !== 'Select All');
    expect(offered.sort()).toEqual((await harvestFields()).map((f) => f.text).sort());
    expect(offered).not.toContain('132'); // no contract, no varieties
  });

  test('@ADO-26493 HMF-22 Variety cascades from the chosen plots', async ({ page }) => {
    const { field, variety, options, tick } = pickers(page);
    expect(await options(variety)).toEqual(['No data available']);
    await tick(field, ['130', '306']);
    const ids = (await harvestFields()).filter((f) => ['130', '306'].includes(f.text)).map((f) => f.value);
    const expected = (await harvestVarieties(ids)).flatMap((f) => f.varieties.map((v) => v.cropVarietyName));
    await expect.poll(async () => (await options(variety)).filter((o) => o !== 'Select All').sort()).toEqual(
      [...new Set(expected)].sort(),
    );
  });

  test('@ADO-26493 HMF-20 the web sends one entry per plot with its own varieties', async ({ page }) => {
    // Abort the request so no ticket is planned.
    let body: { fields?: Array<{ id: number; fieldName: string; varieties: number[] }>; quantity?: number } | null = null;
    await page.route(/\/api\/harvestcentral\/tickets\/plan/i, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.abort();
    });

    const { panel, field, variety, tick } = pickers(page);
    await tick(field, ['130', '306']);
    await tick(variety, ['MONTEREY', 'BUTTE/PADRE']);
    await panel.locator('input[type=number]').fill('2');
    await panel.getByRole('button', { name: /^Create 2 Planned Tickets?$/ }).click();

    await expect.poll(() => body, { message: 'the plan request was never sent' }).not.toBeNull();
    const sent = body as unknown as { fields: Array<{ fieldName: string; varieties: number[] }>; quantity: number };
    expect(sent.quantity).toBe(2);
    // MONTEREY (22) grows on 130 only, BUTTE/PADRE (51) on 306 only: each plot carries just its own.
    expect(sent.fields.map((f) => [f.fieldName, f.varieties])).toEqual([
      ['130', [22]],
      ['306', [51]],
    ]);
  });

  /** Aborts `tickets/plan` and returns the `fields` it would have sent as `[fieldName, varieties]`. */
  async function capturePlan(page: import('@playwright/test').Page) {
    let body: { fields: Array<{ fieldName: string; varieties: number[] }> } | null = null;
    await page.route(/\/api\/harvestcentral\/tickets\/plan/i, async (route) => {
      body = JSON.parse(route.request().postData() ?? '{}');
      await route.abort();
    });
    return async () => {
      await expect.poll(() => body, { message: 'the plan request was never sent' }).not.toBeNull();
      return body!.fields.map((f) => [f.fieldName, f.varieties]);
    };
  }

  test('@ADO-26493 HMF-27 removing a plot drops the varieties it brought', async ({ page }) => {
    const { panel, field, variety, options, tick } = pickers(page);
    await tick(field, ['130']);
    await tick(variety, ['WINTERS']);
    await expect(variety.locator('.selected-item')).toHaveCount(1);

    await tick(field, ['130']); // untick
    await expect(variety.locator('.selected-item')).toHaveCount(0);
    expect(await options(variety)).toEqual(['No data available']);

    // WINTERS does not grow on 306, so it must not come back.
    await tick(field, ['306']);
    await expect(variety.locator('.selected-item')).toHaveCount(0);
    expect((await options(variety)).filter((o) => o !== 'Select All')).toEqual(['BUTTE/PADRE']);
    await expect(panel.getByRole('button', { name: /^Create \d+ Planned Tickets?$/ })).toBeDisabled();
  });

  test('@ADO-26493 HMF-28 a variety shared by two plots goes to each plot', async ({ page }) => {
    const sent = await capturePlan(page);
    const { panel, field, variety, tick } = pickers(page);
    await tick(field, ['130', '131']);
    await tick(variety, ['MONTEREY']);
    await panel.locator('input[type=number]').fill('1');
    await panel.getByRole('button', { name: /^Create 1 Planned Tickets?$/ }).click();
    expect(await sent()).toEqual([
      ['130', [22]],
      ['131', [22]],
    ]);
  });

  test('@ADO-26493 HMF-29 a picked plot with none of the picked varieties is not sent', async ({ page }) => {
    const sent = await capturePlan(page);
    const { panel, field, variety, tick } = pickers(page);
    await tick(field, ['130', '306']);
    await tick(variety, ['MONTEREY']); // grows on 130 only
    await panel.locator('input[type=number]').fill('1');
    await panel.getByRole('button', { name: /^Create 1 Planned Tickets?$/ }).click();
    // No 306/MONTEREY pair. The web drops 306 silently (no warning; see test plan HMF-29).
    expect(await sent()).toEqual([['130', [22]]]);
  });
});

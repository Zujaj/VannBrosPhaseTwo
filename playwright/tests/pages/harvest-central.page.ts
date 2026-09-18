import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { routes } from '../constants/routes';
import { ListPage } from './list.page';

/**
 * Harvest Central (`/harvest-central`): the field/variety grid plus its "Plan Harvest Tickets"
 * panel. Checked live 2026-09-17:
 *
 *   - The header button is `Plan Harvest Tickets` (it was `Create Harvest Ticket`, with driver
 *     and plate fields). The panel now asks only for `Field *`, `Variety *` and
 *     `No Of Harvest Tickets *` (10 / 20 / 30 presets plus a number box, min 1, max 100). Its
 *     submit is labelled `Create N Planned Tickets`.
 *   - Saving shows NO toast. The panel closes and the pair's `No Of Planned Tickets` goes up by
 *     N; a pair with no row yet gets one. Typing more than 100 raises the error toast
 *     "Harvest Ticket Plan Max 100" and clamps the box to 100.
 *   - Variety lists every variety whatever Field is picked.
 */
export class HarvestCentralPage extends ListPage {
  /** The most tickets one plan accepts. */
  static readonly MAX_PER_PLAN = 100;

  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.goto(routes.harvestCentral.root, { waitUntil: 'domcontentloaded' });
    await this.waitForGridSettled();
    await this.clearAllColumnFilters(); // filters are sticky across sessions
  }

  /**
   * `No Of Planned Tickets` for one field/variety pair, or 0 when the pair has no row yet.
   * Searches the Field column (which matches substrings) and then picks the exact pair.
   */
  async plannedTickets(field: string, variety: string): Promise<number> {
    await this.searchColumn('Field', field);
    const [fieldCol, varietyCol, plannedCol] = await Promise.all(
      ['Field', 'Variety', 'No Of Planned Tickets'].map((c) => this.columnIndex(c)),
    );
    const rows = await this.rows.evaluateAll(
      (trs, cols) =>
        trs.map((tr) => cols.map((c) => (tr.children[c - 1] as HTMLElement | undefined)?.innerText.trim() ?? '')),
      [fieldCol, varietyCol, plannedCol],
    );
    await this.clearColumnSearch('Field');
    const row = rows.find(([f, v]) => f === field && v === variety);
    return row ? Number(row[2]) : 0;
  }

  /**
   * Plan `count` tickets for a field/variety pair. Counts above 100 are sent as several plans,
   * because one plan cannot exceed 100.
   */
  async planTickets(field: string, variety: string, count: number): Promise<void> {
    for (let left = count; left > 0; left -= HarvestCentralPage.MAX_PER_PLAN) {
      await this.planOnce(field, variety, Math.min(left, HarvestCentralPage.MAX_PER_PLAN));
    }
  }

  private async planOnce(field: string, variety: string, count: number): Promise<void> {
    const heading = this.page.getByRole('heading', { name: 'Plan Harvest Tickets', level: 2 });
    await this.clickPastLoader(this.page.getByRole('button', { name: 'Plan Harvest Tickets' }), () =>
      expect(heading).toBeVisible({ timeout: 5000 }),
    );
    await this.selectFromDropdown(['Field *'], field);
    await this.selectFromDropdown(['Variety *'], variety);
    await this.page.getByRole('spinbutton', { name: 'No Of Harvest Tickets' }).fill(String(count));

    // The label carries the count, so this also proves the box took the value.
    const create = this.page.getByRole('button', { name: `Create ${count} Planned Tickets`, exact: true });
    await expect(create).toBeEnabled();
    await create.click();
    await expect(heading).toBeHidden({ timeout: 30000 });
    await this.waitForGridSettled();
  }
}

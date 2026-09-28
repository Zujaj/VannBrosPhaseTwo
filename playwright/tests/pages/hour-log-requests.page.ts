import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Hour Log Adjustment — the manager's side on the Work Order detail page
 * (PSD `AgriERP FSCM - Hour Log Adjustment.pdf`, knowledge ref `hour-log-adjustment.md`).
 *
 * Contract, verified live 2026-09-28 on WO-1283 (differs from the PSD mocks — the app wins):
 *
 *   Resources table   column `Hour Log Changes`, chip link `N To Review`
 *   Drawer            heading `Hour Log Change Request` → `…Requests` after a same-day redeploy, subtitle
 *                     `<Resource (code)> · WO-nnnn · N Needs Review`
 *   Request card      `REQ-0151` + device badge `IOS`, `<field> (<project>)·MM/DD/YYYY`,
 *                     `Machine: …`, a `Requested` panel (`06:01 PM - 10:46 PM`, `4h:45m`),
 *                     the operator's reason, buttons `Approve 4h:45m` · `Adjust` · `Reject`
 *   Adjust            `Set The Hours Yourself`: Machine / Implement multi-selects, `Job Start*`
 *                     / `Job End*` (date + HH/MM textboxes + AM/PM), `Remarks*` textbox
 *                     `Note For The Operator`, `Approve Hours` (disabled until a remark) · `Cancel`;
 *                     end ≤ start → `The Job End Must Be After The Job Start`, Approve disabled
 *   Reject            `Reject This Change`, `Logged Hours Stay As The Spent Hours`, textbox
 *                     `Reason Shown To The Operator`, `Confirm Reject` (disabled until a reason) · `Cancel`
 *
 * Only read-only actions live here: opening panels and typing into them, never Approve /
 * Confirm Reject. Deciding a request mutates shared QA data other testers are using.
 */
export class HourLogRequestsPage extends BasePage {
  // Singular on 2026-09-28 morning, plural (as in the PSD) after a QA redeploy the same day.
  static readonly DRAWER_TITLE = /^Hour Log Change Requests?$/;
  static readonly END_AFTER_START = 'The Job End Must Be After The Job Start';

  async gotoWorkOrder(id: string | number) {
    // The detail page embeds a plot map whose tiles keep 'load' from firing; don't wait for it.
    await this.page.goto(routes.workorders.detail.replace(':id', String(id)), { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.resourcesTable()).toBeVisible({ timeout: 60000 });
  }

  resourcesTable(): Locator {
    return this.page
      .getByRole('table')
      .filter({ has: this.page.getByRole('columnheader', { name: 'Hour Log Changes' }) });
  }

  toReviewChips(): Locator {
    return this.resourcesTable().getByRole('link', { name: /^\s*\d+ To Review\s*$/ });
  }

  /**
   * The `N To Review` chips come from a separate fetch that lands after the table renders, so
   * an immediate count reads 0. Give them time before concluding there is nothing to review.
   */
  async hasPendingRequests(timeout = 20000): Promise<boolean> {
    return this.toReviewChips()
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true, () => false);
  }

  /** The Resources-table row for one resource, e.g. `Agrierp 07`. */
  resourceRow(name: string): Locator {
    return this.resourcesTable().getByRole('row').filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${name}\\b`) }) });
  }

  chipFor(resourceName: string): Locator {
    return this.resourceRow(resourceName).getByRole('link', { name: /^\s*\d+ To Review\s*$/ });
  }

  /** Spent Hours cell text (`NNh:MMm`) for a resource row. */
  async spentHours(resourceName: string): Promise<string> {
    const text = await this.resourceRow(resourceName).getByRole('cell').filter({ hasText: /\d+h:\d{2}m/ }).first().innerText();
    return text.match(/\d+h:\d{2}m/)![0];
  }

  /**
   * Click a deciding button, then clear the Create Adjustment overlap prompt with Continue if the
   * decision triggers it (it only appears when the decided time overlaps an entry that shares a
   * machine — PSD "Overlap and Redistribution", not yet observed live).
   */
  async decide(button: Locator) {
    const decided = this.page.waitForResponse((r) => /\/HourLogChangeRequests\/\d+\/decide/i.test(r.url()), { timeout: 30000 });
    await button.click();
    const cont = this.page.getByRole('button', { name: 'Continue', exact: true });
    if (await cont.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false)) await cont.click();
    const res = await decided;
    if (!res.ok()) {
      const body = await res.text();
      // Hours left behind by DELETED work orders still block decisions over the same time and
      // are invisible to every read endpoint (hour-log-requests.mts). Name it rather than time out.
      if (/overlaps these hours and cannot be overridden/.test(body)) {
        throw new Error(`Decide refused by an orphaned hour log (known QA defect — rerun picks another slot): ${body.slice(0, 300)}`);
      }
      throw new Error(`Decide failed ${res.status()}: ${body.slice(0, 300)}`);
    }
    await this.waitForLoaderGone();
  }

  drawerHeading(): Locator {
    return this.page.getByRole('heading', { name: HourLogRequestsPage.DRAWER_TITLE, level: 2 });
  }

  /**
   * The drawer panel: the heading's nearest ancestor that also holds a request number. Walked
   * up by XPath because the panel's wrappers are not all `div`s.
   */
  drawer(): Locator {
    return this.drawerHeading().locator(
      'xpath=ancestor::*[.//text()[starts-with(normalize-space(), "REQ-")]][1]',
    );
  }

  /**
   * Every pending request card: starts with its REQ number and holds exactly one. Only valid
   * while the cards are collapsed — use `card()` / `firstCard()` for a card you will expand.
   */
  requestCards(): Locator {
    return this.drawer()
      .locator('div')
      .filter({ hasText: /^\s*REQ-\d{4}/ })
      .filter({ hasNotText: /REQ-\d{4}[\s\S]*REQ-\d{4}/ })
      .filter({ has: this.page.getByRole('button', { name: 'Adjust' }) });
  }

  /**
   * A card pinned by its request number, so it still resolves once Adjust/Reject expand it:
   * the innermost element holding that number and one of the card's own buttons (collapsed
   * cards show Adjust, expanded ones Cancel). Innermost = `.last()` in document order.
   */
  card(reqNo: string): Locator {
    return this.drawer()
      .locator('div')
      .filter({ has: this.page.getByText(reqNo, { exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: /^\W*(Adjust|Cancel)$/ }) })
      .last();
  }

  async firstCard(): Promise<{ reqNo: string; card: Locator }> {
    const reqNo = (await this.requestCards().first().getByText(/^REQ-\d{4}$/).innerText()).trim();
    return { reqNo, card: this.card(reqNo) };
  }

  async openDrawer(chip: Locator) {
    // Not clickPastLoader: the drawer can take >5 s to slide in, and a retry would then click the
    // chip underneath the open drawer (`app-aside ... intercepts pointer events`). Only retry
    // while the drawer is still closed.
    await expect(async () => {
      if (!(await this.drawerHeading().isVisible())) {
        await this.waitForLoaderGone();
        await this.waitForToastsGone();
        await chip.click({ timeout: 5000 });
      }
      await expect(this.drawerHeading()).toBeVisible({ timeout: 15000 });
    }).toPass({ timeout: 60000 });
    await this.waitForLoaderGone();
    await expect(this.requestCards().first()).toBeVisible({ timeout: 20000 });
  }

  async openAdjust(card: Locator) {
    await card.getByRole('button', { name: 'Adjust' }).click();
    await expect(card.getByRole('heading', { name: 'Set The Hours Yourself' })).toBeVisible();
  }

  async openReject(card: Locator) {
    await card.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(card.getByRole('heading', { name: 'Reject This Change' })).toBeVisible();
  }

  /** Set the Adjust form's Job End clock to the Job Start clock, so end == start. */
  async makeEndEqualStart(card: Locator) {
    const hh = card.getByRole('textbox', { name: 'HH' });
    const mm = card.getByRole('textbox', { name: 'MM' });
    await hh.nth(1).fill(await hh.nth(0).inputValue());
    await mm.nth(1).fill(await mm.nth(0).inputValue());
    await mm.nth(1).press('Tab');
  }
}

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
 *                     `Reason Shown To The Operator`, `Confirm Reject` (disabled until a reason) · `Cancel`;
 *                     a spaces-only reason → `Reason Is Required` on Confirm, button disabled
 *   Overlap (2026-09-29) Decide answers 409 → dialog `Create Adjustment`: `The Selected Time Overlaps
 *                     with Existing Job Time For The Same Resource And Machine`, table `Work Order ·
 *                     Plot · Machine · Start Date · End Date`, `If You Continue The System Will
 *                     Redistribute Hours…`, `Cancel` · `Continue` (re-sends Decide with the override)
 *   Hours Logged      the row link opens a `Spent Hours` drawer: one block per entry (`Job ID`
 *                     `LogAdj-nnnn`, `Start Date & Time`, `End Date & Time`, `Hours`, `Approval Status`)
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

  /** Resolves on the next Decide response. */
  private nextDecide() {
    return this.page.waitForResponse((r) => /\/HourLogChangeRequests\/\d+\/decide/i.test(r.url()), { timeout: 30000 });
  }

  /** The Create Adjustment prompt shown when a decision overlaps approved time. */
  overlapDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: 'Create Adjustment' }) });
  }

  /**
   * Click a deciding button and deal with the Create Adjustment prompt. Deciding overlapping time
   * answers 409 and opens the prompt; Continue re-sends Decide with the override.
   *   `continue` (default)  press Continue if the prompt appears
   *   `none`                the prompt must NOT appear (throws if it does)
   *   `cancel`              the prompt must appear; press Cancel (nothing is decided)
   * Returns whether the prompt appeared.
   */
  async decide(button: Locator, overlap: 'continue' | 'none' | 'cancel' = 'continue'): Promise<boolean> {
    let decided = this.nextDecide();
    await button.click();
    let res = await decided;
    const prompted = res.status() === 409;
    if (prompted) {
      await expect(this.overlapDialog()).toBeVisible({ timeout: 15000 });
      if (overlap === 'none') throw new Error(`unexpected Create Adjustment prompt: ${(await res.text()).slice(0, 300)}`);
      if (overlap === 'cancel') {
        await this.overlapDialog().getByRole('button', { name: 'Cancel' }).click();
        await expect(this.overlapDialog()).toBeHidden();
        return true;
      }
      decided = this.nextDecide();
      await this.overlapDialog().getByRole('button', { name: 'Continue' }).click();
      res = await decided;
    } else if (overlap === 'cancel') {
      throw new Error(`expected the Create Adjustment prompt, got ${res.status()}`);
    }
    if (!res.ok()) throw await this.decideError(res);
    await this.waitForLoaderGone();
    return prompted;
  }

  /**
   * Click a deciding button that must open the Create Adjustment prompt (a 409), and leave the
   * prompt open. Any other answer fails with the reason.
   */
  async openOverlapPrompt(button: Locator) {
    const decided = this.nextDecide();
    await button.click();
    const res = await decided;
    if (res.status() !== 409) throw await this.decideError(res);
    await expect(this.overlapDialog()).toBeVisible({ timeout: 15000 });
  }

  private async decideError(res: import('@playwright/test').Response): Promise<Error> {
    const body = await res.text();
    // Hours left on QA by other work orders (deleted, closed, or app-logged with no end) block
    // decisions over the same time, and no read endpoint shows them for a whole resource
    // (hour-log-requests.mts). Name it rather than fail on a confusing assertion.
    if (/overlaps these hours and cannot be overridden/.test(body)) {
      return new Error(`Decide refused by an hour log outside this WO (QA data — rerun picks another slot): ${body.slice(0, 300)}`);
    }
    return new Error(`Decide answered ${res.status()}: ${body.slice(0, 300)}`);
  }

  /**
   * Subtitle `<Resource (code)> · WO-nnnn · N Needs Review`, read as its count. The `·` separators
   * are CSS, so the text runs `WO-13738 Needs Review`: strip the WO number before reading N.
   */
  async needsReviewCount(sequenceNo: string): Promise<number> {
    const text = await this.drawerHeading().locator('xpath=following-sibling::p[1]').innerText();
    return Number(text.split(sequenceNo).pop()!.match(/(\d+) Needs Review/)![1]);
  }

  /** The drawer's close control (an icon with the accessible name `Close`). */
  drawerClose(): Locator {
    return this.drawerHeading().locator('xpath=../..').getByText('Close').or(
      this.drawerHeading().locator('xpath=../..').locator('[title="Close"], [aria-label="Close"]'),
    ).first();
  }

  /** Open the resource's `Hours Logged` link → the `Spent Hours` drawer; returns it. */
  async openHoursLogged(resourceName: string): Promise<Locator> {
    const heading = this.page.getByRole('heading', { name: 'Spent Hours', level: 2 });
    await expect(async () => {
      await this.waitForLoaderGone();
      await this.resourceRow(resourceName).getByRole('link', { name: 'Hours Logged' }).click({ timeout: 5000 });
      await expect(heading).toBeVisible({ timeout: 15000 });
    }).toPass({ timeout: 60000 });
    await this.waitForLoaderGone();
    return heading.locator('xpath=ancestor::*[.//text()[normalize-space()="Job ID"]][1]');
  }

  /**
   * Header **Mark As Done** → dialog **Approve This Work Order** (Description) → **Approve**, and
   * wait for the `POST …/workOrder/Status` it sends. Returns that response; the caller asserts.
   * Only used where the server must refuse (a pending request); a successful call would complete
   * the WO and post its consumption to D365.
   */
  async markAsDone(description: string) {
    await this.waitForLoaderGone();
    await this.page.getByRole('button', { name: 'Mark As Done' }).click();
    const dialog = this.page.getByRole('dialog').filter({ has: this.page.getByRole('heading', { name: 'Approve This Work Order' }) });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await dialog.getByRole('textbox', { name: 'Description' }).fill(description);
    const sent = this.page.waitForResponse((r) => /\/workOrder\/Status$/i.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 });
    await dialog.getByRole('button', { name: 'Approve' }).click();
    const res = await sent;
    await this.waitForLoaderGone();
    return res;
  }

  /** Tick or untick one machine in the Adjust form's Machine multi-select, then close it. */
  async toggleMachine(card: Locator, label: string) {
    const select = card.locator('ng-multiselect-dropdown').first();
    await select.locator('.dropdown-btn').click();
    await select.locator('.dropdown-list li', { hasText: label }).click();
    await card.getByRole('heading', { name: 'Set The Hours Yourself' }).click();
  }

  /** Remove one machine chip (`<label> x`) from the Adjust form without opening the list. */
  async removeMachineChip(card: Locator, label: string) {
    await card.locator('ng-multiselect-dropdown').first().locator('.selected-item', { hasText: label }).locator('a').click();
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

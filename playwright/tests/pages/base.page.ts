import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

/**
 * Mechanics shared by every authenticated screen: the full-screen truck loader overlay
 * and the toast container both cover the form and intercept pointer events, so any page
 * object that clicks into the app needs to wait them out first.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Wait out the full-screen truck loader (`#f3-overlay-loader`, an <app-loader> lottie
   * overlay) the app shows during fetches. While visible it intercepts pointer events, so
   * any click fired against the form races it. Resolves immediately when the loader is absent.
   */
  async waitForLoaderGone() {
    const loader = this.page.locator('#f3-overlay-loader');
    // A fetch may have only just started, so give the loader a beat to appear first;
    // otherwise we could check "hidden" before it even shows and act mid-fetch.
    await loader.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
    await loader.waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
  }

  /**
   * Wait for any Angular ngx-toastr notifications to clear from the overlay container.
   * Warning/error toasts position themselves over the form and intercept pointer events,
   * causing clicks (especially the modal Save button) to time out.
   * Resolves immediately when no toasts are present.
   */
  async waitForToastsGone() {
    const toast = this.page.locator('.overlay-container .toast-container .toast');
    // Toasts auto-dismiss (ngx-toastr default ~5s). Wait for any active one to clear so
    // it stops intercepting pointer events. No-op when none are present.
    if (await toast.count()) {
      await toast.first().waitFor({ state: 'hidden' }).catch(() => {});
    }
  }

  /**
   * Click a control that the truck loader / toasts can cover AFTER the pre-click waits resolve.
   * `waitForLoaderGone()` + `click()` is NOT atomic: a fetch can re-show the `#f3-overlay-loader`
   * overlay in the gap between the two, so the click lands on the loader and is silently dropped
   * ("...subtree intercepts pointer events"). Retry the whole clear -> click -> confirm sequence
   * until it sticks, so a re-appearing loader costs a retry instead of a flake.
   *
   * `confirm` MUST assert the click's observable effect (modal opened / closed), so a click that
   * was eaten by the loader fails the attempt and loops, rather than counting as success. The
   * per-attempt click timeout is short so `toPass` loops promptly instead of burning the budget
   * inside one click's internal actionability retry.
   */
  async clickPastLoader(
    target: Locator,
    confirm: () => Promise<void>,
    // Budget fits a couple of real iterations (each can spend ~20s in waitForLoaderGone when the
    // overlay is slow) without dominating the caller's per-test timeout — addFirstFromModal makes
    // up to 8 such clicks, so an over-large budget here can blow the test cap on a slow env.
    //
    // The loader is not the only thing that can cover a control: the aside menu's collapsing
    // accordion (`app-aside.aside-menu`) also intercepts pointer events while it animates, and
    // no wait here clears that — it just needs another attempt. A caller whose target sits
    // under the aside therefore needs room for more than one iteration, hence the override.
    { timeout = 45000, clickTimeout = 8000 }: { timeout?: number; clickTimeout?: number } = {},
  ) {
    await expect(async () => {
      await this.waitForLoaderGone();
      await this.waitForToastsGone();
      await target.click({ timeout: clickTimeout });
      await confirm();
    }).toPass({ timeout });
  }

  /**
   * Pick a value from one of the app's custom dropdowns — the Work Order form's Priority / Farm /
   * Operation / Supervisor / Material Template / Inspection Template, and Harvest Central's
   * Field / Variety (same widget, labelled "Field *" with a space). These are not <select>s: each is
   * a `.dropdown` whose toggle button has no accessible name, so we anchor on the visible
   * field label and click the next button. When open, the panel gets the `show` class and
   * contains a search box + clickable option rows.
   *
   * `labels` accepts more than one string because the live form's header labels vary
   * ("Operation Type*"/"Operation*" vs "Task Type*"/"Task*") — pass every variant so the
   * lookup matches whichever the form renders.
   */
  async selectFromDropdown(labels: string[], optionText: string) {
    const panel = await this.openDropdown(labels);
    const search = panel.locator('input');
    if (await search.count()) await search.first().fill(optionText);
    await panel.getByText(optionText, { exact: true }).click();
  }

  /**
   * The toggle button for one of the form's custom dropdowns, located by its field label.
   * Exposed separately from `selectFromDropdown` so specs can assert on the control itself
   * (e.g. that Task Type* is disabled on the Harvest/Inspection forms) without opening it.
   * `labels` accepts variants for the same reason as `selectFromDropdown`.
   */
  dropdownToggle(labels: string[]): Locator {
    const labelXpath = labels.map((l) => `//*[normalize-space(text())="${l}"]`).join(' | ');
    return this.page.locator(`xpath=(${labelXpath})/following::button[1]`).first();
  }

  /**
   * Open a custom dropdown and return its open panel (`.dropdown.show`), so callers can
   * enumerate or assert on the option rows rather than just picking one — used by the
   * harvest spec to prove Task* offers the harvest operations and nothing else.
   */
  async openDropdown(labels: string[]): Promise<Locator> {
    await this.waitForLoaderGone(); // a prior select may still be fetching behind the loader
    await this.waitForToastsGone(); // toasts can block the dropdown toggle button click
    await this.dropdownToggle(labels).click();

    // Wait for the panel to actually open before searching within it.
    const panel = this.page.locator('.dropdown.show');
    await expect(panel).toBeVisible();
    return panel;
  }
}

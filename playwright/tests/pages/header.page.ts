import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * The application header: module navigation, the Site and Season context selectors, the
 * D365 shortcut and the user menu.
 *
 * This is the shared surface behind the workbook's `01 Global & Navigation` tab, and behind
 * every "switch site / switch season and confirm the module re-scopes" case in the module
 * tabs. All selectors verified live against the QA tenant on 2026-09-07.
 */

/**
 * Modules the workbook's GN-013 requires in the header, with the route each must resolve to
 * and the component that must actually mount there (GN-014). Order matches the live header
 * left-to-right.
 *
 * The live header also carries an **Attendance** link that the workbook does not list. That
 * is a workbook gap rather than a defect, so the assertions check that every required module
 * is present and correctly routed, and do not assert the header holds ONLY these.
 *
 * `root` is the module's own Angular component, and is what proves the module RENDERED
 * rather than merely routed. A heading cannot serve that purpose here: Planning renders no
 * heading at all, Maps' level-1 heading is empty, and Communication Center has no level-1 —
 * so a heading assertion would fail on three healthy modules (verified live 2026-09-07).
 */
export const HEADER_MODULES = [
  { label: 'Maps', route: '/maps', root: 'app-maps' },
  { label: 'Planning', route: '/crop-mgmt', root: 'app-crop-management' },
  { label: 'Work Orders', route: '/workorders', root: 'app-work-order-list' },
  { label: 'Harvest Central', route: '/harvest-central', root: 'app-harvest-central-list' },
  { label: 'Template Management', route: '/template-mgmt', root: 'app-template-mgmt' },
  { label: 'Communication Center', route: '/messaging', root: 'app-messaging' },
] as const;

/** Entries the user menu must show for an admin (GN-032). */
export const USER_MENU_ENTRIES = [
  'User Settings',
  'Grower:',
  'Version:',
  'Environment:',
  'Help',
  'Log Out',
] as const;

export class HeaderPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** A module link in the header nav. */
  navLink(label: string): Locator {
    return this.page.getByRole('link', { name: label, exact: true });
  }

  /**
   * The Site or Season selector's toggle button.
   *
   * Both are the same `app-f3-*-dropdown` widget: a `button.dropdown-toggle` whose `title`
   * attribute holds the CURRENT value ("Colusa", "Crop Year 2026") while its accessible name
   * is the prefixed label ("Site: Colusa"). Anchoring on the component tag rather than the
   * name keeps the locator stable when the selected value changes — which is the whole point
   * of the tests that use it.
   */
  contextToggle(kind: 'site' | 'season'): Locator {
    const tag = kind === 'site' ? 'app-f3-location-dropdown' : 'app-f3-season-dropdown';
    return this.page.locator(`${tag} button.dropdown-toggle`);
  }

  /** The currently selected Site / Season, read from the toggle's title attribute. */
  async currentContext(kind: 'site' | 'season'): Promise<string> {
    return (await this.contextToggle(kind).getAttribute('title'))?.trim() ?? '';
  }

  /**
   * Open a context selector and return its panel.
   *
   * The panel is `#myDropdown` gaining `.show`; it holds a sticky `#searchTextbox` and one
   * `a.dropdown-item` per option, with `.active` on the current one. Both selectors render
   * their own `#myDropdown`, so the panel is scoped to the component rather than looked up
   * by id across the page.
   */
  async openContext(kind: 'site' | 'season'): Promise<Locator> {
    const tag = kind === 'site' ? 'app-f3-location-dropdown' : 'app-f3-season-dropdown';
    await this.waitForLoaderGone();
    await this.contextToggle(kind).click();
    const panel = this.page.locator(`${tag} #myDropdown.show`);
    await expect(panel).toBeVisible();
    return panel;
  }

  /** Option rows in an open context panel (the search box is excluded). */
  contextOptions(panel: Locator): Locator {
    return panel.locator('a.dropdown-item');
  }

  /**
   * Switch Site or Season and wait for the header to reflect it.
   *
   * Returns the previous value so a caller can restore it — these selectors are stored
   * per-user server-side, so a spec that switches context and does not switch back leaves
   * every later spec (and the next person to open the app as this account) on the wrong one.
   */
  async switchContext(kind: 'site' | 'season', value: string): Promise<string> {
    const previous = await this.currentContext(kind);
    if (previous === value) return previous;

    const panel = await this.openContext(kind);
    await this.contextOptions(panel).filter({ hasText: value }).first().click();
    await expect(this.contextToggle(kind)).toHaveAttribute('title', value, { timeout: 20000 });
    await this.waitForLoaderGone();
    return previous;
  }

  /** The avatar button that opens the user menu. Initials vary by user, so anchor on the component. */
  get avatar(): Locator {
    return this.page.locator('app-avatar-generator');
  }

  /** Open the user menu and return the container holding its entries. */
  async openUserMenu(): Promise<Locator> {
    await this.waitForLoaderGone();
    await this.avatar.click();
    const menu = this.page.locator('.dropdown-menu.show').filter({ hasText: 'Log Out' });
    await expect(menu).toBeVisible();
    return menu;
  }

  /**
   * Read a `Label: value` line out of the open user menu (Version, Environment, Grower).
   * Returns null when the label is absent, so a caller can assert its absence too.
   */
  async userMenuValue(menu: Locator, label: string): Promise<string | null> {
    const text = await menu.innerText();
    return text.match(new RegExp(`${label}\\s*:\\s*(.+)`))?.[1]?.trim() ?? null;
  }

  /** The Dynamics 365 F&O shortcut in the header. */
  get erpLink(): Locator {
    // Matched on the tooltip, which the builds disagree about: one says "Navigate To Erp",
    // the current QA build "Click to navigate Microsoft Dynamics 365 F&O". The link carries
    // no text, so an accessible-name locator keyed to one wording silently stops matching
    // (observed live 2026-09-14, after the label changed mid-session).
    return this.page.locator(
      'a[title*="Navigate To Erp" i], a[title*="Microsoft Dynamics 365" i]',
    );
  }

  /** Breadcrumb items, in order (the trailing node is the current page and is not a link). */
  get breadcrumb(): Locator {
    return this.page.locator('main').getByRole('listitem');
  }
}

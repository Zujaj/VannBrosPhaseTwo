import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Template Management: the landing page and its three lists.
 *
 * Workbook tab `09 Template Management`. The landing page is a card deck; the Inspection and
 * Material lists are the shared `app-f3-table` grid (use `ListPage` for their mechanics),
 * while the Attribute screen is a card grid rather than a table.
 *
 * All selectors verified live against the QA tenant on 2026-09-07.
 */

/** The three cards on the landing page, with the list each opens. */
export const TEMPLATE_CARDS = [
  { name: 'Inspection Template', route: routes.templateMgmt.inspectionTemplates, unit: 'Templates' },
  { name: 'Material Template', route: routes.templateMgmt.activityDetails, unit: 'Templates' },
  { name: 'Attribute Template', route: routes.templateMgmt.templateAttribute, unit: 'Attributes' },
] as const;

export type TemplateCardName = (typeof TEMPLATE_CARDS)[number]['name'];

export type TemplateStatusTab = 'All' | 'Draft' | 'Published';

export class TemplatesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /** A landing-page card, located by the template type it fronts. */
  card(name: TemplateCardName): Locator {
    return this.page.locator('div.tm').filter({ hasText: name }).first();
  }

  /**
   * Wait for the landing cards to show their real counts.
   *
   * Do NOT gate this on `.skeleton-box` clearing: on this page the skeleton count reaches
   * zero BEFORE the cards mount, so a skeleton-based wait returns while the deck is still
   * empty and the caller sees no cards at all (observed live 2026-09-07). The counts
   * themselves are the reliable signal.
   */
  async waitForCards(): Promise<void> {
    await this.waitForLoaderGone();
    for (const { name } of TEMPLATE_CARDS) {
      // Require a NON-ZERO count, not merely a digit: the card renders "0 Templates" while
      // its fetch is still in flight, and `/\d+/` matches that zero — so a digit check
      // returns on a card that has not loaded yet. Every card in this tenant holds records,
      // so zero means "not loaded", not "empty".
      await expect(this.card(name).locator('.bottom')).toHaveText(/[1-9]\d*/, { timeout: 45000 });
    }
  }

  /** The count a card reports (18 Templates -> 18). */
  async cardCount(name: TemplateCardName): Promise<number> {
    const text = await this.card(name).locator('.bottom').innerText();
    const match = text.match(/(\d[\d,]*)/);
    if (!match) throw new Error(`Card "${name}" shows no count. Text: ${text}`);
    return Number(match[1].replace(/,/g, ''));
  }

  /** Open the landing page and wait for the deck. */
  async openLanding(): Promise<void> {
    await this.page.goto(routes.templateMgmt.root, { waitUntil: 'domcontentloaded' });
    await this.waitForCards();
  }

  /** The Create button on a template list. */
  get createButton(): Locator {
    return this.page.getByRole('button', { name: 'Create', exact: true });
  }

  /** Open the inspection-template Create wizard. It is a panel over the list, not a route. */
  async openCreateWizard(): Promise<Locator> {
    await this.waitForLoaderGone();
    await this.createButton.click();
    const wizard = this.page.getByRole('heading', { name: /^Create New Template/ });
    await expect(wizard).toBeVisible({ timeout: 20000 });
    return wizard;
  }

  /** Status tabs on the inspection-template list. */
  statusTab(name: TemplateStatusTab): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  /**
   * Switch the inspection-template status tab and wait for its dataset.
   * The active tab swaps `btn-outline-primary` for `btn-primary`, same as the work-order
   * sub-tabs; the click retries past the loader because the tab strip sits under it.
   */
  async switchStatusTab(name: TemplateStatusTab): Promise<void> {
    const tab = this.statusTab(name);
    await this.clickPastLoader(tab, () =>
      expect(tab).toHaveClass(/btn-primary/, { timeout: 5000 }),
    );
    await this.waitForLoaderGone();
  }

  /**
   * The individual attribute cards on the Attribute Template screen.
   *
   * `app-f3-template-card` is the single CONTAINER for the whole deck, not one per attribute
   * — matching it yields exactly 1 however many attributes exist. The per-attribute nodes are
   * the `.card` children inside it (verified live 2026-09-07: 1 container, 23 cards).
   */
  get attributeCards(): Locator {
    return this.page.locator('app-f3-template-card .card');
  }
}

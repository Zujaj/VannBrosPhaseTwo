import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '../constants/routes';

/**
 * Communication Center (`/messaging`): the conversation list on the left, a message thread on
 * the right. Workbook tab `10 Communication Center`.
 *
 * This page has no `<main>` element — scope to `app-messaging`. Verified live 2026-09-08.
 */
export class MessagingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.page.goto(routes.messaging, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaderGone();
    await expect(this.conversations.first()).toBeVisible({ timeout: 45000 });
  }

  /** The messaging module root; this page renders no `<main>`. */
  get root(): Locator {
    return this.page.locator('app-messaging');
  }

  /** Conversation cards in the left-hand list. */
  get conversations(): Locator {
    return this.page.locator('app-chathead-card');
  }

  /** The conversation-list search box. */
  get search(): Locator {
    return this.page.getByPlaceholder('Type Name To Search');
  }

  /** Message bubbles in the open thread. */
  get bubbles(): Locator {
    return this.page.locator('app-bubble');
  }

  /**
   * Bubbles sent by someone else. The thread marks them with `.content.their`; the signed-in
   * user's own messages carry `.content` without it — that class IS the visual distinction
   * CC-008 asks about.
   */
  get theirBubbles(): Locator {
    return this.page.locator('app-bubble .content.their');
  }

  /** The message composer. Nothing in this suite clicks Send — see the spec's note. */
  get composer(): Locator {
    return this.page.getByPlaceholder('Type A Message');
  }

  get sendButton(): Locator {
    return this.page.getByRole('button', { name: 'Send', exact: true });
  }

  /** The participant list inside the New Conversation panel. */
  get userList(): Locator {
    return this.page.locator('div.userList');
  }

  /**
   * Open the first conversation that actually contains an incoming message.
   *
   * A thread the signed-in user has only ever sent to shows no `.their` bubble, so the
   * own-vs-others distinction cannot be demonstrated there — that is missing data, not a
   * defect. Walks the list until it finds one (all five sampled threads had incoming
   * messages on 2026-09-08, so this normally lands on the first).
   */
  async openConversationWithIncoming(maxAttempts = 5): Promise<void> {
    const total = Math.min(maxAttempts, await this.conversations.count());
    for (let index = 0; index < total; index += 1) {
      await this.conversations.nth(index).click();
      await expect(this.composer).toBeVisible({ timeout: 30000 });
      await this.waitForLoaderGone();
      await this.bubbles.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      // Poll rather than sample: bubbles stream in after the composer mounts, so an
      // immediate count reads a thread that has not finished rendering its history and
      // reports "no incoming messages" for a thread that plainly has them.
      const hasIncoming = await expect
        .poll(async () => this.theirBubbles.count(), { timeout: 8000 })
        .toBeGreaterThan(0)
        .then(() => true)
        .catch(() => false);
      if (hasIncoming) return;
    }
    throw new Error(`No conversation with an incoming message in the first ${total}`);
  }

  /** Open the first conversation whose title matches, and wait for its thread. */
  async openConversation(title?: string | RegExp): Promise<void> {
    const card = title ? this.conversations.filter({ hasText: title }).first() : this.conversations.first();
    await card.click();
    await expect(this.composer).toBeVisible({ timeout: 30000 });
    await this.waitForLoaderGone();
  }

  /** Open the participant picker and return its panel. */
  async openNewConversation(): Promise<Locator> {
    // The button sits on the list pane, which the module paints before the panel is wired —
    // retry the open so a click that lands too early costs a retry rather than the test.
    const picker = this.page.getByPlaceholder('Search User');
    await expect(async () => {
      await this.page.getByRole('button', { name: /New Conversation/i }).click({ timeout: 8000 });
      await expect(picker).toBeVisible({ timeout: 8000 });
    }).toPass({ timeout: 45000 });
    return picker;
  }
}

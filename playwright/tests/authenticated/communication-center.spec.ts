import { test, expect } from '../fixtures';
import { routes } from '../constants/routes';

/**
 * Communication Center. Workbook tab `10 Communication Center`.
 *
 * All non-mutating, and this module constrains that harder than any other: most of its P1s
 * (send a message, upload media, create a conversation, flag for a manager) write into real
 * conversations with real people's names on them, on a shared QA tenant, with no teardown.
 * Those are left manual rather than automated destructively.
 *
 * CC-016 ("empty and whitespace-only messages are rejected") is deliberately NOT automated:
 * the Send button is never disabled (verified live 2026-09-08 — enabled on empty, on
 * whitespace and on text alike), so the only way to observe the rejection is to click Send.
 * If the app rejects, nothing happens; if it does not, an empty message is posted into a real
 * thread. That asymmetry is not worth the coverage. See test-plans/FINDINGS.md.
 */

test('@TC:CC-001 the module loads the conversation list', async ({ page, messagingPage }) => {
  await messagingPage.open();

  await expect(page).toHaveURL(new RegExp(routes.messaging));
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();

  const count = await messagingPage.conversations.count();
  expect(count).toBeGreaterThan(0);

  // Avatars, titles and last-message previews.
  const first = messagingPage.conversations.first();
  await expect(first.locator('app-avatar-generator')).toHaveCount(1);
  expect((await first.innerText()).trim().length).toBeGreaterThan(0);
});

test('@TC:CC-003 conversation titles identify each chat type', async ({ messagingPage }) => {
  await messagingPage.open();

  const titles = (await messagingPage.conversations.allInnerTexts()).map((t) =>
    t.replace(/\s+/g, ' ').trim(),
  );
  expect(titles.length).toBeGreaterThan(0);

  // Titles are pipe-separated: `Weed Control (1230) | PRJ_000112` for a work-order chat and
  // `Qaiser Imtiaz | 000213` for a direct one, so the two are told apart by what follows the
  // pipe — a project reference or an employee number.
  expect(
    titles.some((t) => /\(\d+\)\s*\|\s*PRJ_\d+/.test(t)),
    'no work-order conversation showing task code + project reference',
  ).toBe(true);

  expect(
    titles.some((t) => /[A-Za-z]\s*\|\s*\d{2,6}(\s|$)/.test(t)),
    'no direct conversation showing a participant name and employee number',
  ).toBe(true);
});

test('@TC:CC-004 media messages preview a type label rather than a path', async ({
  messagingPage,
}) => {
  test.setTimeout(120000);
  await messagingPage.open();

  const mediaPreviews = async () => {
    const titles = (await messagingPage.conversations.allInnerTexts()).map((t) =>
      t.replace(/\s+/g, ' ').trim(),
    );
    return titles.filter((t) => /\b(AUDIO|VIDEO|IMAGE|FILE)\b/.test(t));
  };

  // Polled: a card paints its title before its last-message preview arrives, so an immediate
  // read finds titles with no previews attached and concludes there is no media at all.
  await expect
    .poll(async () => (await mediaPreviews()).length, { timeout: 30000 })
    .toBeGreaterThan(0);

  // "rather than a blank line or raw file path"
  for (const preview of await mediaPreviews()) {
    expect(preview, `media preview leaks a path: ${preview}`).not.toMatch(
      /https?:\/\/|\/[\w-]+\/[\w-]+\.\w{2,4}|\.(png|jpe?g|mp4|mp3|pdf|docx?)\b/i,
    );
  }
});

test('@TC:CC-006 the conversation search filters, clears, and shows an empty state', async ({
  messagingPage,
}) => {
  test.setTimeout(120000);
  await messagingPage.open();
  const total = await messagingPage.conversations.count();

  // Take a search term from the data rather than hardcoding a tenant name.
  const firstTitle = (await messagingPage.conversations.first().innerText()).replace(/\s+/g, ' ');
  const term = firstTitle.match(/[A-Za-z]{4,}/)?.[0];
  expect(term, `no searchable word in "${firstTitle}"`).toBeTruthy();

  await messagingPage.search.fill(term!);
  await expect
    .poll(async () => messagingPage.conversations.count(), { timeout: 30000 })
    .toBeLessThanOrEqual(total);
  for (const title of await messagingPage.conversations.allInnerTexts()) {
    expect(title.toLowerCase()).toContain(term!.toLowerCase());
  }

  // A no-match search leaves no conversations rather than the unfiltered list.
  await messagingPage.search.fill('zzz-no-such-conversation-zzz');
  await expect.poll(async () => messagingPage.conversations.count(), { timeout: 30000 }).toBe(0);

  // Clearing restores the full list.
  await messagingPage.search.fill('');
  await expect.poll(async () => messagingPage.conversations.count(), { timeout: 30000 }).toBe(total);
});

/**
 * CC-008 wants "messages in chronological order, own and others' messages visually distinct,
 * each with sender and timestamp".
 *
 * Ordering is asserted over the bubbles carrying an absolute date only: the thread mixes
 * absolute dates ("8/31/2026") with relative ones ("Fri"), and a relative label cannot be
 * placed on the timeline without knowing the render date. Sender names are not shown in a
 * one-to-one thread (the header names the counterpart instead), so that half is unasserted
 * too. Partial for both reasons.
 */
test('@TC-partial:CC-008 opening a conversation loads its message history', async ({
  messagingPage,
}) => {
  test.setTimeout(120000);
  await messagingPage.open();
  // A thread the user has only sent to cannot demonstrate the own-vs-others distinction.
  await messagingPage.openConversationWithIncoming();

  await expect(messagingPage.bubbles.first()).toBeVisible({ timeout: 30000 });
  const texts = await messagingPage.bubbles.allInnerTexts();
  expect(texts.length).toBeGreaterThan(0);

  // Every bubble carries a timestamp — absolute, or a relative day label.
  for (const [index, text] of texts.entries()) {
    expect(text, `bubble ${index} has no timestamp`).toMatch(
      /\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}:\d{2}|Mon|Tue|Wed|Thu|Fri|Sat|Sun/i,
    );
  }

  // Chronological across the bubbles that carry an absolute date.
  const dated = texts
    .map((t) => t.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1])
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(d).getTime());
  for (let i = 1; i < dated.length; i += 1) {
    expect(dated[i], 'thread is not in chronological order').toBeGreaterThanOrEqual(dated[i - 1]);
  }

  // Own and others' messages are visually distinct: others carry `.their`.
  const theirs = await messagingPage.theirBubbles.count();
  expect(theirs, 'no incoming message is marked distinctly from own messages').toBeGreaterThan(0);
  expect(theirs).toBeLessThanOrEqual(await messagingPage.bubbles.count());
});

test('@TC:CC-033 New Conversation opens a searchable participant picker', async ({
  page,
  messagingPage,
}) => {
  test.setTimeout(120000);
  await messagingPage.open();

  const picker = await messagingPage.openNewConversation();
  await expect(page.getByRole('heading', { name: 'Chat Now' })).toBeVisible({ timeout: 30000 });

  // A list of eligible users, each with a name and employee number. Wait for the list to
  // populate before reading it — the panel's heading paints before its rows arrive.
  const people = messagingPage.userList.locator('app-avatar-generator');
  await expect.poll(async () => people.count(), { timeout: 30000 }).toBeGreaterThan(1);
  // Same pipe-separated shape as the conversation titles: `Abdul Wahab | 000225`.
  expect(await messagingPage.userList.innerText()).toMatch(/[A-Za-z]\s*\|\s*\d{2,6}/);

  // ...and it is searchable. Nothing is selected: creating a conversation would write to the
  // shared tenant.
  const before = await people.count();
  await picker.fill('Agrierp');
  await expect.poll(async () => people.count(), { timeout: 30000 }).toBeLessThanOrEqual(before);
  await picker.fill('');
});

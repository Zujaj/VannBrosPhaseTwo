import { test, expect } from '../fixtures';
import { pdfFile, pngFile } from '../helpers/files';

/**
 * Communication Center attachments. Workbook tab `10 Communication Center`.
 *
 * @mutating: every test sends a real message. `communication-center.spec.ts` stays read-only
 * because a send lands in real people's threads on a shared tenant with no teardown (no chat
 * delete API). So these tests only run against ONE dedicated conversation, named by
 * `E2E_CHAT_CONVERSATION` (create it once by hand, test accounts only), and skip otherwise.
 * Uploads accumulate there; nothing cleans them up.
 *
 * Files are generated in memory (`helpers/files.ts`) with a run id in the name.
 * Partial: CC-021 also expects full-size open + download, CC-022 expects size + an
 * uncorrupted download. Not asserted yet.
 */
const CONVERSATION = process.env.E2E_CHAT_CONVERSATION?.trim();

test.describe('@mutating chat attachments', () => {
  test.skip(!CONVERSATION, 'Set E2E_CHAT_CONVERSATION to the title of a dedicated test conversation');

  test.beforeEach(async ({ messagingPage }) => {
    await messagingPage.open();
    await messagingPage.openConversation(CONVERSATION);
  });

  test('@TC-partial:CC-021 an image is attached, sent and rendered inline', async ({ messagingPage }) => {
    const images = messagingPage.bubbles.locator('img');
    const before = await images.count();

    await messagingPage.sendAttachment('photo', pngFile());

    await expect.poll(() => images.count(), { timeout: 60000 }).toBeGreaterThan(before);
  });

  test('@TC-partial:CC-022 a document is attached, sent and listed by name', async ({ messagingPage }) => {
    const file = pdfFile();

    await messagingPage.sendAttachment('document', file);

    await expect(messagingPage.bubbles.filter({ hasText: file.name })).toHaveCount(1, { timeout: 60000 });
  });
});

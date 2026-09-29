import { createHash } from 'crypto';
import { test, expect } from '../fixtures';
import { fixtureFile } from '../helpers/files';

/**
 * Communication Center attachments. Workbook tab `10 Communication Center`.
 *
 * @mutating: every test sends a real message. `communication-center.spec.ts` stays read-only
 * because a send lands in real people's threads on a shared tenant with no teardown (no chat
 * delete API). So these tests only run against ONE dedicated conversation, named by
 * `E2E_CHAT_CONVERSATION` (create it once by hand, test accounts only), and skip otherwise.
 * Uploads accumulate there; nothing cleans them up.
 *
 * Files are the real ones in `fixtures/Test Data/` (`helpers/files.ts`), renamed with a run id.
 * Partial: CC-021 also expects an upload progress indicator and full-size open + download,
 * CC-022 expects the size to be listed, CC-023 expects playback on iOS. Not asserted yet.
 */
const CONVERSATION = process.env.E2E_CHAT_CONVERSATION?.trim();

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex');

test.describe('@mutating chat attachments', () => {
  test.skip(!CONVERSATION, 'Set E2E_CHAT_CONVERSATION to the title of a dedicated test conversation');

  test.beforeEach(async ({ messagingPage }) => {
    await messagingPage.open();
    await messagingPage.openConversation(CONVERSATION);
  });

  for (const kind of ['jpg', 'png', 'webp'] as const) {
    test(`@TC-partial:CC-021 a ${kind.toUpperCase()} image is attached, sent and rendered inline`, async ({
      messagingPage,
    }) => {
      const images = messagingPage.bubbles.locator('img');
      const before = await images.count();

      await messagingPage.sendAttachment(fixtureFile(kind));

      await expect.poll(() => images.count(), { timeout: 60000 }).toBeGreaterThan(before);
      // Rendered, not a broken-image icon: the browser decoded the server's copy.
      await expect
        .poll(() => images.last().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth), {
          timeout: 30000,
        })
        .toBeGreaterThan(0);
    });
  }

  for (const kind of ['pdf', 'docx'] as const) {
    test(`@TC-partial:CC-022 a ${kind.toUpperCase()} document is attached, sent and downloads intact`, async ({
      messagingPage,
      page,
    }) => {
      const file = fixtureFile(kind);

      await messagingPage.sendAttachment(file);

      const bubble = messagingPage.bubbles.filter({ hasText: file.name });
      await expect(bubble).toHaveCount(1, { timeout: 60000 });

      // "Downloads without corruption": the bytes behind the bubble's link match what was sent.
      const href = await bubble.locator('a[href]').first().getAttribute('href', { timeout: 10000 });
      expect(href, 'document bubble exposes a download link').toBeTruthy();
      const response = await page.request.get(new URL(href!, page.url()).toString());
      expect(response.ok()).toBe(true);
      expect(sha256(await response.body())).toBe(sha256(file.buffer));
    });
  }

  test('@TC-partial:CC-023 a short MP4 video is attached, sent and plays on the web', async ({ messagingPage }) => {
    const videos = messagingPage.bubbles.locator('video');
    const before = await videos.count();

    await messagingPage.sendAttachment(fixtureFile('mp4'));

    await expect.poll(() => videos.count(), { timeout: 120000 }).toBeGreaterThan(before);
    // Playable: the browser read the clip's metadata (readyState >= HAVE_METADATA) and a duration.
    await expect
      .poll(
        () =>
          videos.last().evaluate((video: HTMLVideoElement) => {
            if (video.readyState === 0) video.load();
            return video.readyState >= 1 ? video.duration : 0;
          }),
        { timeout: 60000 },
      )
      .toBeGreaterThan(0);
  });
});

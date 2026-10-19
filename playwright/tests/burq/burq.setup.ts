import { existsSync, writeFileSync } from 'fs-extra';
import { test as setup } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { AUTH_DIR, captureFailure, ensureDir, log } from '../helpers/auth';
import {
  BURQ_AUTH_FILE,
  BURQ_SESSION_STORAGE_FILE,
  burqCredential,
  sessionStorageInitScript,
} from '../helpers/burqAuth';
import { BURQ_QA_HOST, burqRoutes, burqUrl } from '../constants/routes';

/**
 * Bootstrap the Burq.io QA session (`pnpm auth:burq`), mirroring `wms.setup.ts`:
 * reuse -> scripted email/password -> human enters the emailed 2FA code -> persist -> re-validate.
 *
 * Burq is a Blazor WebAssembly app: the first load downloads the .NET runtime and can take
 * 30-60s before the login form renders.
 */

const HUMAN_AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const APP_BOOT_TIMEOUT_MS = 120_000;

/** Refuse any page host other than Burq QA. */
function assertBurqQaOnly(url: string) {
  const { host, protocol } = new URL(url);
  if (protocol.startsWith('http') && host !== BURQ_QA_HOST) {
    throw new Error(`Refusing host outside Burq QA (${BURQ_QA_HOST}): ${host}`);
  }
}

/**
 * Signed in = off the 2FA screen, no password box, and the left nav (which lists "Transactions")
 * is up. The URL alone can't tell: after 2FA the app can land on `/`, the login path.
 */
async function waitForSignedIn(page: Page, timeout: number) {
  await page.waitForFunction(
    (twoFactor) =>
      !location.pathname.startsWith(twoFactor) &&
      !document.querySelector('input[type="password"]') &&
      document.body.innerText.includes('Transactions'),
    burqRoutes.twoFactor,
    { timeout, polling: 1000 },
  );
}

async function saveState(page: Page) {
  await page.context().storageState({ path: BURQ_AUTH_FILE });
  const session = await page.evaluate(() => JSON.stringify({ ...window.sessionStorage }));
  writeFileSync(BURQ_SESSION_STORAGE_FILE, session, { mode: 0o600 });
}

/** Open /transactions with the saved session; re-save it when the page renders. */
async function probeSession(browser: Browser): Promise<boolean> {
  const context = await browser.newContext({ storageState: BURQ_AUTH_FILE });
  const init = sessionStorageInitScript();
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  try {
    await page.goto(burqUrl(burqRoutes.transactions), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForSignedIn(page, APP_BOOT_TIMEOUT_MS);
    await saveState(page);
    return true;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

setup.use({ storageState: { cookies: [], origins: [] } });

setup('authenticate (Burq QA)', async ({ browser }) => {
  setup.setTimeout(HUMAN_AUTH_TIMEOUT_MS + 2 * APP_BOOT_TIMEOUT_MS);
  ensureDir(AUTH_DIR);

  if (existsSync(BURQ_AUTH_FILE)) {
    log('[burq] Existing session file found. Attempting silent reuse.');
    if (await probeSession(browser)) {
      log('[burq] Existing session is VALID.');
      return;
    }
    log('[burq] Existing session invalid. Will bootstrap a fresh login.');
  } else {
    log('[burq] No session file. Proceeding to login.');
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    try {
      assertBurqQaOnly(frame.url());
    } catch (err) {
      log((err as Error).message);
    }
  });

  try {
    log(`[burq] Opening ${burqUrl(burqRoutes.login)} (Blazor app; first load is slow).`);
    await page.goto(burqUrl(burqRoutes.login), { waitUntil: 'domcontentloaded', timeout: 60_000 });

    const credential = burqCredential();
    if (credential) {
      log('[burq] Entering the stored email and password.');
      try {
        const boxes = page.getByRole('textbox');
        await boxes.nth(1).waitFor({ timeout: APP_BOOT_TIMEOUT_MS });
        await boxes.nth(0).fill(credential.email);
        await boxes.nth(1).fill(credential.password);
        await page.getByRole('button', { name: 'Login', exact: true }).click();
      } catch (err) {
        log(
          `Scripted login did not complete (${(err as Error).message.split('\n')[0]}) — ` +
            'finish it in the browser window.',
        );
      }
    } else {
      log('>>> No stored login (.auth/burq_credentials.json or BURQ_EMAIL / BURQ_PASSWORD).');
      log('>>> In the browser window: enter the email and password, then Login.');
    }

    log('>>> Enter the authenticator code emailed to the account, then Login.');
    log('>>> Do NOT close the browser. Waiting for the app to leave the login screens...');
    await waitForSignedIn(page, HUMAN_AUTH_TIMEOUT_MS);
    assertBurqQaOnly(page.url());
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    log(`[burq] Reached ${page.url()}.`);
    await saveState(page);
    log(`[burq] Saved storage state -> ${BURQ_AUTH_FILE}`);
  } catch (err) {
    await captureFailure(context, 'bootstrap-burq');
    await context.close();
    throw err;
  }
  await context.close();

  log('[burq] Validating saved session in a fresh browser context.');
  if (await probeSession(browser)) {
    log('[burq] Persistence check OK. Session reusable.');
  } else {
    // Still keep the files: the login worked, the probe heuristics may be what's off.
    log('[burq] WARNING: saved session did not reopen /transactions; it may not survive a new browser.');
  }
});

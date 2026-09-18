import { expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { QA_ENVIRONMENT_LABEL, routeUrl, routes } from '../constants/routes';
import type { Credential } from './credentials';

/**
 * The VannBrosPhaseTwo sign-in flow, in one place.
 *
 * Shared by `auth.setup.ts` and the account-triage tool. A second copy of this flow drifted
 * immediately when it was written by hand: it omitted the Azure AD email re-prompt branch, and
 * every account it tested timed out waiting for a password field that never appeared.
 *
 * Four stages, each tolerant of being skipped:
 *   1. VannBrosPhaseTwo's own `/login` — email, then Login.
 *   2. The auth gateway's "Choose Environment" dialog. One host serves QA, Dev and an internal
 *      demo tenant, so the environment is PINNED — choosing wrongly authenticates against Dev
 *      while every host-based guard still passes.
 *   3. Azure AD — the email again (tenant-dependent) and then the password.
 *   4. "Stay signed in?", when the tenant shows it.
 *
 * Best-effort by design: never throws, never asserts. Callers decide what a given end state
 * means — the setup falls through to its human-assisted wait, the triage tool classifies
 * whichever screen it landed on.
 */

/** Budget for the whole scripted sign-in. Past this the caller takes over. */
const LOGIN_BUDGET_MS = 90_000;
const STEP_TIMEOUT_MS = 25_000;

/**
 * Any of the submit controls the flow uses.
 *
 * It crosses two products: VannBrosPhaseTwo's `/login` renders `<button>Login</button>`, while Azure AD
 * uses `<input type="submit">` (`#idSIButton9`) labelled Next / Sign in. A selector that knows
 * only Microsoft's button silently does nothing on the first page — the email gets typed,
 * nothing is submitted, and the flow stalls. Verified live 2026-08-31.
 */
const SUBMIT_SELECTOR = [
  'input[type="submit"]',
  '#idSIButton9',
  'button:has-text("Login")',
  'button:has-text("Next")',
  'button:has-text("Sign in")',
].join(', ');

/** End states that need no further interaction to interpret. */
export type SignInBlocker =
  | 'password-change-required'
  | 'mfa-enrolment-required'
  | 'mfa-challenge'
  | 'credential-rejected'
  | 'no-vannbrosphasetwo-access';

const BLOCKING_SCREENS: ReadonlyArray<{ blocker: SignInBlocker; pattern: RegExp }> = [
  {
    blocker: 'password-change-required',
    pattern: /update your password|your password has expired/i,
  },
  {
    // Azure AD's ENROLMENT wizard — the account has no second factor registered at all. It
    // cannot be completed by automation: registering one permanently changes the account.
    blocker: 'mfa-enrolment-required',
    pattern: /let's keep your account secure|more information required|action required to keep your account secure/i,
  },
  {
    blocker: 'mfa-challenge',
    pattern: /approve sign in request|enter the code displayed|verify your identity/i,
  },
  {
    blocker: 'credential-rejected',
    pattern: /your account or password is incorrect|didn't recognize|couldn't find an account/i,
  },
  {
    blocker: 'no-vannbrosphasetwo-access',
    pattern: /not provisioned|no access|access denied|unauthori[sz]ed/i,
  },
];

/** Classify the current page against the known dead-end sign-in screens. */
export async function classifyBlocker(page: Page): Promise<SignInBlocker | null> {
  const body = await page.locator('body').innerText().catch(() => '');
  return BLOCKING_SCREENS.find((screen) => screen.pattern.test(body))?.blocker ?? null;
}

/** Resolve whichever of the given locators becomes visible first; null if none do in time. */
async function firstVisible(candidates: Locator[], timeout: number): Promise<Locator | null> {
  try {
    return await Promise.any(
      candidates.map(async (locator) => {
        await locator.waitFor({ state: 'visible', timeout });
        return locator;
      }),
    );
  } catch {
    return null;
  }
}

/**
 * Walk the sign-in flow with a stored credential.
 * `onIncomplete` is called when the flow hits something it does not recognise.
 */
export async function signIn(
  page: Page,
  credential: Credential,
  onIncomplete?: (reason: string) => void,
): Promise<void> {
  const deadline = Date.now() + LOGIN_BUDGET_MS;
  const remaining = () => Math.max(0, Math.min(STEP_TIMEOUT_MS, deadline - Date.now()));
  const submit = () => page.locator(SUBMIT_SELECTOR).first();
  const emailBox = () => page.locator('input[type="email"], input[name="loginfmt"]').first();
  // Azure AD's email prompt ONLY. VannBrosPhaseTwo's own `/login` field is also `input[type="email"]`
  // and stays on screen behind the environment dialog, so the general `emailBox()` above
  // cannot tell the two apart: when the dialog was slow to appear, stage 3 matched the app's
  // own field, re-submitted it, and then waited out the budget for a password prompt that was
  // never coming — leaving the setup to fall through to its six-minute human-assisted wait.
  // Microsoft names the field `loginfmt` on every tenant. Verified live 2026-09-14.
  const adEmailBox = () => page.locator('input[name="loginfmt"]').first();
  const passwordBox = () => page.locator('input[type="password"], input[name="passwd"]').first();

  try {
    await page.goto(routeUrl(routes.login), { waitUntil: 'domcontentloaded', timeout: 60_000 });

    // Stage 1 — VannBrosPhaseTwo's own login page.
    const appEmail = await firstVisible([emailBox()], remaining());
    if (!appEmail) throw new Error('no email field on /login');
    await appEmail.fill(credential.username);
    await submit().click();

    // Stage 2 — the environment picker, when this account sees one.
    // The dialog is the normal path, so give it the full step budget rather than a clipped
    // window — skipping it early is what used to send stage 3 back to the app's own login.
    const dialog = page.getByRole('dialog');
    if (await firstVisible([dialog], remaining())) {
      await dialog.locator('button.dropdown-toggle').first().click();
      await page
        .locator('#myDropdown.show .dropdown-item')
        .filter({ hasText: QA_ENVIRONMENT_LABEL })
        .first()
        .click();
      const confirm = dialog.getByRole('button', { name: 'Login', exact: true });
      await expect(confirm).toBeEnabled({ timeout: 10_000 });
      await confirm.click();
    }

    // Stage 3 — Azure AD. It may re-prompt for the email before the password, so accept
    // whichever of the two lands first rather than assuming an order. Both locators are
    // Azure-AD-specific: see `adEmailBox` for why matching the app's own field here is the
    // failure mode this guards against.
    const next = await firstVisible([passwordBox(), adEmailBox()], remaining());
    if (!next) throw new Error('neither password nor Azure AD email prompt appeared');

    if ((await next.getAttribute('type')) !== 'password') {
      await next.fill(credential.username);
      await submit().click();
      const password = await firstVisible([passwordBox()], remaining());
      if (!password) throw new Error('no password field after the email step');
      await password.fill(credential.password);
    } else {
      await next.fill(credential.password);
    }
    await submit().click();

    // Stage 4 — "Stay signed in?". Optional; answering yes yields the longer-lived cookie.
    const stay = await firstVisible(
      [page.getByRole('heading', { name: /stay signed in/i })],
      Math.min(10_000, remaining()),
    );
    if (stay) await submit().click();
  } catch (error) {
    onIncomplete?.((error as Error).message.split('\n')[0]);
  }
}

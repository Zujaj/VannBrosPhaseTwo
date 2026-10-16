# Test Plan — Login Page

> Smoke-scope plan: exercises only the public `/login` entry point, not the authenticated
> app behind it. Written to verify the `playwright-cli` attach/resume/snapshot mechanics
> post-MCP-to-CLI migration — kept intentionally small (3 scenarios).

- **Spec:** `playwright/tests/public/login.spec.ts` (existing spec covers page-load /
  unauthenticated-redirect only; the three scenarios below are not yet automated as a full
  sign-in flow)
- **Automation status:** **Not automated.** `login.spec.ts` today only asserts `/login` loads
  and that unauthenticated hits to `/maps` redirect back to it — it does not drive the actual
  email → environment → Azure AD steps below. Authenticated specs are expected to reuse
  `storageState` per `pnpm auth:qa` and must **never** log in inline (see
  `vannbrosphasetwo-playwright` skill, Non-negotiable rule 2); these scenarios therefore stay
  manual/exploratory unless a dedicated, non-mutating login spec is deliberately added.
- **Source of truth:** live QA app at `https://agrierp-vann-qa.folio3.site/login`
  (verified live 2026-10-16 via `playwright-cli`); `playwright/tests/helpers/signIn.ts` and
  `playwright/tests/auth.setup.ts` (the scripted sign-in walk used by `pnpm auth:qa`);
  `playwright/tests/constants/routes.ts` (`routes.login`, `ENVIRONMENT_LABEL`).
- **Last updated:** 2026-10-16

**Scope:** The VannBrosPhaseTwo `/login` page only — an email-first flow that hands off to an
auth-gateway "Choose Environment" dialog and then Azure AD. Happy path, invalid credentials,
and empty/invalid email validation. Nothing behind login (maps, work orders, settings, etc.)
is in scope.

> ✅ **Verified live 2026-10-16:**
> - `/login` renders only a **textbox "Email"** and a **button "Login"** (plus a "Contact Us"
>   link) — no password field on this page.
> - **Login** is **disabled** while the Email field is empty, and stays **disabled** for a
>   malformed value (verified with `notanemail` — no `@`/domain). It becomes **enabled** as
>   soon as a well-formed email (e.g. `name@domain.com`) is entered.
> - No inline validation message was observed in the DOM for a malformed email in this pass —
>   the only observable signal is that **Login** remains disabled. If a later pass finds an
>   inline error string, prefer asserting that text and flag this note as stale.
> - Submitting a valid-looking email opens the auth gateway's **"Choose Environment"** dialog
>   (`getByRole('dialog')`), offering **`Vann Brothers - QA`**, **`Vann Brothers - Dev`**, and
>   **`AgriERP D365 Internal - Demo`** — the dialog's own **Login** button stays disabled until
>   an option is picked. Picking the wrong one authenticates against the wrong tenant without
>   failing any host-based guard, so `Vann Brothers - QA` must be selected explicitly.
> - After confirming the environment, control passes to **Azure AD** (a different origin):
>   email re-prompt (field `name="loginfmt"`) if not pre-filled, then a password field
>   (`input[type="password"]`), then an optional **"Stay signed in?"** interstitial.
> - A rejected credential at the Azure AD step surfaces body text matching
>   `your account or password is incorrect` / `didn't recognize` / `couldn't find an account`
>   (see `signIn.ts`'s `credential-rejected` pattern) and keeps the user on the Azure AD
>   sign-in screen — no redirect back to the app.
> - A successful pass redirects to the app's `/maps` route and the app then asynchronously
>   writes `seasonId`/`seasonName` into `localStorage`.

---

## TC-1 — Happy path: sign in with valid credentials

| Field | Content |
|---|---|
| **ID** | LOGIN-001 |
| **Title** | Valid email + correct environment + correct Azure AD password reaches the app |
| **Module** | Login |
| **Role** | Any provisioned VannBrosPhaseTwo QA account |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged out (fresh/blank storage state); account is active, not MFA-enrolled, password not expired |
| **Steps** | 1. Navigate to `/login`. 2. Type a valid, provisioned account email into **Email**. 3. Confirm **Login** becomes enabled, then click it. 4. In the **Choose Environment** dialog, select **`Vann Brothers - QA`**, then click the dialog's **Login** button. 5. On the Azure AD screen, enter the account's email (if re-prompted) and its correct password, then submit. 6. If the **"Stay signed in?"** interstitial appears, choose either option (e.g. **No**). |
| **Test data** | A provisioned QA account's email + its correct Azure AD password (never hardcoded in a spec — sourced from the repo's credential store per the `vannbrosphasetwo-playwright` skill) |
| **Expected result** | Browser lands on `/maps` (`routes.maps.root`); no error text is shown at any step; the app subsequently stores a live `seasonId`/`seasonName` in `localStorage`. |
| **Type** | Smoke / Functional (Happy path) |
| **Automation** | Not automated as a spec — covered today only by the human/credential-assisted `pnpm auth:qa` bootstrap (`tests/auth.setup.ts` + `tests/helpers/signIn.ts`), which exists to produce `storageState`, not to assert the login UI itself. |

---

## TC-2 — Invalid credentials (negative)

| Field | Content |
|---|---|
| **ID** | LOGIN-002 |
| **Title** | Correct email but wrong password is rejected at Azure AD |
| **Module** | Login |
| **Role** | Any provisioned VannBrosPhaseTwo QA account |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Logged out (fresh/blank storage state) |
| **Steps** | 1. Navigate to `/login`. 2. Type a valid, provisioned account email into **Email** and click **Login**. 3. In the **Choose Environment** dialog, select **`Vann Brothers - QA`** and confirm. 4. On the Azure AD screen, enter the account's email (if re-prompted) and an **incorrect** password, then submit. |
| **Test data** | A provisioned QA account's email + a deliberately wrong password (e.g. append a character) |
| **Expected result** | Azure AD re-renders its sign-in screen with an error matching "Your account or password is incorrect" (or "We didn't recognize..."); the browser stays on the Azure AD origin — **no** redirect to `/maps`; no VannBrosPhaseTwo session/storage state is created. |
| **Type** | Negative |
| **Automation** | Not automated — would need to run against Azure AD directly; `signIn.ts` already classifies this exact screen as the `credential-rejected` blocker when it's hit unexpectedly during `pnpm auth:qa`. |

---

## TC-3 — Empty / malformed email validation (negative)

| Field | Content |
|---|---|
| **ID** | LOGIN-003 |
| **Title** | Login stays disabled for an empty or malformed Email field |
| **Module** | Login |
| **Role** | N/A (unauthenticated) |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | On a fresh `/login` page, logged out |
| **Steps** | 1. Navigate to `/login`. 2. Observe **Login** with the **Email** field empty. 3. Type a malformed value with no `@`/domain (e.g. `notanemail`) into **Email**, then move focus away (Tab). 4. Clear the field and type a well-formed email (e.g. `name@example.com`). |
| **Test data** | Malformed string `notanemail`; well-formed email `name@example.com` |
| **Expected result** | Step 2: **Login** button is `disabled`. Step 3: **Login** remains `disabled` after the malformed value is entered and the field loses focus. Step 4: **Login** becomes `enabled` once a well-formed email is present — confirming the control is gated on email format, not just non-empty. |
| **Type** | Negative / Validation |
| **Automation** | Not automated; straightforward to automate non-mutating (no submission, no credentials needed) — a good first candidate for a real `login.spec.ts` addition. |

---

## `playwright-cli` mechanics check (for this planning session)

Run purely to confirm the attach/resume/snapshot workflow after the MCP→CLI migration — not
part of the product test plan above:

1. `PLAYWRIGHT_HTML_OPEN=never npx playwright test tests/public/login.spec.ts -g "login page loads" --project=chromium-guest --debug=cli` (background) → printed `tw-22aa9a`, then (second run) `tw-cf01c2`.
2. `playwright-cli attach tw-22aa9a` — attached successfully, returned the paused state (`about:blank`, paused before `page.goto('/login')`).
3. `playwright-cli -s=tw-22aa9a resume` — the underlying background test completed and passed (`1 passed`); the CLI reported `Error: Session closed` only because the browser/worker had already exited by the time the resume call reached it (test was a single `goto` + `expect`, nothing left to pause on).
4. Re-ran with a second session (`tw-cf01c2`) and used `playwright-cli -s=tw-cf01c2 step-over` instead of `resume`, which stopped right after the navigation, landing on the live `https://agrierp-vann-qa.folio3.site/login` page (paused at the `toHaveURL` assertion) — step-over works as the finer-grained alternative to resume.
5. `playwright-cli -s=tw-cf01c2 snapshot` — returned a real accessibility-tree snapshot of the live login page (Email textbox, disabled Login button, Contact Us link), confirming snapshot works end-to-end.
6. `playwright-cli -s=tw-cf01c2 fill e16 "notanemail"` then `snapshot` — confirmed Login stayed disabled; `fill e16 "claudeqa-dynamics@folio3.com"` then `snapshot` — confirmed Login became enabled. No credentials were submitted; the dialog/Azure AD hand-off was not driven, per the "do not explore other flows" scope for this check.
7. `playwright-cli -s=tw-cf01c2 close` — closed the session cleanly; the background test process was then stopped.

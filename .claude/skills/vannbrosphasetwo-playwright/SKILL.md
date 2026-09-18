---
name: vannbrosphasetwo-playwright
description: >-
  Author and maintain Playwright end-to-end tests for the VannBrosPhaseTwo Farm web app
  in this repo. Use whenever the task is to write, fix, or extend automated UI /
  E2E / browser tests for VannBrosPhaseTwo flows — login, maps, work orders (planned,
  tank-mix, inspection), template management, observations, communication
  center, user management — including adding routes, page interactions,
  assertions, or new spec files under tests/. Trigger on phrases like "write an
  e2e test", "add a Playwright test for the work order flow", "automate the
  inspection template screen", "test the VannBrosPhaseTwo login", even if "Playwright" is
  not named. Pull the exact UI labels and navigation from the vannbrosphasetwo-knowledge
  skill; pull repo conventions (auth, routes, projects) from this skill.
---

# VannBrosPhaseTwo Playwright Tests

Write E2E tests for the VannBrosPhaseTwo Farm web app that fit this repo's existing harness. **Read the `vannbrosphasetwo-knowledge` skill first** for exact screen names, nav labels, field names, statuses, and toasts — tests must assert against the real wording, and the knowledge skill is the source of truth for it.

## Repo layout & conventions (learn these before writing)

- **Config:** `playwright.config.ts`. `baseURL` = `https://agrierp-vann-qa.folio3.site` (QA only). Browser = Desktop Firefox. Reporter = html.
- **Projects:**
  - `setup` — runs `tests/auth.setup.ts` (headed, human-assisted Microsoft/Azure login), saves storage state to `playwright/.auth/auth-session.json`.
  - `firefox` — runs `tests/authenticated/**`, depends on `setup`, loads the saved `storageState`.
  - `firefox-guest` — runs `tests/public/**` with an empty storage state (no auth).
- **Routes:** centralized in `tests/constants/routes.ts` (`QA_BASE_URL`, `QA_HOST`, `routes`, `routeUrl()`). `routes` groups related paths under a nested object with a `root` key (e.g. `routes.workorders.root`, `routes.maps.root`) — only single, ungrouped paths stay flat (e.g. `routes.login`, `routes.messaging`). `routeUrl()` resolves a path to an absolute URL, needed only where code compares against `page.url()`'s absolute form (e.g. `waitForURL`); specs just pass `routes.x` straight into `page.goto`/`toHaveURL` since `baseURL` is set in config. **Add every new path here**, never hardcode URLs in specs.
- **Helpers:** `tests/helpers/auth.ts` — `assertQaOnly`, `checkAbortPatterns`, `probeAuthenticated`, `sessionSeasonValid`, `ensureDir`, `captureFailure`, `log`, etc.
- **Existing specs:** `tests/public/login.spec.ts`, `tests/authenticated/maps.spec.ts`. Match their style.
- **Scripts:** `pnpm auth:qa` (bootstrap session), `pnpm test:public`, `pnpm test:authed`, `pnpm test`, `pnpm test:ui`, `pnpm test:headed`.

## Where a new spec goes

| The flow… | needs auth? | put the spec in | runs under project |
|---|---|---|---|
| Login page, unauthenticated redirects | no | `tests/public/` | `firefox-guest` |
| Anything behind login (work orders, templates, maps content, settings) | yes | `tests/authenticated/` | `firefox` (reuses saved session) |

Authenticated specs assume the session already exists (the `setup` project provides it). Do **not** re-implement login inside a spec — rely on `storageState`.

**Season-expiry gotcha (verified live 2026-06-18).** The app stores Site/Season context in
localStorage as expiry-wrapped values (`{"_expired": <epoch ms>, "_value": ...}`) with a
**short, same-day TTL** — independent of the auth token. A stored session can therefore still
authenticate against `/maps` while its Season has already **expired**. When that happens the
app shows a `Season details not found in storage` warning and serves **degraded data** (e.g.
empty/limited plot pickers), so specs silently run against a no-season state. `auth.setup.ts`
guards this with `sessionSeasonValid(AUTH_FILE)`: a season-expired session is treated as
unusable and re-bootstrapped. If authed specs start failing on missing data or that warning,
run `pnpm auth:qa` to mint a fresh, season-bearing session. (This is **separate** from the
plot-modal title: re-verified 2026-08-26, both Planned and Inspection now show `Select Plots`
regardless of Season and WO-type — the plot add trigger itself is titled `Add Plot`, not the
former `Add Block`.)

## Non-negotiable rules

1. **QA only.** Never point a test at any host other than `agrierp-vann-qa.folio3.site`. Use `routes`/`routeUrl()`; if you must validate a URL, reuse `assertQaOnly`. This is a guardrail in the existing helpers — keep it.
2. **No credentials in code.** Login is human-assisted in the `setup` project and persisted as storage state. Never embed usernames/passwords/tokens in specs or commit `playwright/.auth/`.
3. **Add new paths to `tests/constants/routes.ts`**, then import them. Keep one source of truth for routes.
4. **Assert on real wording** from `vannbrosphasetwo-knowledge` (e.g. button `Create New Work Orders`, toast `Template created successfully`, chip `Review`). Wrong labels = false greens.
5. Prefer Playwright's accessible/role-based locators (`getByRole`, `getByLabel`, `getByText`) over brittle CSS/XPath. Use exact label text from the knowledge refs.

## App-wide flake gotcha: the truck loader & toasts intercept clicks

This SPA shows a full-screen lottie overlay (`#f3-overlay-loader`, the "truck loader") during
every fetch, and ngx-toastr notifications (`.overlay-container .toast-container .toast`)
position themselves over the form. **Both intercept pointer events**, so a click fired while
either is up is silently dropped (`...subtree intercepts pointer events`) — the dominant source
of flake in authed specs. A bare `waitForLoaderGone()` + `click()` is **not** atomic: a fetch
can re-show the overlay in the gap. These waits live on page objects (see below):
- `BasePage.waitForLoaderGone()` / `waitForToastsGone()` (`tests/pages/base.page.ts`) — settle
  the overlay/toasts first.
- `BasePage.clickPastLoader(target, confirm)` (protected, used internally by `WorkOrdersPage`) —
  retries the clear → click → confirm sequence via `expect.toPass()`, so a re-appearing loader
  costs a retry, not a failure; `confirm` must assert the click's observable effect (modal
  opened/closed) so an eaten click loops.

### Page objects

Authenticated flows use a lightweight Page Object Model, not raw locators scattered in specs:

- `tests/pages/base.page.ts` — `BasePage`: loader/toast waits shared by every screen.
- `tests/pages/work-orders.page.ts` — `WorkOrdersPage extends BasePage`: Work Order list/Create
  form actions (`openCreateForm`, `selectFromDropdown`, `addFirstFromModal`,
  `applyFirstMaterialTemplate`, `submitAndConfirm`), plus the standalone `savedToast()` assertion
  helper (not a page action — import it directly, not off the fixture).
- `tests/fixtures.ts` — extends the base Playwright `test` with a `workOrdersPage` fixture.
  Specs that need it import `{ test, expect }` from `'../fixtures'` (not `'@playwright/test'`)
  and take `workOrdersPage` as a test arg; specs with no page-object needs (`maps.spec.ts`,
  `login.spec.ts`) keep importing straight from `'@playwright/test'` — don't force the fixture
  where a bare `page.goto` + assertion suffices.

Adding a new authenticated screen with real interaction logic (not just a `goto`/`expect`)?
Add a `XyzPage extends BasePage` class in `tests/pages/`, register it in `tests/fixtures.ts`,
and consume it from the spec — don't reintroduce standalone exported functions.

Full create flows chain many such clicks on a slow shared QA env, so `@mutating` WO specs set
`test.setTimeout(240000)`. Failures still correlate with QA-env degradation, not test logic —
the config's `retries: 1` is the safety net for that; do not paper over a real race by raising
retries.

## Workflow to add a test

1. Identify the flow and read the matching `vannbrosphasetwo-knowledge` reference (e.g. `references/work-orders.md`) for nav path, field labels, required fields, and the success toast/status to assert.
2. Add any new route(s) to `tests/constants/routes.ts`.
3. Create the spec in `tests/public/` or `tests/authenticated/` per the table above.
4. Build the flow with role/label locators; assert the meaningful end state (URL, toast, new row, status chip) — not just that a button exists.
5. Run it: `pnpm test:authed` (authed) or `pnpm test:public` (public). First-ever authed run needs `pnpm auth:qa` once to mint the session.
6. On flake, prefer web-first assertions (`await expect(locator).toBeVisible()`) and `waitForURL` over fixed timeouts.

## Example: authenticated work-order list spec

```ts
import { test, expect } from '@playwright/test';
import { routes } from '../constants/routes';

// session is provided by the `setup` project via storageState
test('work orders list loads and shows status filters', async ({ page }) => {
  await page.goto(routes.workorders.root);
  await expect(page).toHaveURL(routes.workorders.root);

  // top-level tabs (see vannbrosphasetwo-knowledge/references/work-orders.md)
  await expect(page.getByRole('tab', { name: 'Inspection Work Orders' })).toBeVisible();

  // lifecycle status chips
  for (const chip of ['Queue', 'Draft', 'To Do', 'In Progress', 'Review', 'Done']) {
    await expect(page.getByText(chip, { exact: true }).first()).toBeVisible();
  }
});
```

Adjust locators to the live DOM — confirm exact roles/labels against the running QA app (the `playwright-cli` skill can drive a live browser to discover selectors). Keep assertions tied to the documented wording.

## When the app contradicts the knowledge base

If the live QA app uses different wording or a changed flow, the **app is correct** — write the test to the live behavior and tell the user the `vannbrosphasetwo-knowledge` reference is stale so it can be updated. Don't force a test to match outdated docs.

## Playwright agents (planner / generator / healer)

This repo ships three Playwright subagents at root `.claude/agents/` plus the `playwright-test` MCP server (root `.mcp.json`, runs `playwright/node_modules/.bin/playwright run-test-mcp-server --config playwright`). **Launch Claude Code from the repo root** so the agents and MCP load. They drive a live browser against the QA app to author and repair tests.

- **`playwright-test-planner`** — explores a flow in the browser and writes a test plan.
- **`playwright-test-generator`** — turns one plan item into a spec via MCP browser tools.
- **`playwright-test-healer`** — runs failing tests and fixes them.

Starter prompts in root `.claude/prompts/` (`playwright-test-plan`, `-generate`, `-heal`, `-coverage`); edit the task text and paths before running.

**These agents run on their own generic instructions and do NOT auto-load this skill.** Their raw output ignores repo conventions, so the orchestrating thread must enforce them:

- **Plans → `playwright/test-plans/{authenticated,public}/<flow>.md`**, matching the existing plan files. Do **not** use a `specs/` folder. Match the format of `test-plans/authenticated/work-orders-*.md` (WO ids, automation status, `vannbrosphasetwo-knowledge` source link).
- **Generated specs → `playwright/tests/public/` or `playwright/tests/authenticated/`** per the auth-context table above — never a flat `tests/<topic>/` path.
- **Reconcile every generated spec to the Non-negotiable rules** before keeping it: routes centralized in `tests/constants/routes.ts`, authed specs reuse `storageState` (no inline login), QA host only, role/label locators, assertions on real wording from `vannbrosphasetwo-knowledge`. Agent drafts are a starting point — review and rewrite to convention; do not commit raw output.
- The MCP test runner is scoped to `playwright/` via `--config playwright`; `test_run`/`test_list` operate there.

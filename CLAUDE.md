# VannBrosPhaseTwo Monorepo

QA + documentation workspace for **VannBrosPhaseTwo**, the Folio3 agriculture ERP (Dynamics 365
based). This repo does **not** contain the application source — it holds the end-to-end
tests, the documentation site, and the product reference manuals for that application.
The live app under test runs at the QA env `https://agrierp-vann-qa.folio3.site`
(tenant: "Vann Brothers" / VBS).

Loose monorepo of independent packages — **no root `package.json`**, no workspace tool.
Each top-level directory is its own **pnpm** project (own `pnpm-lock.yaml`) — install and
run inside it. Use `pnpm` everywhere; do not use `npm` or `yarn` (stray `package-lock.json`
or `yarn.lock` files should be removed).

## Repository layout

- **`playwright/`** — End-to-end UI tests (package `vannbrosphasetwo`, pnpm, CommonJS).
  - Stack: `@playwright/test` ^1.60, TypeScript, **Chromium + Firefox** device profiles.
  - `playwright.config.ts` defines five projects:
    - `setup` — runs `tests/auth.setup.ts`, logs in **per role**, writes `.auth/<role>.json`.
    - `chromium` / `firefox` — authenticated specs under `tests/authenticated/`, depend on
      `setup`, reuse `.auth/admin.json`. Chromium is primary (the regression workbook scopes
      the web suite to a Chromium-based browser); Firefox is the second engine.
    - `chromium-guest` / `firefox-guest` — public specs under `tests/public/`, empty storage.
  - Test tree: `tests/{public,authenticated,pages,constants,helpers}`. Shared route constants
    in `tests/constants/routes.ts`; the role registry in `tests/constants/roles.ts`; auth
    helpers in `tests/helpers/auth.ts`; page objects in `tests/pages/`.
  - `baseURL` = QA env; `outputDir` → `test-results/`, HTML report → `playwright-report/`.
  - Test plans in `test-plans/{authenticated,public}/` (markdown, mirror the spec path).
  - `api/` — small REST client for scripts that act on QA data directly (`client.mts`, plus
    per-area helpers like `work-orders.mts`). Swagger:
    `https://agrierp-vann-api-qa.folio3.site/swagger`. QA hosts only. It needs a token from a
    person: `VANNBROSPHASETWO_API_TOKEN` or the gitignored `.auth/qa_refresh_token.txt` (plain text,
    one line). The token is the web app's Firebase ID token (a JWT) and expires after about an
    hour. The short token from `POST /api/Auth/signin` gets 401 everywhere. To fetch a fresh one:
    log in to the QA site as `rffcropplanner`, open the browser console's **Network** tab filtered
    to **Fetch/XHR**, visit any existing work order (e.g. `/workorders/31293`), then open that
    `31293` request and copy the token out of its `Authorization` request header. ESM `.mts`, so
    scripts can import it but the CommonJS specs cannot.
  - **Traceability:** specs tag the regression workbook's own IDs in the test title —
    `@TC:<id>` (whole expected result asserted) or `@TC-partial:<id>` (flow automated, part of
    the expected result still unasserted). `pnpm coverage` reports against
    `test-plans/catalog/web-cases.json` and fails on a tag that matches no case. Regenerate
    the catalogue with `pnpm catalog` when the workbook's scope changes.
- **`documentation/`** — Docusaurus 3.10 site (package `vannbrosphasetwo-documentation`, **pnpm**, React 19, TypeScript).
  - Content under `docs/`; navigation in `sidebars.ts`; site config in `docusaurus.config.ts`.
  - PDF export via `scripts/generate-pdf.ts`.
- **`resources/`** — Authoritative product PDFs: `VBPhaseTwo Introduction.pdf` and
  `user-manuals/*.pdf`. **Source of truth** for exact UI labels, steps, statuses, flows.
  Mirror them — don't invent behavior.
- **`.claude/skills/`** — Project skills: `vannbrosphasetwo-knowledge` (product/domain reference),
  `vannbrosphasetwo-docs`, `vannbrosphasetwo-playwright`, `vannbrosphasetwo-test-cases`, `vannbrosphasetwo-vann-api-qa` (REST API
  reference, with the backend's Swagger spec in its `openapi.json`). Consult
  `vannbrosphasetwo-knowledge` for any product fact before authoring tests or docs.
- **`.claude/agents/`** — Playwright test subagents (`playwright-test-planner`,
  `-generator`, `-healer`), with starter prompts in `.claude/prompts/`. Driven by the
  `playwright-test` MCP server in root **`.mcp.json`** (runs
  `playwright/node_modules/.bin/playwright run-test-mcp-server --config playwright`).
  **Launch Claude Code from the repo root** for agents + MCP to load. See the
  `vannbrosphasetwo-playwright` skill for how their output must be reconciled to repo conventions.
- **`.cursor/`** — `rules/project.mdc`, `commands/` (`/create-pr`, `/create-issue`), `mcp.json`.

## Commands

Run inside the relevant package directory.

**`playwright/`** (pnpm) — all test scripts set `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`:
- `pnpm test` — run all tests.
- `pnpm auth:qa` — run `setup` to (re)generate auth sessions. `AUTH_ROLES=supervisor,farmhand
  pnpm auth:qa` bootstraps extra actors (one interactive SSO prompt each); default is `admin`.
- `pnpm test:authed` — authenticated specs, both engines. `pnpm test:chromium` / `:firefox`
  for one engine.
- `pnpm test:public` — guest specs only.
- `pnpm test:clean` — everything except `@mutating` (specs that create real work orders on the
  shared QA env with no teardown). Use before a UAT cycle.
- `pnpm seed:planned` / `seed:harvest` / `seed:tickets` — create real test data on QA:
  `pnpm seed:planned --count 5 --plots 10 --materials 2 --resources 3 --assets 2`,
  `pnpm seed:tickets --tickets 25 --pair "130:LIVINGSTON"` (harvest WOs have no materials).
  Prints what it created. Flags and limits: `scripts/seed.mts`; seed files: `tests/seed/`.
  `seed:planned --api` posts the same body straight to the API (`api/planned-work-order.mts`,
  needs the API token): seconds per WO instead of minutes. Very large WOs (e.g. 99 plots +
  50 materials + 50 assets) fail on the server either way; see `FINDINGS.md` #29.
- `pnpm wo:delete WO-1258 WO-1260 [--name TEXT] [--yes]` — delete work orders through the API
  (e.g. seed leftovers). A dry run unless `--yes` is given. Needs the API token (see `api/`).
- `pnpm api:smoke [--count N] [--location N] [--season N]` — read-only check that the API token
  works: lists N work orders (default 2) and reads each one's Summary. Run it after pasting a
  fresh token. Never prints the token.
- `pnpm typecheck` · `pnpm catalog` · `pnpm coverage[:write]`.
- `pnpm test:ui` / `test:headed` / `test:debug` — interactive variants.

**`documentation/`** (pnpm):
- `pnpm start` — dev server. `pnpm build` — static build. `pnpm serve:build` — serve build.
- `pnpm pdf` — build + export docs PDF via `scripts/generate-pdf.ts`.

`.npmrc` sets `ignore-scripts=true` for security (pnpm honors it). Only `node_modules/` is gitignored.

## Conventions

- **Authenticated tests need a valid session.** If `firefox` specs fail at login,
  regenerate with `pnpm auth:qa`. Never commit `.auth/` or other secrets.
- **Place specs by auth context:** public/unauthenticated → `tests/public/`, logged-in →
  `tests/authenticated/`. Add shared URLs to `tests/constants/routes.ts`, not inline.
- **Use the QA env and VBS tenant** for all flows; pull exact UI labels, navigation paths,
  entity statuses, role permissions from `resources/` manuals or the `vannbrosphasetwo-knowledge`
  skill rather than guessing.
- **Docs changes** go in `documentation/docs/*.md(x)` and must be registered in `sidebars.ts`.
  Keep wording aligned with the user manuals.
- **API contract** lives in the `vannbrosphasetwo-vann-api-qa` skill. Its `openapi.json` is the
  source of truth for endpoints, params and request schemas (the spec does not describe
  responses; the skill records their observed shapes). When the backend changes, run
  `.claude/skills/vannbrosphasetwo-vann-api-qa/scripts/refresh.sh` from the repo root. It re-downloads
  the spec and regenerates the skill's `reference/*.md` and tag index, so never hand-edit those.
- Keep both packages' dependencies and lockfiles independent; install per package.

## Domain (VannBrosPhaseTwo)

Agriculture ERP on Dynamics 365. Core areas the tests and docs cover:

- **work orders** (planned, tank-mix, inspection, harvest — with submission/approval lifecycle)
- **harvest** (Harvest Work Orders sub-tab; Harvest Central harvest tickets)
- **template management** (inspection / material / attribute templates)
- **users, roles & resource groups**
- **journal & posting review** (transfer, return transfer, return item)
- **observations / points of interest (POI)**
- **communication center**
- **attendance**
- **maps**
- **planning**

When a task touches any of these, defer to the `vannbrosphasetwo-knowledge` skill and the matching
manual in `resources/user-manuals/`.

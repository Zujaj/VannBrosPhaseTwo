# VannBrosPhaseTwo Monorepo

QA + documentation workspace for **VannBrosPhaseTwo**, the Folio3 agriculture ERP (Dynamics 365
based). This repo does **not** contain the application source — it holds the end-to-end
tests, the documentation site, and the product reference manuals for that application.
The live app under test runs at the QA env `https://agrierp-vann-qa.folio3.site`
(tenant: "Vann Brothers" / VBS).

Loose monorepo of independent packages — **no root `package.json`**, no workspace tool.
Each top-level directory is its own **pnpm** project (own `pnpm-lock.yaml`) — install and
run inside it. Use `pnpm` everywhere; do not use `npm` or `yarn` (stray `package-lock.json`
or `yarn.lock` files should be removed). `.npmrc` sets `ignore-scripts=true` for security.

## Repository layout

- **`playwright/`** — End-to-end UI tests (Playwright, TypeScript, Chromium + Firefox), the
  `api/` REST client, seed/cleanup scripts, and test plans. Projects, commands, API token
  order and `@TC`/`@SMK` traceability tags: **`vannbrosphasetwo-playwright` skill**.
- **`documentation/`** — Docusaurus 3.10 site (pnpm, React 19, TypeScript). Content under
  `docs/`, navigation in `sidebars.ts`, config in `docusaurus.config.ts`, PDF export via
  `scripts/generate-pdf.ts`. Details: **`vannbrosphasetwo-docs` skill**.
- **`resources/`** — Authoritative product PDFs (`VB Phase Two Introduction.pdf`,
  `user-manuals/*.pdf`). **Source of truth** for exact UI labels, steps, statuses, flows.
  Mirror them — don't invent behavior. The `vannbrosphasetwo-knowledge` skill distils them;
  check it before opening a PDF, and read PDFs by page range, never whole.
- **`.claude/skills/`** — `vannbrosphasetwo-knowledge` (product facts; consult before authoring
  tests or docs), `-docs`, `-playwright`, `-test-cases`, `-vann-api-qa` (Farm App REST API),
  `-finops-api` (D365 F&O `F3Agri*` services).
- **`.claude/agents/`** — Playwright planner / generator / healer subagents, driven by the
  `playwright-test` MCP server in root `.mcp.json`; starter prompts in `.claude/prompts/`.
  **Launch Claude Code from the repo root** for them to load.

## Commands

- `playwright/`: `pnpm test:fast` (daily loop, Firefox, no retries) · `pnpm test:clean`
  (before a UAT cycle, skips `@mutating`) · `pnpm auth:qa` (refresh sessions) ·
  `pnpm typecheck`. Full list in the `vannbrosphasetwo-playwright` skill.
- `documentation/`: `pnpm start` · `pnpm build` · `pnpm serve:build` · `pnpm pdf`.

## Conventions

- **Authenticated tests need a valid session.** If authed specs fail at login, run
  `pnpm auth:qa`. Never commit `.auth/` or other secrets.
- **Place specs by auth context:** public → `tests/public/`, logged-in →
  `tests/authenticated/`. Add shared URLs to `tests/constants/routes.ts`, not inline.
- **Use the QA env and VBS tenant** for all flows; take exact UI labels, navigation paths,
  statuses and role permissions from `vannbrosphasetwo-knowledge` or `resources/`, never guess.
- **Docs changes** go in `documentation/docs/*.md(x)` and must be registered in `sidebars.ts`.
  Keep wording aligned with the user manuals.
- **API contract** lives in the `vannbrosphasetwo-vann-api-qa` skill; its `openapi.json` is the
  source of truth. When the backend changes, run
  `.claude/skills/vannbrosphasetwo-vann-api-qa/scripts/refresh.sh` from the repo root; it
  regenerates `reference/*.md` and the tag index, so never hand-edit those.
- Keep both packages' dependencies and lockfiles independent; install per package.
- **Keep context lean:** iterate on one spec with `pnpm test:fast -g "<title>" --reporter=line`
  rather than the MCP `test_run` tool; leave live-browser exploration (`browser_snapshot`) to the
  Playwright subagents; never read `openapi.json`, `_schemas.md` or test reports whole — grep them.

## Domain

Agriculture ERP on Dynamics 365: work orders (planned, tank-mix, inspection, harvest), Harvest
Central tickets, templates (inspection / material / attribute), users/roles/resource groups,
journal & posting review, observations/POI, communication center, attendance, maps, planning.
For any of these, defer to the `vannbrosphasetwo-knowledge` skill and the matching manual in
`resources/user-manuals/`.

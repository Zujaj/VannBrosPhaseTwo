# VannBrosPhaseTwo — QA

End-to-end tests, documentation site and product reference material for **VannBrosPhaseTwo**,
the Folio3 agriculture ERP built on Dynamics 365. The application source is **not** in this
repo; the tests run against the QA environment:

- App: <https://agrierp-vann-qa.folio3.site> (tenant **Vann Brothers** / VBS)
- API (Swagger): <https://agrierp-vann-api-qa.folio3.site/swagger>

## What's inside

| Path | What it is |
| --- | --- |
| [`playwright/`](playwright/) | Playwright + TypeScript end-to-end suite (Chromium and Firefox), a small REST client for QA data (`api/`), seed/cleanup scripts, test plans and coverage reports (`test-plans/`). How it fits together: [`playwright/ARCHITECTURE.md`](playwright/ARCHITECTURE.md). |
| [`documentation/`](documentation/) | Docusaurus 3 documentation site (user guides, flows) with PDF export. Pages live in `docs/`, navigation in `sidebars.ts`. |
| [`resources/`](resources/) | Source-of-truth product material: the Phase Two introduction, user manuals, product specifications, the smoke checklist and regression workbook. |
| [`.claude/`](.claude/) | Claude Code setup: project skills (product knowledge, API references, test/doc conventions, `playwright-cli`) and Playwright planner / generator / healer agents. |
| [`.github/`](.github/) | CI workflow, issue and PR templates. |

`playwright/` and `documentation/` are independent **pnpm** projects, each with its own
lockfile. There is no root `package.json`; install and run commands inside the package.

## Getting started

Prerequisites: [Node.js 22](https://nodejs.org/) (CI uses 22) and [pnpm 10+](https://pnpm.io/).
Use pnpm only — not npm or yarn.

### Tests

```bash
cd playwright
pnpm install
pnpm exec playwright install chromium firefox
pnpm auth:qa        # create or refresh the QA login session (first run may ask you to finish SSO)
pnpm test:fast      # daily loop: Firefox, no retries
```

| Command | Use it to |
| --- | --- |
| `pnpm test:clean` | Run both engines without `@mutating` specs. Use before a UAT cycle. |
| `pnpm test:public` | Run only the specs that need no login. |
| `pnpm typecheck` | Type-check the suite. |
| `pnpm coverage` | Report coverage against the regression workbook. |

> **`@mutating` specs and the `seed:*` scripts create real records on the shared QA
> environment** and don't clean up. `pnpm wo:delete` removes seeded work orders.

The full command list, with flags, is in `playwright/package.json` and explained in
[`playwright/ARCHITECTURE.md`](playwright/ARCHITECTURE.md#6-commands).

### Documentation site

```bash
cd documentation
pnpm install
pnpm start          # local dev server
pnpm build          # production build; `pnpm serve:build` previews it
pnpm pdf            # export the docs to PDF
```

## Conventions

- **QA by default.** Specs and scripts target QA. UAT takes the smoke suite only, through the
  explicit `TARGET_ENV=uat` opt-in (`pnpm auth:uat`, then `pnpm test:smoke:uat`). Production is
  read-only.
- **No secrets in git.** Sessions and tokens live in the gitignored `playwright/.auth/`.
- **Mirror the manuals.** UI labels, steps and statuses in tests and docs come from
  `resources/` (distilled in `.claude/skills/vannbrosphasetwo-knowledge/`). Don't invent behavior.
- **Traceability.** Specs tag the regression workbook's IDs in their titles (`@TC:<id>`,
  `@TC-partial:<id>`, `@SMK:<id>`); `pnpm coverage` and `pnpm smoke:coverage` fail on
  unknown tags.

## CI

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on changes under
`playwright/`: type check, coverage check and the guest specs, then the authenticated specs on
Chromium (`@mutating` excluded) when the QA account secrets are available.

## Working with Claude Code

Launch Claude Code from the repo root so the project skills and the Playwright planner /
generator / healer agents load. There is no MCP server: the agents and manual exploration drive
the browser with the `playwright-cli` skill (`.claude/skills/playwright-cli/`), run from
`playwright/` in Firefox. [`CLAUDE.md`](CLAUDE.md) has the agent-facing instructions.

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
| [`resources/`](resources/) | Source-of-truth product material: the Phase Two introduction, user manuals, product specifications, the smoke checklist and regression workbook. |
| [`.claude/`](.claude/) | Claude Code setup: project skills (product knowledge, API references, test/doc conventions) and Playwright planner / generator / healer agents. |
| [`.bitbucket/`](.bitbucket/) | PR and bug-report templates (see its README for where each goes). CI is [`bitbucket-pipelines.yml`](bitbucket-pipelines.yml). |

The `playwright/` is an independent **pnpm** project with its own
lockfile. There is no root `package.json`; install and run commands inside the package.

## Getting started

Prerequisites: [Node.js 22.18+](https://nodejs.org/) (the `.mts` scripts rely on native type
stripping) and pnpm 12 (`corepack enable` picks the version pinned in each `package.json`).
Use pnpm only — not npm or yarn.

```bash
git clone https://bitbucket.org/folio3/vbagrierp.git
cd vbagrierp
```

### Windows

Works on Windows natively, WSL or not:

- Each package's `pnpm-workspace.yaml` sets `shellEmulator: true`, so `VAR=1 cmd` scripts run
  under cmd/PowerShell too.
- `.gitattributes` forces LF on checkout; leave `core.autocrlf` alone.
- Install [Git for Windows](https://git-scm.com/download/win) (Claude Code runs the project's
  typecheck hook through Git Bash) and `jq` (`winget install jqlang.jq`).
- `pnpm catalog` / `pnpm smoke:catalog` call `python3`; on Windows install Python 3 and make sure
  `python3` resolves (or run `py scripts/extract-cases.py`). The `.claude/skills/*/scripts/refresh.sh`
  scripts need Git Bash.

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

## Conventions

- **QA only.** Tests and scripts refuse non-QA hosts; keep it that way.
- **No secrets in git.** Sessions and tokens live in the gitignored `playwright/.auth/`.
- **Mirror the manuals.** UI labels, steps and statuses in tests and docs come from
  `resources/` (distilled in `.claude/skills/vannbrosphasetwo-knowledge/`). Don't invent behavior.
- **Traceability.** Specs tag the regression workbook's IDs in their titles (`@TC:<id>`,
  `@TC-partial:<id>`, `@SMK:<id>`); `pnpm coverage` and `pnpm smoke:coverage` fail on
  unknown tags.

## CI

[`bitbucket-pipelines.yml`](bitbucket-pipelines.yml) runs on pull requests and pushes to `main`
that touch `playwright/`: type check, coverage check and the guest specs, then (on `main`) the
authenticated specs on Chromium (`@mutating` excluded) when the QA account credentials are set as
secured Repository variables (`VANNBROSPHASETWO_<ROLE>_USER` / `_PASS`). Run it by hand from
Pipelines > Run pipeline > `custom: playwright`.

## Working with Claude Code

Launch Claude Code from the repo root so the project skills, agents and the `playwright-test`
MCP server load. [`CLAUDE.md`](CLAUDE.md) has the agent-facing instructions.

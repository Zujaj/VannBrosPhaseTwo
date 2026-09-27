# Test Plan — Material Template smoke rows (TM-01..TM-36)

- **Spec:** `playwright/tests/authenticated/material-template.spec.ts`
- **Page object:** `playwright/tests/pages/material-templates.page.ts` (`materialTemplatesPage` fixture), plus the shared `listPage` fixture for the grid.
- **Source rows:** `playwright/test-plans/catalog/smoke-cases.json`, `area: "TM"` (TM-01..TM-36).
- **Knowledge base:** `.claude/skills/vannbrosphasetwo-knowledge/references/templates.md` (§ Material Template) — stale in two places, see Discrepancies below; the live app wins.
- **Automation status:** verified live against the QA tenant on 2026-09-27 (Firefox). All 36 rows tagged: 17 `@SMK` (full), 19 `@SMK-partial`. Three tests assert the CORRECT behaviour of features that are currently broken and carry `test.fail()` with the bug reason (see below). No test saves anything.
- **Last updated:** 2026-09-27

## Known bugs — read this before touching this area again

1. **Wizard metadata dropdowns are empty** (`SMOKE-NOTES` TM-WIZARD-DROPDOWNS). Opening the
   Create/Edit/Clone wizard fires `GET /api/metadata/MaterialsV2`, which returns **500**; the
   sibling metadata requests (ParentOperations, applicationmethods, NozzleTypes, sometimes
   DropletSize) are then aborted, so Operation, Select Product, Select Problem, Mix Method, Rate
   Unit, Application Method, Nozzle Type and Droplet Size render blank or empty. The list's own
   `Set Filters → Operation` (same widget) populates fine. Effect: Operation can never be set, Save
   never enables, **no Material Template can be created through the UI.** Verified on Firefox
   and Chromium with a single click and no request interception.
2. **Edit and Clone open blank** (`SMOKE-NOTES` TM-EDIT-CLONE-BLANK) instead of pre-filled from
   the source template.
3. **Label set drifts per load.** The wizard renders either translated labels (`Save & Add New`,
   `Preharvest (PHI) Days`, `Tank SizeGal*`) or raw fallbacks (`Save And Add New`, `Pre Harvest
   Days`, `Enter Tank Size`). The page object accepts both.

Tests for bugs 1 and 2 assert the correct behaviour and are marked `test.fail()`: green while the
bug stands, and Playwright reports "expected to fail, but passed" once it is fixed — remove the
`test.fail()` line then. Everything the bugs do not touch is asserted normally, in separate tests,
so a regression there is not hidden behind an expected failure.

## Row → coverage

| Row | Description | Tag | Notes |
|---|---|---|---|
| TM-01 | Filter on Material Template Name | `@SMK` | full |
| TM-02 | Filter on Operation | `@SMK` | full |
| TM-03 | Reset button on Filter | `@SMK` | full |
| TM-04 | Close button on Filter | `@SMK` | full |
| TM-05 | Refresh button | `@SMK` | full |
| TM-06 | Create New Material Template button | `@SMK` | full — wizard opens on Basic Details |
| TM-07 | Material Title on Basic Details | `@SMK` | full |
| TM-08 | Operation on Basic Details | `@SMK-partial` | options load (`test.fail`, bug 1); selecting a value not asserted |
| TM-09 | Additional Comments on Basic Details | `@SMK` | full |
| TM-10 | Select Product on Material Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-11 | Mix Method on Material Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-12 | Rate on Material Details | `@SMK` | full — plain numeric field |
| TM-13 | Rate Unit on Material Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-14 | Per on Material Details | `@SMK-partial` | presence only — gating on Mix Method unverifiable |
| TM-15 | Save & Add New on Material Details | `@SMK-partial` | presence + disabled state only — needs a Product, which is unreachable |
| TM-16 | Delete on Material Details | `@SMK-partial` | presence + disabled state only |
| TM-17 | Select Problem on Problem Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-18 | Stage on Problem Details | `@SMK-partial` | label only — control conditionally mounts on a Problem selection, unreachable |
| TM-19 | Severity on Problem Details | `@SMK-partial` | same as TM-18 |
| TM-20 | Infestation on Problem Details | `@SMK` | full — plain numeric field |
| TM-21 | Infestation Unit on Problem Details | `@SMK-partial` | same as TM-18 |
| TM-22 | Description on Problem Details | `@SMK` | full |
| TM-23 | Save on Problem Details | `@SMK-partial` | presence + disabled state only |
| TM-24 | Delete on Problem Details | `@SMK-partial` | presence + disabled state only |
| TM-25 | Application Method on Application Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-26 | Total Application Rate on Application Details | `@SMK` | full |
| TM-27 | Tank Size on Application Details | `@SMK` | full |
| TM-28 | Nozzle Type on Application Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-29 | Droplet Size on Application Details | `@SMK-partial` | options load (`test.fail`, bug 1) |
| TM-30 | Preharvest (PHI) Days on Application Details | `@SMK` | full |
| TM-31 | Band Percentage for Each Row to Apply | `@SMK` | full |
| TM-32 | Save on Application Details | `@SMK-partial` | presence + disabled state only — persistence unverifiable |
| TM-33 | Close on Application Details | `@SMK` | full — wizard discards, grid record count unchanged |
| TM-34 | Edit of Material Template on View Detail Page | `@SMK-partial` | wizard pre-filled from source (`test.fail`, bug 2); saving the edit not automated |
| TM-35 | Clone of Material Template | `@SMK-partial` | wizard pre-filled from source (`test.fail`, bug 2); saving the clone not automated |
| TM-36 | View Detail Page | `@SMK` | full — rich, working read-only page |

## Not automated

Saving a new, edited or cloned template — the persisting half of TM-15, TM-23, TM-32, TM-34 and
TM-35. Create cannot reach an enabled Save while bug 1 stands, and `ActivityTemplate` has no
DELETE, so every run would leave records on the shared tenant. Write it as a `@mutating` flow
once bug 1 is fixed and a cleanup path exists. `beforeEach` aborts every write to
`ActivityTemplate` as insurance.

## Discrepancies vs. the knowledge base

- `templates.md` names the wizard's second tab **"View Details"**; the live app (and the smoke
  checklist itself) calls it **"Material Details"**. The app and the checklist agree; the
  knowledge base is stale.
- `templates.md` names the Basic Details task field **"Task\*"** only; the live app renders it as
  either `Task*` or `Operation*` depending on which build is served — the same `Task`/`Operation`
  label drift `ListPage`'s `COLUMN_VARIANTS` and `template-management.spec.ts` already document
  elsewhere in this repo. The spec and page object accept both spellings.

## Running

```bash
pnpm auth:qa   # once, if the session has expired
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 pnpm exec playwright test --project=firefox tests/authenticated/material-template.spec.ts
```

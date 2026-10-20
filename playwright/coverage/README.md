# Test coverage

The single place for coverage reports: how much of each QA workbook the automated suite covers, and
what each environment run found. Playwright's own output (`playwright-report/`, `test-results/`) is
not kept here. The case lists that coverage is measured against stay in `test-plans/catalog/`.

| File | What it is | Produced by |
|---|---|---|
| [`regression.md`](./regression.md) | `@TC` / `@TC-partial` tags vs. the web regression workbook (`test-plans/catalog/web-cases.json`) | `pnpm coverage:write` (generated, do not edit) |
| [`smoke.md`](./smoke.md) | `@SMK` / `@SMK-partial` tags vs. the web rows of the smoke checklist (`test-plans/catalog/smoke-cases.json`) | `pnpm smoke:coverage:write` (generated, do not edit) |
| [`runs/`](./runs/) | Results of a specific run against an environment, one file per run: `YYYY-MM-DD-<env>-<suite>.md` | Written by hand (or by Claude) from the run's JSON report |

`regression.md` and `smoke.md` say what is automated. A file in `runs/` says what passed on a given
day in a given environment. The two answer different questions, so a run report cites the smoke
row IDs rather than repeating the coverage tables.

## Runs

| Date | Environment | Suite | Result |
|---|---|---|---|
| 2026-10-12 | UAT | Smoke (`pnpm test:smoke:uat`, plus WO-20) | [69 pass · 3 flaky · 2 fail of 103 web rows](./runs/2026-10-12-uat-smoke.md) |
| 2026-10-16 | QA | ADO #26493 harvest planning (`harvest-multi-field.spec.ts`, plus manual) | [16 automated: 14 pass · 2 expected fail; 9 manual: 7 pass · 2 fail; +10-17 tickets/attachments: 16 cases, 10 pass · 5 fail · 1 observation; +10-19 rerun, rules 1–5: 3 pass · 1 fail (#60) · 1 web pass / API fail (#62)](./runs/2026-10-16-qa-ado-26493.md) |

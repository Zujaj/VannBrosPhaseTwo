# Test Plan — Inspection Template smoke rows (TI-01..TI-12)

- **Spec:** `playwright/tests/authenticated/inspection-template.spec.ts`
- **Source rows:** `test-plans/catalog/smoke-cases.json`, `area: "TI"`.
- **Verified:** live on QA (Firefox), 2026-09-27. 11 of 12 rows automated (10 full, 1 partial).

| Row | Description | Tag | How |
|---|---|---|---|
| TI-01 | Create Normal inspection | `@SMK` `@mutating` | Save as Draft → toast "Template created successfully", row in Draft |
| TI-02 | Name | `@SMK` | Name* required, accepts text |
| TI-03 | Default location | `@SMK` | Default Locations* numeric, defaults to 1 |
| TI-04 | Available attribute filters | `@SMK` (`test.fail`) | search should narrow the list — **known bug TI-ATTR-SEARCH**: it does not |
| TI-05 | Select attributes | `@SMK` | drag a tile into Selected Attributes |
| TI-06 | Save as Draft | `@SMK` `@mutating` | see TI-01 |
| TI-07 | Save & Publish | `@SMK` `@mutating` | row lands in Published |
| TI-08 | Close | `@SMK` | wizard closes, record count unchanged |
| TI-09 | Publish from detail screen | `@SMK` `@mutating` | Draft detail → Publish Template → Published |
| TI-10 | Clone from detail screen | `@SMK-partial` | Clone Template (Enabled rows only) opens "Copy Of <name>"; clone not saved |
| TI-11 | Edit from detail screen | not automated | no Edit control anywhere (TI-NO-EDIT); confirm with product |
| TI-12 | View detail icon | `@SMK` | View Detail → `/inspection-templates/{id}`, "Inspection Detail: <name>" |

The `@mutating` flow creates two templates and deletes them in `afterEach` (runs even after a timeout) via `DELETE /api/Form/{id}`, found by name prefix. **Parked as `test.fixme`**: Save As Draft sends no request after a synthetic drag (SMOKE-NOTES TI-SAVE-NOOP) — needs one manual save on QA to tell app bug from test artifact.
Excluded from `pnpm test:smoke`; run with `pnpm test:smoke:all`. Note: both saves enable on a Name
alone (TI-NAME-ONLY-SAVE), although the knowledge base lists Select Attribute* as required.

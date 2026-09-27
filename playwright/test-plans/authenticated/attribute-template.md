# Test Plan — Attribute Template smoke rows (TA-01..TA-10)

- **Spec:** `playwright/tests/authenticated/attribute-template.spec.ts`
- **Source rows:** `test-plans/catalog/smoke-cases.json`, `area: "TA"`.
- **Verified:** live on QA (Firefox), 2026-09-27. 9 of 10 rows automated (all full).

| Row | Description | Tag | How |
|---|---|---|---|
| TA-01 | Create Attribute | `@SMK` `@mutating` | Save → toast "Attribute created successfully", card on the deck |
| TA-02 | Select attribute on New Attribute screen | `@SMK` | type tile → Summary shows it |
| TA-03 | Next button | `@SMK` | → Attribute Details: Name*, Attribute Status toggle on |
| TA-04 | Back button | `@SMK` | → type tiles again, choice kept |
| TA-05 | Save & Add New | `@SMK` `@mutating` | saves, panel resets to step 1 |
| TA-06 | Close button | `@SMK` | panel closes, deck unchanged |
| TA-07 | Search on Attributes screen | `@SMK` | deck narrows to matching cards |
| TA-08 | Enable attribute | `@SMK` `@mutating` | re-enable the created card |
| TA-09 | Disable attribute | `@SMK` `@mutating` | disable the created card |
| TA-10 | Filters | not automated | no filter control on the screen; confirm meaning with product |

The `@mutating` flows are **gated off** (`ALLOW_UNDELETABLE_ATTRIBUTES=1` to run): QA returns 500 for
`DELETE /api/Form/inputfields/{id}` and for the Disable switch (SMOKE-NOTES TA-DELETE-500), so created
attributes cannot be removed. TA-08/09 assert the correct toggle behaviour under `test.fail()`.
Excluded from `pnpm test:smoke`; run with `pnpm test:smoke:all`.

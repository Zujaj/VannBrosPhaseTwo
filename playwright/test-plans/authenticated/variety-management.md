# Test Plan: Variety Management (PSD v1.0, R1 + R2)

- **Spec:** `playwright/tests/authenticated/variety-management.spec.ts`
- **Page objects:** `WorkOrdersPage` (Variety multi-select, plot picker, list Set Filters), `MapsPage`,
  `PlanningPage`, `ListPage`
- **Source:** `resources/product-specifications-document/Variety Mapping.pdf` (Folio3, Aug 07, 2026).
  Section refs below are the PSD's: *R1 FR-n* = "Functional Requirements - R1", item n.
- **Tags:** `@PSD-variety` on every test; `@upcoming` on behaviour QA has not shipped
  (`helpers/upcoming.ts`, run with `pnpm test:upcoming`). No workbook `@TC:` ids exist for this scope.
- **Automation status:** **Verified live 2026-09-24 on Chromium and Firefox.** VM-01, 02, 03, 10, 11, 12,
  13 and 20 pass. VM-05..08 skip (no GP data, FINDINGS #33). VM-04, 21, 25 and 30 are parked
  `@upcoming`, and all four fail under `pnpm test:upcoming` as expected.
- **Last updated:** 2026-09-24

## What QA has shipped (live 2026-09-24)

| PSD area | On QA | Notes |
|---|---|---|
| R1 FR-1 GP → AgriERP Field/Variety/Acreage sync | ❌ data | Blocks API returns `varieties: []` for every plot (FINDINGS #33) |
| R1 FR-2 WO creation: Variety multi-select, Field filtering | ✅ UI | Filtering works but has no mapped plots to return |
| R1 FR-3 Maps: Variety on field, Variety filter | ◐ | `Set Filters → Variety` present; field aside has no Varieties |
| R1 FR-4 Planning Field Summary | ❓ | Not observed; parked `@upcoming` |
| R1 FR-5 WO list: column, Advanced Filter, search | ✅ | |
| R1 FR-6 WO detail: Variety column under Plots | ✅ | Values not verifiable without FR-1 data |
| R1 FR-7 Mobile WO Field cards / Summary | n/a | Mobile app; manual |
| R1 FR-8 Harvest Ticket creation by Variety | n/a | Mobile flow; web Harvest Central is covered by `harvest-central.spec.ts` |
| R1 FR-9 / Integrations: D365 posting with Variety | n/a | D365; manual (see VM-40) |
| R2 Settings → Plots mapping + acreage validation | ❌ | Plot grid unchanged |

Test data: `Vann Farm (VBSF)` / `Fertilization (1240)` (`plannedScenario()`), Site Colusa, Crop Year 2026.

## Cases

| ID | PSD ref | Title | Expected result | Automation |
|---|---|---|---|---|
| VM-01 | R1 FR-2 | Variety is a multi-select | The field lists varieties; two can be selected at once and show as two chips; removing a chip leaves the other | ✅ automated |
| VM-02 | R1 FR-2 | The plot picker is fetched for exactly the selected varieties | No variety sends `cropVarietyIDs: []`; one variety sends one id; adding a second sends both (union) | ✅ automated |
| VM-03 | R1 FR-2 | A variety mapped to no plot of the farm empties the picker | `0 Total Records`, no selectable rows | ✅ automated |
| VM-04 | R1 FR-1 | GP sync delivers each plot's varieties | At least one plot for the farm + task has `varieties` | `@upcoming`, fails today (FINDINGS #33) |
| VM-05 | R1 FR-2 | Selecting a variety lists only the plots mapped to it | Picker holds exactly the plots mapped to that variety | ✅ automated, skips without FR-1 data |
| VM-06 | R1 FR-2 | Two varieties list the union of their plots | Picker = union of both varieties' plots | ✅ automated, skips without FR-1 data |
| VM-07 | R1 FR-2 | A field under two selected varieties sums their acreage | `totalApplicableAcreage` = sum of the two varieties' acreage | ✅ automated, skips without data. Per-variety acreage key unobserved; confirm on first run |
| VM-08 | R1 FR-2 | Changing the variety drops a selected plot it no longer maps | Plot added under variety A disappears from the form's Select Plot grid when A is swapped for an unmapped variety | ✅ automated, skips without FR-1 data |
| VM-10 | R1 FR-5 | The list shows each WO's varieties | `Variety` column present; several varieties render comma-separated | ✅ automated |
| VM-11 | R1 FR-5 | Set Filters → Variety lists only WOs with that variety | Every row's Variety contains the chosen one; count ≤ unfiltered | ✅ automated (resets the filter afterwards) |
| VM-12 | R1 FR-5 | The Variety column search narrows the list | Every row's Variety contains the searched text | ✅ automated |
| VM-13 | R1 FR-6 | Detail Plots grid carries a Variety column | Column present; each plot's Variety is one of the WO's | ✅ header automated; values skip without FR-1 data |
| VM-20 | R1 FR-3 | Maps Set Filters offers Variety, and Maps Control a Variety layer | `Variety` filter present (disabled until a Crop is chosen); `Variety` layer listed in Maps Control | ✅ automated |
| VM-21 | R1 FR-3 | A selected field lists its varieties with acreage | Aside shows `Varieties` then `<name> <n> acres` rows | `@upcoming` |
| VM-22 | R1 FR-3 | Maps Variety filter shows only that variety's fields; Mobile Map matches Web | Only mapped fields render | Manual until FR-1 data exists; mobile half manual |
| VM-25 | R1 FR-4 | Planning Field Summary shows the field's varieties | ≤3 names listed; >3 shows a `Multiple Varieties` tag whose hover lists all | `@upcoming` |
| VM-26 | R1 FR-7 | Mobile WO: Variety on each Field card; >2 → `+N` tag opening a bottom sheet; Summary tab lists varieties | As stated | Manual (mobile) |
| VM-27 | R1 FR-8 / journey | Mobile Harvest Ticket: selecting Variety filters Fields; ticket keeps the Variety | As stated | Manual (mobile) |
| VM-30 | R2 FR-1/2 | Settings → Plot opens a plot onto its variety mapping | Grid shows Farm / Field Name / Total Area; a plot opens to a Variety + Acreage mapping | `@upcoming` smoke; the PSD names no labels, so no deeper locators yet |
| VM-31 | R2 FR-2 | Map one and then several varieties to a plot | Each saved with an acreage; available to operational screens | Manual → automate once the screen exists (`@mutating`) |
| VM-32 | R2 FR-3 | Combined variety acreage above the plot's total is refused | Save blocked with a validation message | Manual → automate (`@mutating` in case the rule is missing) |
| VM-33 | R2 FR-3 | Combined acreage below the total is allowed | Saves | Manual → automate (`@mutating`) |
| VM-34 | R2 FR-4 | An R2 mapping drives WO / Maps / Planning / Detail / Mobile | VM-05..VM-22 pass against the R2-maintained mapping | Re-run of the above once R2 ships |
| VM-40 | R1 FR-9 / Integrations | D365 posting carries the Variety; posting restricted when a required Variety is missing | Journal line shows the Variety; missing Variety blocks posting | Manual in D365. The FinOps `F3Agri*` services expose no journal read-back (`vannbrosphasetwo-finops-api` skill) |

## Notes for maintainers

- The Variety field is not the app's standard dropdown. See FINDINGS #35 for the mechanics and use
  `WorkOrdersPage.selectVarieties()`.
- Filtering is asserted through the `POST /api/activity/blocks` exchange (`openPlotPicker()`), since
  the picker shows no Variety column. Row counts are checked against the UI as well.
- When GP data lands, VM-05..08 start running on their own. Run `pnpm test:upcoming` to see whether
  VM-04 / VM-21 / VM-25 / VM-30 now pass. For each that passes, remove its `upcoming()` call and
  its `@upcoming` tag.

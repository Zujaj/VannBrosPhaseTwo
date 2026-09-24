# Test Plan: Dummy Resources (PSD v2.0, shift-based)

- **Spec:** `playwright/tests/authenticated/dummy-resources.spec.ts`
- **Page object:** `WorkOrdersPage` (`addFirstDummyResource`, `addResourcesButton`,
  `addResourceMenuItem`, `dummyResourceSwitch`)
- **Source:** `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf`
  (Folio3, Sep 16, 2026). Read it alongside the Work Order and Hour Log Adjustment documents, as it asks.
- **Tags:** `@PSD-dummy-resources`; `@upcoming` for v2 behaviour not on QA (`pnpm test:upcoming`);
  `@mutating` for DR-06. No workbook `@TC:` ids exist for this scope.
- **Automation status:** **Verified live 2026-09-24 on Chromium and Firefox.** DR-01 passes. DR-02..05
  are parked `@upcoming` and fail under `pnpm test:upcoming` as expected (QA is v1). **DR-06
  (`@mutating`) has not been run.**
- **Last updated:** 2026-09-24

## What QA has shipped (live 2026-09-24)

QA runs the **v1** design (FINDINGS #34). `Add Resources` opens `Select Resources` directly, and the
panel has a `Dummy Resource` No/Yes switch. With the switch on Yes, 8 dummy resources are listed. A
dummy resource on the form gets a `No Of Resource` number input. The v2 "+" menu, the separate
`Add Dummy Resource` page, the chip and the notice are **not** deployed.

Most of the PSD is **mobile** (swipe menus, shifts, Start/Resume Job, machine binding). Playwright
covers the Farm Web App only, so those cases are manual here. Their web-visible results (Spent
Hours, Hour Log Adjustment, logs) are listed as web cases that need a mobile-created shift first.

## Web cases

| ID | PSD ref | Title | Expected result | Automation |
|---|---|---|---|---|
| DR-01 | Solution Overview, Data Dictionary *No. of Resources* | A dummy resource on the form takes a No Of Resource headcount | Row added to Select Resources with an editable number input under `No Of Resource` | ✅ automated (works on v1 and v2) |
| DR-02 | Mocks, Figure 1 | The Select Resources "+" offers `Add Resource` and `Add Dummy Resource` | Both items shown in a dropdown | `@upcoming` |
| DR-03 | Figure 2; journey step 4–5 | `Add Dummy Resource` opens the dummy register | Title `Add Dummy Resource`; `Resource Group`, `Search by Resource Name`, `Search by Company Name` filters; **no** Dummy Resource toggle; every row carries the Dummy Resource chip | `@upcoming` |
| DR-04 | Solution Overview (register chosen before the page opens) | `Add Resource` lists named resources only | No toggle; no row carries the dummy chip | `@upcoming` |
| DR-05 | Figure 1 | A dummy resource row shows the yellow Dummy Resource chip and the notice "Dummy resources stand in for unnamed labour and carry a headcount instead of a person…" | As stated | `@upcoming` |
| DR-06 | Validation Rules → Mandatory Fields | A dummy resource with No. of Resources empty or 0 blocks saving | Submit disabled or refused; no `Saved Successfully` toast | ✅ automated, **`@mutating`**: a build without the rule saves a WO (no teardown). **Not yet run.** |
| DR-07 | Dummy Resource Management; Integration with Hour Log Adjustment | Hours logged by a dummy resource show on the WO resource list, Spent Hours and Hour Log Adjustment with headcount, standard hours, source (Web/Mobile), device and user | As stated | Manual: needs a mobile shift first. Automatable afterwards against a known WO |
| DR-08 | Integration with ERP | Dummy resource hours and the machine hours that follow them post to the WO's ERP project; posting is restricted without a project link; corrections re-post before completion, read-only after | As stated | Manual (D365) |
| DR-09 | Dummy Resource Management | Named resource on a running job cannot be re-selected until paused/stopped; dummy resources never blocked | As stated | Manual. The web half becomes automatable once a running job can be seeded |

## Mobile cases (manual, Farm Mobile App)

| ID | PSD ref | Title | Expected result |
|---|---|---|---|
| DRM-01 | Figures 3–4 | Swipe a plot card right: `Add / Update Dummy Resource`, `Add Resources`; left: Start Job / Edit / Resume / Pause | Available on every plot, whether or not a shift has run |
| DRM-02 | Figure 5 | Empty state | "No dummy resource logs on this plot yet — tap + to add one."; `Total Hours Logged: 0h`, `Resource 0h + Machine / Implement 0h` |
| DRM-03 | Figures 7–8 | Add Dummy Resource lists the operation's dummy register only (named users absent); multi-select; `Done` enabled once a row is ticked | As stated |
| DRM-04 | Figure 9; Mandatory Fields | `No Of Resources`: one mandatory field per selected resource, integer > 0 | Empty / 0 blocks progress |
| DRM-05 | Figures 10–12; Dummy Asset Register | Select Asset per resource. `Add Machine` / `Add Dummy Machine` sheet only when dummy assets of that kind exist (implements open the list directly). Either register usable by dummy or named resources | As stated |
| DRM-06 | Figure 13 | Summary shows plot, resources with headcount, assets; `Estimated Hours` derived from headcount | As stated |
| DRM-07 | Figure 14; Machine Binding | Start Job creates Shift 1 and writes machine bindings; plot `In Progress` until Pause/Stop. Example: start 02:00 PM, 2 std h, 1 res → 2 h logged, machine bound 02:00–04:00 PM | As stated |
| DRM-08 | Hour Calculation | Hours = No. of Resources × Standard Hours, read-only; attached machine logs the same hours; plot total = resource + machine hours (Figure 6: 2 res × 2 h + 1 res × 2 h = 6 h resource + 4 h machine = 10 h) | As stated |
| DRM-09 | Figures 15–16; Machine Binding Validation | A machine bound for any part of the shift window is greyed with `Bound` + "Already bound to <resource> · <start> – <end>"; tapping shows "<Machine> is already bound to <resource> from <start> to <end>." | Selection blocked |
| DRM-10 | Important Point: Resume Job | Resume Job appends Shift 2; plot stays In Progress; hours add, do not replace | As stated |
| DRM-11 | Headcount Update Validation | Raising the headcount extends hours and the binding window; refused, with Save disabled, if the machine was used by an actual resource on the WO during the extra time | As stated |
| DRM-12 | Correcting and Deleting a Shift | Pencil → No Of Resources recalculates hours/window; `Remove` takes a resource off; bin deletes the shift and its hours/bindings; removing the last resource deletes the shift; no deletion once posted and WO completed | As stated |
| DRM-13 | Named Resource Availability | A named resource on a running job shows "Already working on <plot>" and errors on tap; dummy resources unrestricted | As stated |
| DRM-14 | Audit Trail Logs | Every shift and correction records user, timestamp, source (Web/Mobile), device; visible in notifications and View All Logs | As stated |

## Notes for maintainers

- `addFirstDummyResource()` takes whichever path the build serves (v2 menu if present, else the v1
  switch), so DR-01 keeps working across the release.
- When v2 lands, run `pnpm test:upcoming`. Once DR-02..05 pass, remove the group-level `upcoming()`
  call in `describe('v2 selection flow …')` and the `@upcoming` tags. The v1 switch (`dummyResourceSwitch`) and its branch in
  `addFirstDummyResource()` can then go.
- The PSD gives no exact error text for DR-06. Tighten that test to the real message once it is seen.

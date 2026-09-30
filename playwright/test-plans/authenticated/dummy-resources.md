# Test Plan: Dummy Resources (PSD v2.0, shift-based)

- **Spec:** `playwright/tests/authenticated/dummy-resources.spec.ts`
- **Page object:** `WorkOrdersPage` (`openResourceRegister`, `addFromRegister`, `addFirstDummyResource`,
  `addResourcesButton`, `addResourceMenuItem`, `dummyResourceSwitch`)
- **Source:** `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf`
  (Folio3, Sep 16, 2026). Read it alongside the Work Order and Hour Log Adjustment documents, as it asks.
- **Tags:** `@PSD-dummy-resources`; `@mutating` for DR-06. No workbook `@TC:` ids exist for this scope.
- **Automation status:** **v2 released on QA; verified live 2026-09-30 on Firefox and Chromium.**
  Pass: DR-02, 03, 04, 05, 12, 15. Expected failures (`test.fail`, known bugs): DR-01 (#47),
  DR-14 (#48), DR-19 (#49). DR-06 (`@mutating`) is parked with `test.fixme` until #47 is fixed.
- **Last updated:** 2026-09-29 (PSD v2 revision: Resume Job / shifts wording — DRM-10 reworded, DRM-15..17 and DR-10 added; all start from an In Progress WO). 2026-09-30: v2 released on QA, spec rewritten and re-verified (FINDINGS #47–#49); cross-checked against the client sheet `AgriERP_Dummy_Resource_Test_Cases.xlsx`; DR-11..18 added, DR-07 extended

## What QA has shipped (live 2026-09-30)

QA now runs the **v2** design. The Select Resources `+` (`title="Add Resources"`) opens a menu with
`Add Resource` and `Add Dummy Resource`. They open side panels headed **`Select Resources`** (101
named resources) and **`Dummy Resource`** (the 8-row dummy register, FINDINGS #34). The PSD mock
titles the second one "Add Dummy Resource". The v1 switch is gone. Both panels have `Resource Group`
(only `All` offered for Vann Farm / Fertilization), `Search By Resource Name`, `Search By Company Name`
(blank for every dummy resource), `Reset` and `Apply`. A dummy resource on the form shows a yellow
`DUMMY RESOURCE` badge.

**Not shipped / wrong:** no `No Of Resource` headcount input on the web form (#47); Reset flips the
Dummy Resource panel to the named register (#48); the Figure 1 notice is missing (#49).

Most of the PSD is **mobile** (swipe menus, shifts, Start/Resume Job, machine binding). Playwright
covers the Farm Web App only, so those cases are manual here. Their web-visible results (Spent
Hours, Hour Log Adjustment, logs) are listed as web cases that need a mobile-created shift first.

## Web cases

| ID | PSD ref | Title | Expected result | Automation |
|---|---|---|---|---|
| DR-01 | Solution Overview, Data Dictionary *No. of Resources* | A dummy resource on the form takes a No Of Resource headcount | Row added to Select Resources with an editable number input under `No Of Resource` | ❌ Expected failure — FINDINGS #47 (no headcount input on web) |
| DR-02 | Mocks, Figure 1 | The Select Resources "+" offers `Add Resource` and `Add Dummy Resource` | Both items shown in a dropdown | ✅ automated |
| DR-03 | Figure 2; journey step 4–5 | `Add Dummy Resource` opens the dummy register | Panel heading `Dummy Resource` (PSD mock: "Add Dummy Resource"); `Resource Group`, `Search By Resource Name`, `Search By Company Name` filters; **no** Dummy Resource toggle; only the dummy register listed (8 rows, e.g. `Irrigator (DM002)`) | ✅ automated (panel heading is `Dummy Resource`) |
| DR-04 | Solution Overview (register chosen before the page opens) | `Add Resource` lists named resources only | No toggle; no row carries the dummy chip | ✅ automated (no `(DMnnn)` code in the named register) |
| DR-05 | Figure 1 | A dummy resource row on the form shows the yellow Dummy Resource chip | `DUMMY RESOURCE` badge (`.badge-warning`, title `Dummy Resource`) beside the name | ✅ automated (chip only; the notice moved to DR-19) |
| DR-06 | Validation Rules → Mandatory Fields | A dummy resource with No. of Resources empty or 0 blocks saving | Submit disabled or refused; no `Saved Successfully` toast | `@mutating`, parked `test.fixme`: blocked by #47 |
| DR-07 | Dummy Resource Management; Integration with Hour Log Adjustment | Hours logged by a dummy resource show on the WO resource list, Spent Hours, the work order logs and Hour Log Adjustment with headcount, standard hours, source (Web/Mobile), device and user | As stated | Manual: needs a mobile shift first. Automatable afterwards against a known WO |
| DR-08 | Integration with ERP | Dummy resource hours and the machine hours that follow them post to the WO's ERP project; posting is restricted without a project link; corrections re-post before completion, read-only after | As stated | Manual (D365) |
| DR-09 | Dummy Resource Management | Named resource on a running job cannot be re-selected until paused/stopped; dummy resources never blocked | As stated | Manual. The web half becomes automatable once a running job can be seeded |
| DR-10 | Important Point – Resume Job and Shifts; Dummy Resource Management | After Shift 2 is resumed on mobile, the WO on web stays under the **In Progress** status chip and its resource list / Spent Hours show the hours of **both** shifts | WO not under `To Do`/`Queue`; hours = Shift 1 + Shift 2 | Manual: needs mobile shifts. Automatable afterwards against a `pnpm seed:hourlog` WO (read-only, forward-only) |
| DR-11 | Figure 2 (filters work the same in both modes) | `Resource Group` filter narrows the Add Dummy Resource list; same on Add Resource | Only resources of the chosen group remain after `Apply` | Manual; blocked by data (Resource Group offers only `All`) |
| DR-12 | Figure 2 | `Search By Resource Name` filters the dummy list (e.g. "Irrigator") | Only matching names remain (`Irrigator`, `Irrigator 02`) | ✅ automated |
| DR-13 | Figure 2 | `Search By Company Name` filters the dummy list | Only resources of that company remain | Manual; blocked by data (every dummy resource has a blank Company Name) |
| DR-14 | Figure 2 | `Reset` clears the applied filters | Full dummy register listed again, `Resource Group` back to `All` | ❌ Expected failure — FINDINGS #48 (Reset switches to the named register) |
| DR-15 | Figures 1–2; Business Cases (added from web during planning) | Several dummy resources ticked in one pass are all added on `Save` | Each lands in Select Resources with its own `No Of Resource` input and the Dummy Resource chip | ✅ automated (read-only: the form is not submitted) |
| DR-16 | Dummy Resource Management | Dummy resources are master data in Resource Management, flagged as dummy | The record carries the dummy flag and is selectable onto a WO like a named resource | Manual (Settings → Resources; flag label unverified) |
| DR-17 | Solution Overview (adjustable from Spent Hours until completion) | A dummy resource's hours can be adjusted from Spent Hours while the WO is not completed | Adjustment saved; Spent Hours shows the new value | Manual (needs a mobile shift) |
| DR-18 | Validation Rules → Mandatory Fields ("Machine and implement attachment is optional") | A WO with a dummy resource, headcount > 0 and **no** asset saves | `Saved Successfully` toast; no asset required | Manual; blocked by #47 until the headcount can be entered |
| DR-19 | Figure 1 | Select Resources shows the notice "Dummy resources stand in for unnamed labour and carry a headcount instead of a person…" | Notice visible under the grid | ❌ Expected failure — FINDINGS #49 |

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
| DRM-10 | Important Point – Resume Job and Shifts | On an **In Progress** WO whose plot already has Shift 1, Resume Job runs the same Start Job flow and **appends a new shift**. Resume again the same day → another shift (Shift 2, 3 …); earlier shifts stay listed | Each Resume adds one shift; none is replaced |
| DRM-15 | Important Point – Resume Job and Shifts | **Once the job is started, the plot remains In Progress** — through every Resume Job and new shift on the In Progress WO | Plot card reads `In Progress` after each Resume; never drops back to `To Do` between shifts |
| DRM-16 | Important Point – Resume Job and Shifts | On the In Progress WO, hours from each new shift are **added** to the plot total. Example: Shift 1 = 2 res × 2 h (4 h), Shift 2 = 1 res × 2 h (2 h) → resource total 6 h | `Total Hours Logged` = sum of all shifts; Shift 1 hours unchanged |
| DRM-17 | Important Point – Resume Job and Shifts | An In Progress plot can have **multiple shifts during the day, each with its own resources, headcount, machines and time window**. Resume with a different dummy resource, headcount and machine than Shift 1 | New shift keeps its own resources/headcount/machine/window; Shift 1 values untouched |
| DRM-11 | Headcount Update Validation | Raising the headcount extends hours and the binding window; refused, with Save disabled, if the machine was used by an actual resource on the WO during the extra time | As stated |
| DRM-12 | Correcting and Deleting a Shift | Pencil → No Of Resources recalculates hours/window; `Remove` takes a resource off; bin deletes the shift and its hours/bindings; removing the last resource deletes the shift; no deletion once posted and WO completed | As stated |
| DRM-13 | Named Resource Availability | A named resource on a running job shows "Already working on <plot>" and errors on tap; dummy resources unrestricted | As stated |
| DRM-14 | Audit Trail Logs | Every shift and correction records user, timestamp, source (Web/Mobile), device; visible in notifications and View All Logs | As stated |

## Notes for maintainers

- **Client sheet cross-check (2026-09-30):** `resources/Vann Brothers test cases/Vann Brothers test cases/AgriERP_Dummy_Resource_Test_Cases.xlsx`.
  Its 48 non-mobile cases map onto this plan; the mapping is the `Client Mapping` tab of
  `dummy-resources-test-cases.xlsx`. Only the web gaps were added (DR-11..18); mobile-tab cases were skipped.

- **v2 released 2026-09-30.** The `@upcoming` group and the v1 switch branch are gone; the page object
  opens either register with `openResourceRegister()`. When #47/#48/#49 are fixed, the matching
  test reports "expected to fail, but passed": drop its `test.fail()` line, and unpark DR-06.
- Under parallel Chromium load, `openCreateForm()` in `beforeEach` sometimes times out on the aside
  intercepting the Create click (seen 2026-09-30, 4 of 9 tests). A re-run with 2 workers passed; the
  config's `retries: 1` covers it.
- **PSD revision 2026-09-29 (Important Point – Resume Job and Shifts):** "appends a second shift"
  became "appends a **new** shift", and "the plot stays In Progress throughout and only Pause or Stop
  returns it to To Do" became "**Once the job is started, the plot remains In Progress.**" The PSD no
  longer says what status Pause or Stop leaves the plot in (Figure 14's caption still reads "stays In
  Progress until Pause or Stop"), so no case asserts a post-Pause/Stop status. Ask the PO before adding one.
- **Resume/shift cases start from an In Progress WO.** Get one with `pnpm seed:hourlog` (admin creates the WO and
  sets it In Progress), then log Shift 1 on mobile. Keep it forward-only: never revert it to To Do or delete it.
- The PSD gives no exact error text for DR-06. Tighten that test to the real message once it is seen.

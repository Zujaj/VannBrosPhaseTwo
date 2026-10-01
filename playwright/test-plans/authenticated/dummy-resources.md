# Test Plan: Dummy Resources (PSD v2.0, shift-based)

- **Spec:** `playwright/tests/authenticated/dummy-resources.spec.ts`
- **Page object:** `WorkOrdersPage` (`openResourceRegister`, `addFromRegister`, `addFirstDummyResource`,
  `addResourcesButton`, `addResourceMenuItem`, `dummyResourceSwitch`)
- **Source:** `resources/product-specifications-document/AgriERP FSCM - Dummy Resources v2.pdf`
  (Folio3, Sep 16, 2026). Read it alongside the Work Order and Hour Log Adjustment documents, as it asks.
- **Tags:** `@PSD-dummy-resources`; `@mutating` for DR-06. No workbook `@TC:` ids exist for this scope.
- **Automation status:** **v2 released on QA; verified live 2026-09-30 on Firefox and Chromium.**
  Pass: DR-01, 02, 03, 04, 05, 12, 15. Expected failures (`test.fail`, known bugs): DR-14 (#48),
  DR-19 (#49). DR-06 retired (the quantity is a mobile field; FINDINGS #47 withdrawn).
- **Last updated:** 2026-09-29 (PSD v2 revision: Resume Job / shifts wording — DRM-10 reworded, DRM-15..17 and DR-10 added; all start from an In Progress WO). 2026-09-30: v2 released on QA, spec rewritten and re-verified (FINDINGS #47–#49); ADO #26191 impact areas added as DRI-01..06; DRM rules automated through `api/DummyShift/*` (FINDINGS #50–#53); cross-checked against the client sheet `AgriERP_Dummy_Resource_Test_Cases.xlsx`; DR-11..18 added, DR-07 extended

## What QA has shipped (live 2026-09-30)

QA now runs the **v2** design. The Select Resources `+` (`title="Add Resources"`) opens a menu with
`Add Resource` and `Add Dummy Resource`. They open side panels headed **`Select Resources`** (101
named resources) and **`Dummy Resource`** (the 8-row dummy register, FINDINGS #34). The PSD mock
titles the second one "Add Dummy Resource". The v1 switch is gone. Both panels have `Resource Group`
(only `All` offered for Vann Farm / Fertilization), `Search By Resource Name`, `Search By Company Name`
(blank for every dummy resource), `Reset` and `Apply`. A dummy resource on the form shows a yellow
`DUMMY RESOURCE` badge.

No quantity is entered on web, by design (Figure 1; the Manager journey enters it on mobile at Start Job;
FINDINGS #47 withdrawn). **Wrong:** Reset flips the Dummy Resource panel to the named register (#48); the
Figure 1 notice is missing (#49).

Most of the PSD is **mobile** (swipe menus, shifts, Start/Resume Job, machine binding). Playwright
covers the Farm Web App only, so those cases are manual here. Their web-visible results (Spent
Hours, Hour Log Adjustment, logs) are listed as web cases that need a mobile-created shift first.

## Web cases

| ID | PSD ref | Title | Expected result | Automation |
|---|---|---|---|---|
| DR-01 | Figure 1; Manager journey steps 3–8 | A dummy resource on the web form takes **no** quantity (No. of Resources is entered on mobile at Start Job) | Row added with the badge; no `No Of Resource` column or number input | ✅ automated (corrected 2026-09-30; FINDINGS #47 withdrawn) |
| DR-02 | Mocks, Figure 1 | The Select Resources "+" offers `Add Resource` and `Add Dummy Resource` | Both items shown in a dropdown | ✅ automated |
| DR-03 | Figure 2; journey step 4–5 | `Add Dummy Resource` opens the dummy register | Panel heading `Dummy Resource` (PSD mock: "Add Dummy Resource"); `Resource Group`, `Search By Resource Name`, `Search By Company Name` filters; **no** Dummy Resource toggle; only the dummy register listed (8 rows, e.g. `Irrigator (DM002)`) | ✅ automated (panel heading is `Dummy Resource`) |
| DR-04 | Solution Overview (register chosen before the page opens) | `Add Resource` lists named resources only | No toggle; no row carries the dummy chip | ✅ automated (no `(DMnnn)` code in the named register) |
| DR-05 | Figure 1 | A dummy resource row on the form shows the yellow Dummy Resource chip | `DUMMY RESOURCE` badge (`.badge-warning`, title `Dummy Resource`) beside the name | ✅ automated (chip only; the notice moved to DR-19) |
| DR-06 | Validation Rules → Mandatory Fields | ~~Web save blocked without a quantity~~ **Retired**: the quantity is not a web field; the rule applies at Start Job | — | Covered by DRM-04 (API): `POST /api/DummyShift` refuses headcount 0 |
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
| DR-18 | Validation Rules → Mandatory Fields ("Machine and implement attachment is optional") | A WO with a dummy resource and **no** asset saves | `Saved Successfully` toast; no asset required | ✅ Verified manually 2026-09-30 (WO-1393 saved with dummy resources, no asset) |
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

## Impact-area regression (ADO #26191, developer note 2026-09-29)

From Mohsin's release note on `resources/work-items/26191-dummy-resource-v2.md`. These check that v2
did not break **existing** behaviour. Each uses named resources or old-style (Enh 25942) dummy resources, not v2 shifts.

| ID | Impact area | Title | Expected result | Automation |
|---|---|---|---|---|
| DRI-01 | 1. Spent Hours (`GET api/WorkOrder/HourLogs`) | Spent Hours on a WO with named resources only, and on one with an old-style dummy resource | Same hours as before v2 in the Resources table and the Spent Hours drawer; API returns the entries (new fields tolerated) | Partial: `hour-log-adjustment.spec.ts` reads Spent Hours for named resources. Old-style dummy: manual |
| DRI-02 | 2. `WorkOrderHourLogs` table (4 new columns, index now non-unique) | Hour log create, edit, void and approve for a named resource | Each action succeeds and Spent Hours reflects it; no duplicate or lost entry | Partial: approve/adjust/reject covered by `hour-log-decisions.spec.ts` (`@mutating`). Create from the Spent Hours drawer and void: manual |
| DRI-03 | 3. WO sync to mobile (ComAX) | A normal planned WO created on web reaches the mobile app | WO appears in the assignee's mobile list with its plots and resources | Manual (mobile) |
| DRI-04 | 4. Start Job for normal resources (ComAX) | Start Job on a WO with named resources only | Job starts; plot and WO go `In Progress`; no shift/dummy data is required | Manual (mobile) |
| DRI-05 | 5. Hours distribution across plots (Bug 25844) | Named-resource hours on a multi-plot WO are split by acreage as before; dummy shift hours are excluded from that split | Named-resource split unchanged; shift hours stay on their own plot | Manual |
| DRI-06 | 6. Old dummy resources (Enh 25942) | An existing WO carrying a v1 dummy resource with a headcount still shows and uses it | Headcount shown and hours computed from it, on web and mobile | Manual. Old-style WOs keep their stored headcount (e.g. WO-1391: `Dummy Res 04` = 2); new web WOs carry none by design |

## API checks for the mobile cases (`api/DummyShift/*`)

**Automated 2026-09-30:** `playwright/tests/authenticated/dummy-shifts-api.spec.ts` (`@mutating`, Chromium
only, serial, no page). `beforeAll` runs `pnpm seed:dummyshift --json` (api/dummy-shifts.mts): a planned WO
with the operator, Dummy Res 04 ×2, Irrigator ×1 and two machines, set In Progress. Shifts are started and
corrected as the supervisor (admin stand-in when no supervisor session, FINDINGS #52). `afterAll` moves the WO to
**Review**; each run leaves one `QA DRS <timestamp>` WO there. Machines are shared, so each run uses a random
past time slot. Verified live: 16 pass, 3 expected failures (#50, #51, #53), ~30 s.

| Case | What the spec asserts | Endpoint(s) |
|---|---|---|
| DRM-04 | Headcount 0 refused: 400 `Number of resources is mandatory and must be greater than zero` | `POST /api/DummyShift` |
| DRM-08 | Hours = headcount × standard hours; window = start + hours | `POST /api/DummyShift/Preview` |
| DRM-07 | Shift 1 created; machine logs the same hours, bound for the resource's window; plot total = resource + machine | `POST /api/DummyShift`, `GET …/Line/{lineId}`, `GET …/PlotSummary/{woId}` |
| DRM-09 | A machine bound in the window is refused: `… is already bound to resource N from … to …` | `POST /api/DummyShift/Resume` |
| DRM-10 | Resume appends Shift 2; Shift 1 unchanged | `POST /api/DummyShift/Resume` |
| DRM-17 | Each shift keeps its own resource, headcount, machine, window | `GET …/Line/{lineId}` |
| DRM-16 | Plot totals = sum of all shifts | `GET …/PlotSummary/{woId}` |
| DRM-15 | WO stays `In Progress` after Start and Resume | `GET /api/WorkOrder/{id}/Summary` |
| DRM-13 | Dummy resources stay available while on running shifts (named-resource half: not automated) | `POST …/ResourceAvailability` |
| DRM-11 | Headcount 0 refused; raising it extends hours + binding; raising into another binding of the machine is blocked | `PUT …/Resource/{id}/Headcount` |
| DRM-12 | Attach/detach a machine; remove one resource keeps the shift; removing the last deletes it (404); deleting a shift removes its hours and frees its machine | `POST …/Resource/{id}/Asset/{assetId}`, `DELETE …/Asset/{id}`, `DELETE …/Resource/{id}`, `DELETE …/{shiftId}` |
| DRM-14 | Logs name user, time, source; creation entries carry the device. Expected failures: detach not logged (#50), corrections without device (#53) | `GET …/{shiftId}/Logs` |
| DR-08 | Posting readiness `canPost: true` for a linked WO (the posting itself: manual, D365) | `GET …/PostingReadiness/{woId}` |

The mobile **screens** (swipe menus, Figures 3–16 wording) stay manual; the spec covers the server rules
behind them.

## Notes for maintainers

- **Client sheet cross-check (2026-09-30):** `resources/Vann Brothers test cases/Vann Brothers test cases/AgriERP_Dummy_Resource_Test_Cases.xlsx`.
  Its 48 non-mobile cases map onto this plan; the mapping is the `Client Mapping` tab of
  `dummy-resources-test-cases.xlsx`. Only the web gaps were added (DR-11..18); mobile-tab cases were skipped.

- **v2 released 2026-09-30.** The `@upcoming` group and the v1 switch branch are gone; the page object
  opens either register with `openResourceRegister()`. When #48/#49 are fixed, the matching
  test reports "expected to fail, but passed": drop its `test.fail()` line.
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

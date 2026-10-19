# Test Plan — Multi-Field / Multi-Variety Harvest Planning (ADO #26493)

- **Spec:** `playwright/tests/authenticated/harvest-multi-field.spec.ts` (read-only; the web check aborts its request)
- **Automation status:** Partially automated. Firefox 2026-10-16: all pass, with HMF-01/02 as expected failures (#60).
  - **Automated:** HMF-01..05, 07, 10..12 and 19 (API); HMF-20..22 and 27..29 (web, request aborted).
  - **Manual:** planning that creates tickets (HMF-13..18, 23, 24), the sync jobs and mobile.
- **Source of truth:** ADO #26493 + developer release note, written up in `resources/work-items/26493-multi-field-multi-variety-harvest-planning.md`; `vannbrosphasetwo-knowledge/references/harvest-central.md`
- **Scope:** only #26493, per the product team (2026-10-16). Variety Management R1/R2 is out of scope here (`variety-management.md`).
- **Tags:** `@ADO-26493` on every test; `@mutating` on cases that plan tickets
- **Last updated:** 2026-10-16

## Fixtures (QA, Colusa / Crop Year 2026, Vann Farm)

| Item | Value |
|---|---|
| Contract code legend | `V…` = VFO (GP `contractCategory` 1), `Y…` = YHS (category 2); dev legend VSM = VFO, YSS = YHS; suffix = crop year, `-N` = addendum |
| Vann Brothers (GP 260) contracts | Active 2026: `VSM-0EY10-26` (VFO, + `-1`, `-2`, master `VMM-C9DD2-25`) and `YSA-A4VMW-26` (YHS, + `-2`), covering 51 plots. Closed 2025: `VSM-07673-25`, `YSS-168E7-25` |
| Vann plots on closed contracts only | `280, 286, 287, 301`: must not be offered |
| Dev sample codes | `VSM-A9611-25`, `YSS-40D5B-25` (Closed), `VSM-Z8B1Y-26`, `YSA-66PIJ-26` (Active): all **Vann-Peterson Farms Partnership (GP 262)**, plots 150, 151, 152 |
| Snapshot | `playwright/fixtures/harvestContractFields.json` (51 plots with varieties, the non-Vann plots and their GP owners) |
| Contracted plot, 3 varieties | `130` (fieldID 2): MONTEREY 37.2, NONPAREIL 74.5, WINTERS 37.2 |
| Contracted plot, contract ⊃ growing | `306`: contract BUTTE / PADRE / BUTTE/PADRE; growing BUTTE/PADRE only → offer BUTTE/PADRE |
| Non-Vann plots named only on other growers' contracts | `150, 151, 152, 160, 180, 201, 215, 218, 219, 282, 283, 284, 285, 340, 341, 342, Almonds Splits & Meats, Shop` |
| Plot with no contract and no varieties | `132` |
| Jobs (Sync Console → Service Status) | `GrowerPortalCreateContractJob` (165), `FireBaseCreateContractsJob` (166) |
| iOS | 1.3.14 (27), TestFlight |

## Live status 2026-10-16

| Area | Result | Finding |
|---|---|---|
| Contract jobs 165 / 166 | ⚠️ Active; 4,825 lines synced from **all** growers; one run error; fetch markers stuck on 10/12 | #60, #61 |
| `GetFieldsForHarvesting` | ❌ 69 fields = 51 Vann + 18 non-Vann (`Almonds Splits & Meats` has no varieties) | #60 |
| `GetVarietiesForHarvesting` | ✅ growing ∩ contracted | |
| Backend `tickets/plan` | ✅ `fields: [{ id, fieldName, code, varieties: [ids] }]`; old body, unknown plot/variety, empty list and quantity 0 all refused | |
| Web plan panel (deployed 16:55 PKT) | ✅ Field multi-select (= `GetFieldsForHarvesting`, 132 absent); Variety empty until a plot is picked, then cascades; body is one entry per plot with its own varieties. ⚠️ Heading still `Plan Harvest Tickets`; button `Create N Planned Tickets` shows N per pair, not the total; no project-per-plot control | #59 (resolved) |
| Swagger | ❌ empty on the API host (not auth-related) | #61 |
| Mobile | Not run (needs a device) | |

## ADO validation rules 2–5 (2026-10-16)

| Rule | Cases | Result |
|---|---|---|
| 2. Varieties come from the selected plots and their mappings | HMF-03, 04, 22, 27 | ✅ |
| 3. No invalid Field × Variety combinations | HMF-20, 28, 29 (web); HMF-15, 18 (API) | ✅ web. ❌ `tickets/plan` accepts invalid pairs when called directly (FINDINGS #62) |
| 4. No duplicate pairs within one planning operation | HMF-16 (API); HMF-08 (re-plan joins the existing row) | ✅ |
| 5. Each generated record is independent in the Planning list | HMF-13, 23, 09 | ✅ |

## Cases

| ID | Area | Title | Steps / data | Expected result | Type | Automation |
|---|---|---|---|---|---|---|
| HMF-01 | API | Plot list holds only contracted plots | `GET /api/Metadata/GetFieldsForHarvesting` | No plot from the non-Vann fixture list | Functional | ✅ `test.fail` (#60) |
| HMF-02 | API | Every offered plot has a variety to harvest | `POST /api/Metadata/GetVarietiesForHarvesting` `{fieldIds: <all from HMF-01>}` | Each field returns ≥1 variety | Functional | ✅ `test.fail` (#60, `Almonds Splits & Meats`) |
| HMF-03 | API | Varieties are limited to what grows in the plot | Same call vs `POST /api/activity/blocks` | Each field's varieties ⊆ its plot varieties | Functional | ✅ |
| HMF-04 | API | Varieties follow the contract | `{fieldIds: [306]}` | Exactly `BUTTE/PADRE` (not BUTTE, not PADRE) | Functional | ✅ |
| HMF-05 | API | Varieties endpoint validates its body | Bare array `[2]` | 400; `{fieldIds: [2]}` → 200 | Negative | ✅ |
| HMF-07 | API | Closed contracts do not make a plot harvestable | `GET /api/Metadata/GetFieldsForHarvesting` | `280, 286, 287, 301` (Vann plots on Closed 2025 contracts only) absent | Functional | ✅ |
| HMF-08 | Web | Re-planning an existing pair adds to its row | Field 130, Variety MONTEREY, 1 → `Create 1 Planned Tickets` while row `130/MONTEREY` (id 6) exists | Toast `Harvest Tickets Planned`; row 6 goes 1 → 2; no new row | Functional | ✅ manual pass 2026-10-16 (`HT-130-T522H-26`, id 551, deleted afterwards) |
| HMF-09 | Web | Each generated row stands on its own | Open `/harvest-central/6` and `/7` (from HMF-23) | Each shows its own Field, Variety, Linked Project and ticket: 130 / MONTEREY / `PRJ_000042` / `HT-130-EY6SB-26`; 306 / BUTTE/PADRE / `PRJ_000053` / `HT-306-MZSKK-26` | Functional | ✅ manual pass 2026-10-16 |
| HMF-06 | API | Crop year filter | `GetFieldsForHarvesting?cropYearId=<other year>` | Only that year's contracted plots | Functional | Manual (param name unconfirmed while Swagger is down) |
| HMF-10 | API | Plan needs at least one plot | `POST /api/harvestcentral/tickets/plan` `{fields: [], seasonID: 13, quantity: 1}` | 400 `At least one field is required.` | Negative | ✅ |
| HMF-11 | API | Unknown plot rejected | `fields: [{id: 999999, varieties: [22]}]` | 400 `Selected field was not found.`; nothing created | Negative | ✅ |
| HMF-19 | API | Unknown variety rejected | `fields: [{id: 2, varieties: [888888]}]` | 400 `Selected crop variety was not found.`; nothing created | Negative | ✅ |
| HMF-12 | API | Quantity must be ≥ 1 | `quantity: 0` | 400 `Quantity must be at least 1.` | Negative | ✅ |
| HMF-13 | API | **One planned record per plot × variety** | 130 + 306, MONTEREY + BUTTE/PADRE, `quantity: 1` (via web, HMF-23) | One new row per pair (`130/MONTEREY` id 6, `306/BUTTE/PADRE` id 7), 1 planned ticket each; each keeps its Field and Variety | Functional P1 | ✅ manual pass 2026-10-16 (`@mutating`) |
| HMF-14 | API | All-or-nothing | Valid `{id:2,[22]}` + `{id:39,[888888]}` | 400 `Selected crop variety was not found.`; no count changes | Negative P1 | ✅ manual pass 2026-10-16 |
| HMF-15 | API | No invalid combination | `{id:2, varieties:[23]}` (130 + ALDRICH: not growing, not contracted) | Rejected; nothing created | Negative P1 | ❌ **fails**: 200, ticket created (FINDINGS #62) |
| HMF-16 | API | No duplicates in one request | 130/MONTEREY as `[22,22]`, and as two `{id:2,[22]}` entries | 400 `Field '130' lists the same variety more than once.`; nothing created | Negative | ✅ manual pass 2026-10-16 |
| HMF-17 | API | Project per plot | 130 + 306 in one plan | Each pair linked to its own plot's project | Functional | ✅ auto-linked: 130 → `PRJ_000042`, 306 → `PRJ_000053`. No way to choose one (HMF-26) |
| HMF-18 | API | Non-contracted plot refused | `{id:124 (plot 132), varieties:[22]}` | Rejected | Negative P1 | ❌ **fails**: 200, new row `132/MONTEREY` + ticket (FINDINGS #62) |
| HMF-20 | Web | Web sends one entry per plot with its own varieties | Harvest Central → `Plan Harvest Tickets`, Field `130` + `306`, Variety `MONTEREY` + `BUTTE/PADRE`, 2 (request aborted) | `fields` = `130 → [22]`, `306 → [51]`; `quantity: 2` | Regression P1 | ✅ |
| HMF-21 | Web | Field picker is multi-select and contract-driven | Open Field | Several plots selectable; list = HMF-01; `132` absent | Functional | ✅ (inherits #60's extra plots) |
| HMF-22 | Web | Variety picker cascades from the chosen plots | Variety before any plot, then pick 130 + 306 | `No data available`, then only MONTEREY, NONPAREIL, WINTERS, BUTTE/PADRE; multi-select | Functional | ✅ |
| HMF-27 | Web | Removing a plot drops its varieties | Field 130, Variety WINTERS; untick 130; tick 306 | WINTERS chip cleared; Variety `No data available`, then only `BUTTE/PADRE`; Create disabled | Negative | ✅ |
| HMF-28 | Web | Shared variety goes to each plot | Field 130 + 131, Variety MONTEREY, 1 (request aborted) | `fields` = `130 → [22]`, `131 → [22]` | Functional | ✅. Manual 2026-10-16: Select All on 130 + 306 sends `130 → [46, 43, 22]`, `306 → [51]` |
| HMF-29 | Web | Plot with none of the picked varieties | Field 130 + 306, Variety MONTEREY only, 1 (request aborted) | No `306/MONTEREY` pair | Negative | ✅ `fields` = `130 → [22]` only. ⚠️ 306 is dropped silently, with no warning that it gets no tickets (product question) |
| HMF-25 | Web | Create button states the total | 2 plots × 1 variety each, quantity 2 | Label or summary shows 4 tickets in total | Usability | Manual. Today the label reads `Create 2 Planned Tickets` (product question) |
| HMF-26 | Web | Project per plot | Pick 2 plots | A project selector per plot (release note item 3) | Functional | Manual. Not present on 2026-10-16 (product question) |
| HMF-23 | Web | Submit creates one row per pair | Field 130 + 306, Variety MONTEREY + BUTTE/PADRE, 1 → `Create 1 Planned Tickets` | Toast `Harvest Tickets Planned`; panel closes; list gains `130 MONTEREY 1` and `306 BUTTE/PADRE 1` (`HT-130-EY6SB-26`, `HT-306-MZSKK-26`) | Functional P1 | ✅ manual pass 2026-10-16 (`@mutating`; tickets kept for HMF-4x) |
| HMF-24 | Web | Detail-page plan still works | Detail page → `Plan Harvest Tickets` (Field/Variety locked) | Tickets created for that pair | Regression | Manual, `@mutating` |
| HMF-30 | Jobs | Contracts sync from GP | Sync Console → Sync History, service 165 | `Grower contract '…' / plot '…' / variety '…' synced (created)`; no `Error` | Functional | Manual |
| HMF-31 | Jobs | Re-run updates, no duplicates | Next run of 165 | Lines read `synced (unchanged)` / updated; counts stable | Functional | Manual |
| HMF-32 | Jobs | Only Vann contracts sync | Sync History 165 | Only Vann contract codes (`VSM-0EY10-26*`, `YSA-A4VMW-26*`; plus 261/262/28 if product counts them as Vann) | Functional | Manual, fails today (#60) |
| HMF-33 | Jobs | Contracts reach mobile | Service 166 logs | `'<contract> / plot … / variety …' record has been successfully synced.` | Functional | Manual |
| HMF-40 | Mobile | Bulk harvest creation lists only contracted plots | iOS 1.3.14 (27), Supervisor, create harvest | Plot list = HMF-01 (Vann only) | Functional P1 | Manual (device) |
| HMF-41 | Mobile | Varieties per plot, multi-select | Pick 130 + 306 | Same varieties as HMF-22 | Functional | Manual (device) |
| HMF-42 | Mobile | Bulk create one record per pair | Submit | One harvest record per plot × variety; visible on web Harvest Central | Functional P1 | Manual (device), `@mutating` |
| HMF-43 | Mobile | Variety code shown | Plot / variety cards | Crop variety code present | Functional | Manual (device) |
| HMF-50 | Regression | Variety pickers elsewhere unchanged | WO create Variety, Maps aside, Planning tags | As in `variety-management.md` (VM-01..25) | Regression | ✅ via `variety-management.spec.ts` |

## Generated tickets: drawer, validations, attachments (2026-10-17)

Run on row `306/BUTTE/PADRE` (`/harvest-central/7`) with test tickets that were deleted afterwards. The `Create Harvest Ticket` (`Add New Ticket`) and `Edit Harvest Ticket` drawers share the same fields: `Manual Ticket #`, `Last Load` / `Split Load`, `Driver Name *`, `Truck License Plate *`, `Front Trailer Plate *`, `Rear Trailer Plate *`, `Standard Quantity` (default `44000`), `Attachments` → `Upload`, `Cancel` / `Save Harvest Ticket`.

| ID | Area | Title | Steps / data | Expected result | Type | Result |
|---|---|---|---|---|---|---|
| HMF-60 | Web | Save needs driver, truck and both plates | Open the drawer; pick Driver, Truck, Front, Rear one by one | `Save Harvest Ticket` disabled until all four are set | Negative | ✅ |
| HMF-61 | Web | Create a ticket | `Add New Ticket`, driver `Lopez, Hector`, truck `9F05681`, plates `TRL-100` / `TRL-101`, manual `QA-26493-C1` | 200; ticket `HT-306-<5>-26`, Load Type `In Progress`, Actual Weight `Awaiting From Yhs`; fleet filled (`Valley Farm Transport`) | Functional | ✅. ⚠️ No success toast, and the grid had not refreshed 4 s after save |
| HMF-62 | Web/API | Standard Quantity must be > 0 | `-5`, then `0` | 400 `Standard quantity must be greater than zero.` (toast `Error`) | Negative | ✅ server side. ⚠️ The input has `min=0` but Save stays enabled for `-5`; the input stops at 9 digits |
| HMF-63 | Web/API | Manual Ticket # length | 300 characters; API binary search | Clear validation at the limit | Negative | ❌ 65+ characters → 500 `String or binary data would be truncated.` (limit 64, FINDINGS #64, ADO #26704) |
| HMF-64 | Web | Front and Rear plates must differ | `TRL-100` as both | Refused | Negative | ❌ saved (FINDINGS #65) |
| HMF-65 | Web | Split Load trailer choice | Tick `Split Load`; switch `Front Only` / `Back Only` | Radios `Front Only` (default) / `Back Only`; the other plate disabled | Functional | ✅. ⚠️ Both plates lose `*`; a split ticket saved with no plate at all, while a normal ticket needs all four |
| HMF-66 | Web | Second Last Load prompts an override | Save a Last Load, then another | Prompt; earlier ticket back to In Progress | Functional | ✅ `Override existing Last Load?` / `Current Last Load Ticket: HT-306-…` / `Cancel` · `Confirm Override`; earlier ticket → `In Progress`. Wording differs from PSD (`A Last Load already exists`) |
| HMF-67 | Web | Delete a ticket | Row `Delete` icon → confirm | Dialog, ticket removed, counts drop | Functional | ✅ `Delete harvest ticket` / `Are you sure you want to delete HT-306-… ?` / `Cancel` · `Yes`; grid 5 → 4. No toast |
| HMF-68 | API | Ticket references validated | PUT with unknown driver / plate, Split without option, option 3, `actualQuantity` before capture | 400 each | Negative | ✅ `Selected driver was not found.`, `Selected trailer plate was not found.`, `Select Front Only or Back Only for a Split Load.`, `Split Load option must be Front Only (1) or Back Only (2).`, `… has not been captured on site yet; an actual quantity cannot be recorded.` |
| HMF-69 | API | A ticket cannot move to another pair | PUT with `fieldID` 2, `cropVarietyID` 22 or `harvestCentralID` 6 on a 306/BUTTE/PADRE ticket | Ticket stays on row 7 | Negative | ✅ ignored (200, still row 7) |
| HMF-70 | Web | Attachments: allowed types and size | Pick `.exe`, `.zip`, a 25 MB `.jpg`, a `.pdf` | Rejected with a reason; PDF accepted | Negative | ✅ `<file>: File Type Not Allowed`; `<file>: File Exceeds Max Size (10 MB)`; PDF listed. ⚠️ A 0-byte file is accepted |
| HMF-71 | Web | Attachments saved on create | Create with a PNG + PDF | Ticket carries both; `View Attachments` lists them | Functional P1 | ❌ POST has no `attachments`; nothing uploaded (FINDINGS #63) |
| HMF-72 | Web | Attachments saved on edit | Edit, add PNG + PDF, save | Ticket carries both | Functional P1 | ❌ PUT first without them, then upload to Firebase; never linked; toast `Attachment Upload Failed` (FINDINGS #63) |
| HMF-73 | Web | Mobile attachments visible on web | `View Attachments` on `HT-130-EY6SB-26` (captured on iOS) | Files listed with `Download` | Functional | ✅ `IMG_47EE527E.jpg`, `IMG_698A7938.jpg` |
| HMF-74 | API | Attachment URL restricted | PUT `attachments` with `https://example.com/x.png` | Refused | Negative (security) | ❌ accepted (FINDINGS #66) |
| HMF-75 | Web | Load Type labels follow the PSD | Compare labels | Uncaptured planned ticket `Set on site` | Functional | ⚠️ The planned, uncaptured `HT-306-MZSKK-26` showed `First Load`; a web split ticket showed `Set on site` |

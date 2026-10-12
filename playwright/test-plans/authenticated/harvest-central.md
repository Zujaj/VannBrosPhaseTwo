# Test Plan — Harvest Central (harvest tickets)

- **Spec:** `playwright/tests/authenticated/harvest-central.spec.ts` (non-mutating; page object `tests/pages/harvest-central.page.ts`)
- **Automation status:** Partially automated. Workbook: HC-001 partial, HC-002, HC-008, HC-009, HC-010 partial. PSD v2: **HCP-10, HCP-11, HCP-13, HCP-15 (covers HCP-14 context and HCP-16), HCP-23**, all passing on Firefox 2026-10-12. The rest are manual.
- **Source of truth:** `vannbrosphasetwo-knowledge/references/harvest-central.md`; PSD `resources/product-specifications-document/AgriERP FSCM - Harvesting Permanent Planting v2.pdf` (v2.0, Aug 07, 2026)
- **Tags:** workbook ids `@TC:HC-0xx`; PSD v2 cases `@PSD-harvest-central` (`@mutating` wherever a ticket is planned, edited, linked, posted or deleted)
- **Last updated:** 2026-10-12. PSD v2 received and HCP / HCM / HCI added. Same day, after QA came back: live check in Firefox (results below), 5 HCP cases automated, swagger refreshed (no HarvestCentral changes).

## Live results 2026-10-12 (QA, Firefox, farmappadmin)

| Case | Result | Notes |
|---|---|---|
| HCP-01 | ⚠️ Drift | Headers `No Of …` and `Action`; row actions `Add More`, `View details.` (no pencil) |
| HCP-02 | ❌ Not shipped | Heading still `Plan Harvest Tickets`; no Farm, no `PLANNING PHASE`; label `No Of Harvest Tickets *` |
| HCP-04 / 05 | ❌ Not shipped | Variety opens before Field, lists all 44 varieties, single pick; API plan model takes one `cropVarietyID` <br>Data for the filter exists: GP 260 field → varieties = AgriERP plot varieties on all 51 shared fields. Yet 130 / ALDRICH and 180 / BOOTH were planned, and neither variety is on that field. |
| HCP-10 | ✅ Automated, pass | `HT-130-N5F4D-26` |
| HCP-11 | ✅ Automated, pass | `Post Ticket`, `Plan Harvest Tickets`, `Add New Ticket`, `N Planned · N In Progress · N Received · N Posted` (also `Reload`) |
| HCP-12 | ❌ Not shipped | No `Fleet` column; the rest present (as `Harvest Ticket No`, `Manual Ticket No`, plus `Updated Date/Time`, `Updated By`, `Actions`) |
| HCP-13 | ✅ Automated, pass | Farm shown; Field and Variety disabled |
| HCP-14 | ⚠️ Drift | `Edit Harvest Ticket` heading; no Project, no "not arrived yet" notice; **driver, truck and both plates required to save** (PSD: validate at posting) |
| HCP-15 / 16 | ✅ Automated, pass | Radios are `Front Only` / `Back Only` (PSD `Front trailer` / `Rear trailer`); the other plate is disabled |
| HCP-23 | ✅ Automated, pass | No input in the column; value `Awaiting From Yhs` |
| HCP-28 | Partly seen | `Qr Code` row action present; Download not checked |
| Others | Not run | Mutating or need YHS / mobile / another role |

## How v2 changes the existing workbook cases

The client workbook (`08 Harvest Central`, `catalog/web-cases.json`) predates v2. Read these cases with the PSD notes; don't edit the catalog by hand (`pnpm catalog` regenerates it).

| Case | PSD v2 impact |
|---|---|
| HC-001 / HC-003 / HC-010 | Columns already drifted (FINDINGS #10). The PSD adds a **`Fleet`** column after `Actual Weight` and the `planned · in progress · received · posted` summary line. |
| HC-011 | Ticket number = Field unique no. + random + Crop Year, e.g. `HT-321-HB12-26`, unique per Field + Crop Year (mocks show `HT-0004`). |
| HC-013 | Values `First Load`, `In Progress`, `Last Load`, `Split Load (Front/Rear)`, `First Load - Split Front Load`, `Set on site` (see HCP-15..19). |
| HC-014 | Panel is now **`Plan Incoming Loads`** (`PLANNING PHASE` chip) with Grower / **Farm** / Season / Hulling Location (live 2026-09-17: `Plan Harvest Tickets`, no Farm). |
| HC-016 | Ticket fields are validated **at posting, not save** (HCP-24). Field / Variety / quantity stay required to plan. |
| HC-017 | Field list is filtered by **Site**; picking a Field fills **Farm**. |
| HC-018 | Confirmed by the Validation Rules and mock: Variety is filtered by Field **and is multi-select** (Data Dictionary says the opposite, so it's a PSD conflict). |
| HC-019 | Manual Ticket # is optional: web drawer, first mobile field, own column. |
| HC-020 | Split Load reveals `Front trailer` / `Rear trailer` (only one); the other plate shows `Not needed — split load`. |
| HC-021 / HC-022 | **Superseded:** driver and every plate are separate searchable dropdowns from the fleet list. The **Fleet** is derived from the Truck, not chosen first. There is no free-text plate to validate. |
| HC-030 | The lock comes from **YHS Completed**, not from ERP posting (HCP-26). |
| HC-032 | QR on the detail screen with **Download** (send via chat). |
| HC-034 / HC-038 | Posting is blocked without a project link (HCP-25). |
| HC-047 | `Create New Harvest Ticket` is hidden on web and mobile without the permission. |

## Web cases — PSD v2 (Farm Operations Manager)

Preconditions unless stated: Manager logged in on QA, Site `Colusa`, Season `Crop Year 2026`, Harvesting enabled, **Harvest Central** open. Cases marked M plan or change tickets on the shared tenant; seed with `pnpm seed:tickets` and keep to one test field/variety pair.

| ID | PSD ref | Pri | Title | Steps | Expected result | Type |
|---|---|---|---|---|---|---|
| HCP-01 | Figure 1 | P1 | List columns and row actions | Open **Harvest Central** | Columns `Field`, `Variety`, `No. of Planned Tickets`, `No. of Actual Tickets`, `Planned On`, `Planned By`, `Actions`; row icons details (›), edit (pencil), add (+); header **`Plan Harvest Tickets`** | Functional |
| HCP-02 | Figure 2; journey | P1 | Plan panel opens blank with context defaulted | Click **Plan Harvest Tickets** | Panel **`Plan Incoming Loads`** with `PLANNING PHASE` chip. Read-only `Grower`, `Farm`, `Season`, `Hulling Location` filled; `Field *`, `Variety *` blank; `Enter Quantity *` with `10` / `20` / `30` | Functional |
| HCP-03 | Field selection | P1 | Field list is filtered by Site and fills Farm | In the panel, open `Field *`; pick a field | Only fields of the header Site are listed; `Farm` shows the field's farm | Functional |
| HCP-04 | Multi variety selection; Figure 2 | P1 | Variety waits for Field, then lists only that field's varieties | Open `Variety *` before and after choosing a Field | Before: disabled / `Select a field first`. After: only varieties linked to the field | Functional |
| HCP-05 | Multi variety selection | P1 | **M** Several varieties → N tickets each | Field F, varieties V1 + V2, quantity `10`, **Create 10 Planned Tickets** | Rows F/V1 and F/V2 each gain 10 planned tickets | Functional |
| HCP-06 | Figure 2 | P2 | Presets and button label follow the quantity | Click `10`, `20`, `30`, then type `7` | Button reads `Create 10/20/30/7 Planned Tickets`; the clicked preset is highlighted | Functional |
| HCP-07 | Harvest Ticket creation limit | P1 | Quantity above 100 refused | Type `101` | Plan blocked at 100 (live 2026-09-17: toast `Harvest Ticket Plan Max 100`, box clamped) | Negative |
| HCP-08 | Figure 2 | P2 | Quantity 0 / blank / decimal | Type `0`, clear, `2.5` | Create disabled for 0 and blank; decimal rejected or rounded (live accepted `2.5`; record what happens) | Negative |
| HCP-09 | Figure 2; Business Cases | P1 | **M** Planned tickets get system numbers | Plan 3 for a new pair; open its details | 3 rows with unique system `Harvest Ticket No.`, Load Type `Set on site`, `Planned On` / `Planned By` set | Functional |
| HCP-10 | Harvest Ticket Number Format | P2 | Ticket number format | Inspect the numbers from HCP-09 | Pattern `HT-<field no>-<random>-<YY>` (e.g. `HT-321-HB12-26`); no duplicate within Field + Crop Year | Functional |
| HCP-11 | Figure 3 | P1 | Detail page layout | Click › on a row | `Home > Harvest Central > Ticket Detail`, `‹ Back`, **`Post Ticket`**. Information `Grower`, `Farm`, `Season`, `Field`, `Variety`, `Hulling Location`, `Project`. **`Harvest Detail`** with `N planned · N in progress · N received · N posted`, **`+ Add New Ticket`**, **`+ Plan Harvest Tickets`** | Functional |
| HCP-12 | Figure 3; Fleet Mapping; Manual ticket number | P1 | Detail grid columns | On the detail page | Select checkbox, `Harvest Ticket No.`, `Manual Ticket #`, `Load Type`, `Standard Quantity`, `Actual Weight`, **`Fleet`** (right after Actual Weight), `Driver Name`, `Truck License Plate`, `Front Trailer Plate`, `Rear Trailer Plate`; Edit / Delete per row | Functional |
| HCP-13 | Figure 4 | P1 | Plan from the detail page locks Field and Variety | Detail page → **+ Plan Harvest Tickets** | `Plan Incoming Loads` with Field and Variety pre-filled and disabled | Functional |
| HCP-14 | Figure 5 | P1 | Edit drawer on a planned ticket | Edit a `Set on site` row | Title `Harvest Ticket <no>` (not editable); notice *"This load has not arrived yet — anything entered here pre-fills the on-site capture…"*; context `Grower`, `Farm`, `Season`, `Field`, `Hulling Location`, `Project`, `Created`, `Received`; fields `Manual Ticket #`, `Load Type` (`Last load`, `Split load`), `Front Trailer License Plate`, `Rear Trailer License Plate`, `Driver Name`, `Truck License Plate`, standard quantity, attachments | Functional |
| HCP-15 | Figure 6; Split Load validations | P1 | Split load shows trailer radios and disables the other plate | Tick `Split load`; pick `Front trailer`, then `Rear trailer` | Radios appear only with Split load; one at a time; the other trailer's plate disabled, `Not needed — split load` | Functional |
| HCP-16 | Split Load Option Validation | P2 | No trailer radios without Split load | Leave Split unticked; tick `Last load` | `Front trailer` / `Rear trailer` not shown | Negative |
| HCP-17 | Load Type Optional Validation | P1 | **M** Auto First Load / In Progress | For a pair with no loads, save ticket 1 then ticket 2 with no load type | Ticket 1 `First Load`; ticket 2 `In Progress` | Functional |
| HCP-18 | Load Type Optional Validation | P2 | **M** First + split front | First ticket of a pair saved as Split / Front | Load Type `First Load - Split Front Load` | Functional |
| HCP-19 | Last Load Existing Validation | P1 | **M** Second Last Load prompts and reverts the first | Save a Last Load; save another as Last Load | Prompt `A Last Load already exists` (…moves the earlier ticket back to In Progress); `Cancel` keeps both as they were; `Confirm` makes the new one Last Load and the old one `In Progress` | Functional |
| HCP-20 | Figure 5; Data Dictionary | P2 | Driver and plates come from fleet dropdowns | Open each dropdown, type to search | Searchable lists; no free text; trailers can be set to no trailer | Functional |
| HCP-21 | Harvest Ticket Fleet Mapping | P1 | **M** Fleet follows the truck | Pick a Truck License Plate; save | `Fleet` column shows the truck's fleet; changing truck changes it | Functional |
| HCP-22 | Manual Harvest ticket number | P2 | **M** Manual Ticket # optional and shown | Save once blank, once with `YHS-4690` | Both save; value appears in the `Manual Ticket #` column | Functional |
| HCP-23 | Actual Weight Non editable | P1 | Actual Weight is read-only | Inspect the column and drawer | No input; `Awaiting YHS` until synced | Negative |
| HCP-24 | Mandatory Fields Validation | P1 | **M** Incomplete ticket saves but cannot post | Save a ticket missing driver / plates; select it; **Post Ticket** | Save succeeds; posting refused with a message naming what is missing | Negative |
| HCP-25 | Integration with ERP; Business Cases | P1 | **M** Posting requires a project link | Select an unlinked complete ticket; **Post Ticket** | Refused until linked; after linking, it posts and shows posted status | Negative |
| HCP-26 | Edit/Delete before completion | P1 | Completed ticket is locked | Open a ticket YHS marked Completed | `Completed` chip by the number; Edit and Delete unavailable or refused | Negative |
| HCP-27 | Edit/Delete before completion | P2 | **M** Delete before completion | Delete a `Set on site` ticket; confirm | Row gone; planned count drops by 1; void sent to YHS (HCI-02) | Functional |
| HCP-28 | QR Code Generation | P2 | QR on detail and download | Open a ticket's QR | QR shown; **Download** saves an image; payload has truck, driver, plates, field, variety, date | Functional |
| HCP-29 | Audit Trail Logs | P3 | **M** Ticket changes logged | Edit a ticket; open notifications → view all logs | Entry for the ticket change with user and time | Functional |
| HCP-30 | Permission-Based Access | P1 | No permission, no create | Log in as a role without `Manage Harvest Ticket` | No `Plan Harvest Tickets` / `Add New Ticket` / create option | Negative |
| HCP-31 | Figure 3 | P2 | **M** Standard Quantity inline edit | Change a row's `Standard Quantity` to `45000` | Saved; integers only | Functional |

## Mobile cases — PSD v2 (manual, Farm Mobile App)

Supervisor unless stated; tickets planned on web beforehand.

| ID | PSD ref | Title | Expected result |
|---|---|---|---|
| HCM-01 | Figure 7 | `+` opens `Choose an option` with `Harvest Ticket` and `Observation` | Both options with their subtitles; `Harvest Ticket` opens the queue |
| HCM-02 | Figure 7 | Dashboard `Harvest Central` tile shows `N Open Tickets` | Count equals the pending tickets |
| HCM-03 | Figure 11 | Harvest Central lists field/variety blocks with `PENDING HARVEST TICKETS x/y` | x pending of y planned; updates after planning or capture; `Search field or variety` works |
| HCM-04 | Figures 12–13 | Block opens `In Progress (n)` / `Completed (n)` | Counts match; `Search ticket, driver or plate` filters |
| HCM-05 | Figure 8 | Queue cards show the right next action | `Add Trailer Details` (nothing entered), `Add Driver Details` (trailers saved), `Review & submit` (all entered) |
| HCM-06 | Figure 9 | Step 1 fields | `Manual Ticket #`, `Split Load`, `Front Trailer Plate`, `Rear Trailer Plate` (searchable); `Next — driver & truck`, `Save & exit` |
| HCM-07 | Figure 10 | Step 2 fields and submit | Banner when trailers were saved earlier; `Driver`, `Truck License Plate`, `Last Load` toggle; `Submit ticket` enabled once driver and truck are set |
| HCM-08 | Figure 10 | `Save & exit` keeps a partial ticket | Ticket stays In Progress with its saved values |
| HCM-09 | Journey; Split validations | Split Load + Front trailer | Rear plate disabled; Completed card shows `No trailer`, chip `Split Load (Front)` |
| HCM-10 | Last Load validation; p.27 mock | Second Last Load prompt on mobile | `A Last Load already exists`, `Cancel` / `Confirm`; Confirm reverts the earlier ticket to In Progress |
| HCM-11 | Figure 13; journey | Correct a submitted ticket from Completed | Driver or plate change saved and visible on web; synced to YHS |
| HCM-12 | Offline Support | Capture offline, then reconnect | Ticket saved offline; synced automatically, no data loss; appears on web |
| HCM-13 | Permission-Based Access | Machine Operator without permission | No `Harvest Ticket` option; with permission, capture works |
| HCM-14 | Web pre-fill (Figure 5 notice) | Details entered on web pre-fill the mobile form | Values shown on mobile and editable |

## Integration cases (manual; AgriWMS / YHS, ERP, GP)

| ID | PSD ref | Title | Expected result |
|---|---|---|---|
| HCI-01 | Integration with AgriWMS | Submitted ticket and attachments reach AgriWMS | Ticket with grower, field, variety, load details, fleet and attachments in AgriWMS |
| HCI-02 | Integration with AgriWMS | Edit / delete before completion syncs | AgriWMS shows the change or the void |
| HCI-03 | Integration with AgriWMS | Status, weight certificate and actual weight come back | Farm App shows `Received` / `Completed`, the certificate attachment and `Actual Weight` |
| HCI-04 | Integration with ERP | Post a linked, completed ticket | Actual weight posted against the ERP project; posted status in AgriERP |
| HCI-05 | Harvest Work Order Management | Creating a harvest WO adds an ad-hoc WBS task in D365 | Task line on the job's WBS with no budgeted cost, time or date |
| HCI-06 | Integration with Grower Portal | Varieties, growers and fields from GP | GP `/companies/260` → `Fields and varieties` (API `GET /api/Field?CompanyID=260`) matches AgriERP `activity/blocks` varieties. ✅ Checked 2026-10-12: 51/51 shared fields identical. The Harvest Central dropdown doesn't use it yet (HCP-04) |

## Open questions for product

1. Variety filtering and multi-select: Validation Rules and the Figure 2 mock say filtered and multi; the Data Dictionary says unfiltered. Which wins?
2. ~~Ticket number format~~: answered live; QA uses `HT-<field>-<random>-<YY>`.
3. Should the edit drawer let a ticket save without driver, truck and plates? The PSD says validation runs at posting, not at save.
4. How is a ticket linked to its harvest WO? Business Cases say "linked … later", but no control is specified.

# Harvest Central — harvest tickets (plan, capture, post)

**Harvest Central** is where harvest **tickets** (one per truck load) are planned, captured, reviewed and posted. The Farm Operations Manager plans and posts on **web** (`/harvest-central`, a top-nav item). The Supervisor or a permitted Machine Operator captures each load on **mobile** when the truck arrives. Tickets sync to **AgriWMS / YHS Receiving** and post to the **ERP project**.

The harvest **work order** that the crew runs is a separate object. See [`work-orders-harvest.md`](./work-orders-harvest.md).

> **Provenance:** two sources, kept apart below.
> - **Live (QA):** captured 2026-09-07 and 2026-09-17 (Site `Colusa`, Season `Crop Year 2026`).
> - **PSD v2.0:** `resources/product-specifications-document/AgriERP FSCM - Harvesting Permanent Planting v2.pdf` (Folio3, Aug 07, 2026, "Mocks and screens updated"), received 2026-10-12. **Checked live on QA 2026-10-12 (Firefox, admin):** the detail page and edit drawer are largely v2. The list's plan panel is still v1. See *Live check 2026-10-12* below. Where PSD and live differ, the live label wins for tests. Flag the drift; don't silently switch.

## Live check 2026-10-12 (QA) — what v2 has shipped

| Area | Live | PSD v2 | Match |
|---|---|---|---|
| List columns | `Field`, `Variety`, `No Of Planned Tickets`, `No Of Actual Tickets`, `Planned On`, `Planned By`, **`Action`** (was `Actions`); row actions `Add More`, `View details.` | `No. of …`; chevron / pencil / `+` | Partly |
| Plan panel from the list | Heading `Plan Harvest Tickets`; `Grower` / `Season` / `Hulling Location` (**no Farm**); `No Of Harvest Tickets *` | `Plan Incoming Loads` + `PLANNING PHASE`, Farm, `Enter Quantity *` | No |
| Variety picker | Opens before Field is chosen and lists all 44 varieties; **single** pick (closes on select). API `HarvestCentralPlanRequestAPIModel` takes one `cropVarietyID` | Filtered by field, multi-select, N per variety | No (backend too) |
| Plan panel from the detail page | `Plan Harvest Tickets` with **Farm** shown; Field and Variety **disabled** (pre-filled) | Figure 4 | Yes (except heading) |
| Detail header | `Harvest Central: <Field>`, **`Post Ticket`**, `Reload`, **`Plan Harvest Tickets`**, **`Add New Ticket`**; summary **`1 Planned · 2 In Progress · 1 Received · 0 Posted`** | Same buttons and summary | Yes |
| Information panel | `Grower` (`Vann Bros - HQ`), `Farm` (`Vann Farm`), `Season`, `Field`, `Variety`, `Hulling Location` (`YHS`), `Linked Project` (`PRJ_000042`) | `Project` chip | Yes (label differs) |
| Detail grid | select checkbox, `Harvest Ticket No`, `Manual Ticket No`, `Load Type`, `Standard Quantity`, `Actual Weight`, `Driver Name`, `Truck License Plate`, `Front Trailer Plate`, `Rear Trailer Plate`, `Updated Date/Time`, `Updated By`, `Actions` | Adds **`Fleet`** after Actual Weight | No Fleet column |
| Row actions | `View Attachments`, `Qr Code`, `Edit`, `Delete` | Edit, Delete, QR (+ Download) | Yes |
| Ticket number | `HT-130-N5F4D-26`, `HT-130-T2Y8T-26` (field 130, 5-char random, YY) | `HT-321-HB12-26` | Yes |
| Cell values | Load Type `First Load`, `In Progress`, `Split Load (Rear)`, `Set on site`; Actual Weight **`Awaiting From Yhs`**; Standard Quantity plain text (e.g. `44000`, blank on planned) | `Awaiting YHS`; Standard Quantity inline input | Partly |
| Edit drawer | Heading **`Edit Harvest Ticket`**; read-only `Ticket #`, `Grower`, `Farm`, `Season`, `Hulling Location`, `Field`, `Variety`, `Created`, `Received` (**no Project, no "not arrived yet" notice**) | Title `Harvest Ticket <no>`, Project, notice | Partly |
| Drawer fields | `Manual Ticket #` (placeholder `Optional - Enter Paper Ticket Reference`; accessible name typo `Manuak Ticket No`), `Load Type` → `Last Load` / `Split Load`, **`Driver Name *`**, **`Truck License Plate *`**, **`Front Trailer Plate *`**, **`Rear Trailer Plate *`**, `Standard Quantity` (number), `Attachments`; `Cancel` / **`Save Harvest Ticket`** (disabled until the required fields are set) | Order Front, Rear, Driver, Truck; nothing required at save | See note |
| Split Load | Reveals radios **`Front Only`** (default) / **`Back Only`**; the other plate's dropdown is disabled and loses its `*`; no "Not needed" text | `Front trailer` / `Rear trailer`; `Not needed — split load` | Behaviour yes, labels no |

**Possible gap, not filed:** the drawer makes driver, truck and both plates **required to save**. The PSD says validation runs **at posting, not when the ticket is saved**, and the Manager journey says "enter the details that are already known". Both suggest a partial save should work. Confirm with product before raising a ticket (see the memory rule on verifying PSD journeys).

**Automation notes:** a Playwright `check()` does not toggle `Split Load` ("did not change its state"); a DOM click does (`dispatchEvent('click')`). The detail grid's leading checkbox column has an empty header; `ListPage.columnValues` / `columnIndex` count raw header positions for this reason (fixed 2026-10-12).

## Ticket drawer validations and attachments — live check 2026-10-17

- **`Add New Ticket`** opens **`Create Harvest Ticket`**, which has the same fields as `Edit Harvest Ticket`. `Standard Quantity` defaults to `44000`. Saving calls `POST /api/harvestcentral/tickets?…&overrideExistingLastLoad=false`. Edit calls `PUT /tickets/{id}?overrideExistingLastLoad=…`. Neither shows a success toast.
- **Server messages (400):**
  - `Standard quantity must be greater than zero.`
  - `Selected driver was not found.`
  - `Selected trailer plate was not found.`
  - `Select Front Only or Back Only for a Split Load.`
  - `Split Load option must be Front Only (1) or Back Only (2).`
  - `Harvest ticket <no> has not been captured on site yet; an actual quantity cannot be recorded.`
  - Changing `fieldID` / `cropVarietyID` / `harvestCentralID` in a PUT is ignored.
- **Second Last Load:** a modal `Override existing Last Load?` / `Current Last Load Ticket: <no>` / `Cancel` · `Confirm Override`. The earlier ticket goes back to `In Progress`.
- **Delete:** the dialog reads `Delete harvest ticket` / `Are you sure you want to delete <no> ?` / `Cancel` · `Yes`.
- **Attachments:** `Upload` takes several files at once. The client rejects other types with `<file>: File Type Not Allowed` (e.g. .exe, .zip) and files over 10 MB with `<file>: File Exceeds Max Size (10 MB)`; PDF, PNG and TXT are accepted. Mobile files live in Firebase storage under `harvest_central/` with thumbnails; `View Attachments` (side panel, `Images` filter) lists them with `Download`.
- **Known gaps:**
  - Web attachments never reach the ticket (FINDINGS #63).
  - Manual Ticket # over 64 characters gives a 500 (#64).
  - The same plate is accepted as Front and Rear (#65).
  - The API accepts any attachment URL (#66).
  - A Split Load ticket saves with no plate at all.

## Contract-driven multi-field planning (ADO #26493) — live check 2026-10-16

Ticket and release note: `resources/work-items/26493-multi-field-multi-variety-harvest-planning.md`. Mobile side: iOS 1.3.14 (27).

- **Backend shipped:**
  - Jobs `GrowerPortalCreateContractJob` (Sync Console service **165**) and `FireBaseCreateContractsJob` (**166**) are Active.
  - `GET api/Metadata/GetFieldsForHarvesting` returns `[{farmId, farmCode, text, value}]`, where `value` = fieldID.
  - `POST api/Metadata/GetVarietiesForHarvesting` takes `{ "fieldIds": [...] }` and returns `[{fieldID, fieldCode, fieldName, farmID, farmCode, varieties: [{cropVarietyID, cropVarietyName, cropVarietyCode, color, acreage}]}]`, i.e. growing ∩ contracted varieties.
  - `POST api/harvestcentral/tickets/plan` now takes `{ seasonID, hullingLocation, quantity, standardQuantity, fields: [{ id, fieldName, code, varieties: [cropVarietyID] }] }`.
  - Refusals (400): an old single `fieldID` / `cropVarietyID` body or `fields: []` → `At least one field is required.`; an unknown plot → `Selected field was not found.`; an unknown variety → `Selected crop variety was not found.`; quantity 0 → `Quantity must be at least 1.`
- **Web (deployed 2026-10-16, 16:55 PKT):** the panel heading is still **`Plan Harvest Tickets`**.
  - **`Field *`** and **`Variety *`** are `ng-multiselect-dropdown`s (`Select All`, `Search`, chips with `x`).
  - Field lists `GetFieldsForHarvesting` (69 plots).
  - Variety reads `No data available` until a plot is picked, then shows the union of the picked plots' harvestable varieties.
  - `Create N Planned Tickets` plans N per plot × variety pair. The label does not show the total.
  - No project-per-plot control yet.
- **Contract scope:**
  - Code legend: first letter `V` = VFO (GP `contractCategory` 1), `Y` = YHS (category 2); dev legend VSM = VFO, YSS = YHS; suffix = crop year, `-N` = addendum.
  - Vann Brothers (GP 260): active `VSM-0EY10-26` (+ `-1`, `-2`) and `YSA-A4VMW-26` (+ `-2`), covering 51 plots; closed 2025 `VSM-07673-25`, `YSS-168E7-25`. Plots only on closed contracts (280, 286, 287, 301) are not offered.
  - The sync pulls every GP grower's contracts and matches plots by name, so 18 non-Vann plots are also harvestable (FINDINGS #60). Some come from Vann-family growers: 150–152 Vann-Peterson (262; the dev's sample codes `VSM-Z8B1Y-26`, `YSA-66PIJ-26`), 340–342 Vann Family Two (261), 160 Carando/Vann Ranch (28). The rest come from unrelated growers.
  - Look up a contract's grower read-only on GP: `GET growersportal-qa-api.azurewebsites.net/api/SubContract?Page=1&Limit=50&contractCategory=<1|2>&Search=<code>`.
- **Swagger** is empty on QA, so the new models cannot be read from the contract (FINDINGS #61).

## Grower's Portal (GP) — where field varieties come from

GP QA: `https://growersportal-qa-web.azurewebsites.net/`. Credentials are in `playwright/.auth/growersportal_credentials.json` (`QA` key); the saved session is `playwright/.auth/gp_superadmin.json`. **GP is read-only for us.**
- **Vann Brothers** is grower **260**: `/companies/260`. Header `Vann Brothers` + `Active`; tabs `Grower details` | `Fields and varieties` | `Estimations` | `Contracts` | `Documents`.
- `Grower details` shows Grower name `Vann Brothers`, Farm type `Internal`, Grower id `260`, Date created `02/12/2025`, plus Email / Phone / Address.
- `Fields and varieties` is a grid with columns `Field`, `Total acres`, `City`, `Country`, `State`, `Zip code`, `Actions`, a `+` per row (expands plantings), and an `Add new field` button (don't use it).
- GP is a Flutter canvas, so read it through its API: `GET https://growersportal-qa-api.azurewebsites.net/api/Field?page=1&limit=500&CompanyID=260`. Each field has `plantings[]` with `cropVariety {code,name}`, `totalArea`, `huller` (`YHS`) and `handler` (`VFO`).

**Snapshot 2026-10-12:**
- GP has 56 fields and 16 distinct varieties for grower 260.
- AgriERP's plot varieties (`POST /api/activity/blocks`) **match GP exactly on all 51 shared fields**. For example, `130` = MONTEREY / NONPAREIL / WINTERS. FINDINGS #33 is resolved.

**Consequence for Harvest Central:** the field → variety data the PSD's filter needs now exists, but `Plan Harvest Tickets` still offers all 44 varieties for any field. QA already holds tickets for **130 / ALDRICH** and **180 / BOOTH**, and neither variety is planted on that field in GP or AgriERP. This supports the PSD Validation Rule (filter by field) over its Data Dictionary line. It is still a product question, not a filed bug.

## Roles

| Role | Platform | Harvest Central job (PSD "App User") |
|---|---|---|
| Farm Operations Manager (Admin/Manager) | Web | Plan harvest tickets, adjust ticket details, link to project, post to F&O; also creates / ends the harvest WO and adjusts machine and worker hours. |
| Supervisor | Mobile | Capture harvest tickets and fill in ticket details; also runs the harvest WO for others. |
| Machine Operator / Farm Hand | Mobile | Capture harvest tickets **only with the permission** (permission-based). |

Ticket creation is permission-based. Without the permission, the `Create New Harvest Ticket` option is hidden on **both** web and mobile. The existing role checkboxes are `Manage Harvest Ticket` / `Manage Harvest ID` under **Work Order** (see `users-resources.md`). Harvesting is a tenant feature toggle.

## End-to-end flow (PSD journeys)

**Manager (web):** log in → create the harvest WO → **Harvest Central** → plan tickets (from the list, or from a ticket detail page) → optionally pre-fill known details (manual ticket #, load type, plates, driver, truck) → after on-site capture, review / adjust / delete → select tickets and **link to the project** → **Post Ticket** → end the WO.

**Supervisor (mobile):** log in → open the harvest WO → `Start Job`, select machine → open waiting tickets (**Harvest Central** tile, or the bottom-bar **`+`** → `Harvest Ticket`) → pick the field/variety block → **In Progress** tab → tap the arrived load's ticket → Step 1: Manual Ticket #, Split Load (Front / Rear trailer), trailer plates → Step 2: driver, truck plate, **Last Load** toggle → **Submit ticket** → fix mistakes from the **Completed** tab → pause the job.

## Web — Harvest Central list

**Live (2026-09-17):**
- Columns: `Field`, `Variety`, `No Of Planned Tickets`, `No Of Actual Tickets`, `Planned On`, `Planned By`, `Actions` (renamed `Action` by 2026-10-12).
- Row actions: `Add More` (opens **`Add More Loads`**, with Field/Variety locked to the row) and `View Details` (chevron) → `/harvest-central/:id`.
- Header: `Refresh Data` (icon) and **`Plan Harvest Tickets`**.
- A row appears only once a field/variety pair has tickets.

**PSD v2 (Figure 1):**
- Same columns, written `No. of Planned Tickets` / `No. of Actual Tickets`.
- Three row icons: chevron (details), pencil (edit), `+` (add).
- Mobile shows each block as **pending / total planned** (e.g. `1/11`).

## Web — plan tickets panel

**Live (2026-09-17):**
- Panel heading **`Plan Harvest Tickets`** (h2); from a row it is **`Add More Loads`**.
- Read-only context: **`Grower`** (`Vann Brothers`), **`Season`** (`Crop Year 2026`) and **`Hulling Location`** (`YHS`). No Farm.
- Required fields:
  - **`Field *`** and **`Variety *`**: custom search dropdowns, with a space before `*`.
  - **`No Of Harvest Tickets *`**: preset buttons `10` / `20` / `30` plus a number box (min 1, max 100, default 10).
- Footer: `Cancel` / **`Create N Planned Tickets`**. The label tracks the box. The button is disabled at 0 or below, and until Field and Variety are set.
- **Saving shows no toast.** The panel closes and the pair's `No Of Planned Tickets` rises by N; a new pair gets a row. `Planned On` keeps the pair's first date.
  - Backend: `POST /api/harvestcentral/tickets/plan` `{fieldID, cropVarietyID, seasonID, quantity}`.
- More than 100 raises the error toast `Harvest Ticket Plan Max 100` and clamps the box to 100. A decimal (`2.5`) is accepted, and the button stays enabled.
- `Variety` lists every variety whichever Field is picked.
- Seeding: `pnpm seed:tickets` (`playwright/scripts/seed.mts`).

**PSD v2 (Figures 2 and 4):**
- Panel heading **`Plan Incoming Loads`** with a **`PLANNING PHASE`** chip.
- Context **`Grower`**, **`Farm`**, **`Season`**, **`Hulling Location`** (all defaulted).
- Quantity label **`Enter Quantity *`** (presets `10` / `20` / `30` + box). Submit `Create N Planned Tickets`.
- From the **detail page**, Field and Variety are pre-filled and **cannot be changed**.
- **Multi-variety (Validation Rules):** after picking a Field, Variety is **filtered to that field's varieties** and **several can be selected**. N tickets are created **per selected variety**.
  - The mock placeholder `Select a field first` agrees with this.
  - The **Data Dictionary contradicts it** ("Variety will not be filtered … all available varieties … from GP").
  - Validation Rules and the mock are more specific, so treat filter + multi-select as the requirement and note the conflict.
- **Field** dropdown is filtered by the selected **Site**. Picking a Field auto-fills its **Farm**.
- **Limit:** at most **100** tickets per plan.

## Web — ticket detail page (`/harvest-central/:id`)

**Live (2026-09-07):**
- Heading `Harvest Central: <Field>`.
- **Information** panel: `Grower`, `Farm`, `Season`, `Field`, `Variety`, `Hulling Location`, `Linked Project`.
- **Harvest Detail** grid columns, with a leading select checkbox: `Harvest Ticket No`, `Manual Ticket No`, `Load Type`, `Standard Quantity`, `Actual Weight`, `Driver Name`, `Truck License Plate`, `Front Trailer Plate`, `Rear Trailer Plate`, `Updated Date/Time`, `Updated By`.

**PSD v2 (Figure 3):**
- Breadcrumb `Home > Harvest Central > Ticket Detail`, `‹ Back`, top-right **`Post Ticket`**.
- The Information panel shows `Project` as a chip (e.g. `PRJ-000002`).
- Grid title **`Harvest Detail`** with a summary line, e.g. `4 planned · 0 in progress · 1 received · 0 posted`. Buttons **`+ Add New Ticket`** and **`+ Plan Harvest Tickets`**.
- Columns: `Harvest Ticket No.`, `Manual Ticket #`, `Load Type`, `Standard Quantity` (inline input, e.g. `44000`), `Actual Weight`, `Driver Name`, `Truck License Plate`, `Front Trailer Plate`, `Rear Trailer Plate`.
- **New `Fleet` column right after `Actual Weight`** (Fleet Mapping section; not drawn in the mock).
- Per-ticket **Edit** and **Delete**.
- Cell values:
  - Load Type `Set on site` until the ticket is captured.
  - Load Type chips `Split Load (Front)` and `Last Load`.
  - Actual Weight `Awaiting YHS` until YHS returns it.
- A **`Completed`** chip shows next to the ticket number once AgriWMS marks it Completed.
- **QR code:** each ticket gets a unique QR (truck, driver, truck plate, trailer plate, field, variety, date). It is shown on the detail screen with a **Download** option, so it can be sent via chat.

## Web — ticket view / edit drawer (PSD v2, Figures 5–6)

- Title **`Harvest Ticket <HT-no>`**. The system number is not editable.
- Context block: `Grower`, `Farm`, `Season`, `Field`, `Hulling Location`, `Project`, `Created`, `Received`.
- For a load that hasn't arrived, a notice reads: *"This load has not arrived yet — anything entered here pre-fills the on-site capture, and the crew can still change it at the gate."*
- Fields:
  - **`Manual Ticket #`** (placeholder `Manual paper no`, optional).
  - **`Load Type`**: checkboxes `Last load` / `Split load`.
  - **`Front Trailer License Plate`** (`Select front trailer`) and **`Rear Trailer License Plate`** (`Select rear trailer`).
  - **`Driver Name`** (`Select driver`) and **`Truck License Plate`**.
  - Standard quantity and attachments.
  - Driver and every plate are dropdowns from the fleet list.
- **Split load:** ticking it reveals radios **`Front trailer`** / **`Rear trailer`** (exactly one). The other trailer's plate is disabled and shows **`Not needed — split load`**.

## Mobile capture (PSD v2, Figures 7–13)

- **Entry points:**
  - Dashboard **`Harvest Central`** tile (`N Open Tickets`).
  - Bottom-bar **`+`** → bottom sheet `Choose an option`, with **`Harvest Ticket`** (*Capture plates, driver and load type on site*) and **`Observation`** (*Field note or issue report*).
- **Harvest Central (mobile):** search `Search field or variety`. Cards show `FIELD` / `VARIETY` / `PENDING HARVEST TICKETS` `x/y`.
  - A block opens with tabs **`In Progress (n)`** / **`Completed (n)`** and search `Search ticket, driver or plate`.
- **Queue** (`Harvest Tickets`, from `+`):
  - A plot selector (`PLOT · N IN QUEUE TODAY`) and search `Search ticket, plate, driver or grower`.
  - Each card shows the ticket number, `FRONT TRAILER PLATE` / `REAR TRAILER PLATE` and one next action: **`Add Trailer Details`**, **`Add Driver Details`** or **`Review & submit`**.
- **Form**: header `Harvest Ticket <HT-no>` / `<Field> · <Variety>`, two steps.
  - **Step 1 `Load type & trailers`:**
    - `Manual Ticket #` (`Manual paper no`), `Load type` → `Split Load` checkbox, `Front Trailer Plate` and `Rear Trailer Plate` (`Select plate`, searchable).
    - Buttons **`Next — driver & truck`** and **`Save & exit`**.
  - **Step 2 `Driver & truck`:**
    - Banner *"Trailer side was saved earlier — finish the driver and truck plate to submit."*
    - `Driver` (`Select driver`) and `Truck License Plate` (`Select plate`).
    - **`Last Load`** toggle (*Turn on if this is the final load from this plot*).
    - Buttons `Back`, **`Submit ticket`**, `Save & exit`.
- **Completed card:**
  - Load-type chip, `MANUAL # …`, both plates (`No trailer` when absent), `DRIVER`, `TRUCK PLATE`, `Updated <date time>`.
  - Reopen the card to correct a wrong driver or plate.
- **Offline:** tickets can be created and saved offline. They auto-sync when the connection returns, with no data loss.

## Load type rules (PSD Validation Rules)

- Load Type is **optional**. Without `Last Load` or `Split Load`, the system derives it per Field + Variety:
  - **`First Load`** when no earlier load exists for that pair.
  - **`In Progress`** for later loads (shown on web).
- Split + first gives **`First Load - Split Front Load`**.
- Values: `First Load`, `In Progress`, `Last Load`, `Split Load (Front / Rear)`. An uncaptured planned ticket shows **`Set on site`**.
- **Split options** (`Front trailer` / `Rear trailer`) appear **only** for Split Load, not for First, Last or blank. You can pick only one of them.
- **Last Load already exists:** submitting another Last Load for the pair prompts **`A Last Load already exists`**.
  - Prompt text: *"<Field> — <Variety> already has a Last Load ticket. Submitting this one as Last Load moves the earlier ticket back to In Progress."*
  - Buttons `Cancel` / `Confirm`. On Confirm, the earlier ticket reverts to In Progress.

## Other business rules (PSD)

- **Validate at posting, not at save.** A ticket missing required posting data saves, but posting is blocked until the data is complete.
- **Posting needs a project link.** Unlinked tickets cannot be posted. Once YHS has completed the ticket and it has posted to ERP, a posted status shows in AgriERP. ERP posts the actual weight (FC document).
- **Edit / delete only before YHS Completed.** Edits, plate or driver corrections and voids before completion sync to YHS. After `Completed`, the ticket is read-only and cannot be deleted.
- **Actual Weight is read-only.** It comes from YHS and cannot be edited in AgriERP.
- **Fleet auto-fill:** picking a Truck fetches its Fleet. The Fleet is sent to YHS on submit.
- **AgriWMS sync:**
  - On submit, ticket data and attachments go to AgriWMS. Edits and deletes are sent too.
  - AgriWMS returns the status (`Received`, `Completed`), its attachments (weight certificate) and the actual weight/quantity.
- **Grower Portal (GP):** supplies varieties. Grower and Field data are synchronized from it.
- **Ticket number:** auto-generated and unique, built from **Field unique number + random number + Crop Year**. The random part is unique per Field + Crop Year.
  - Example **`HT-321-HB12-26`**.
  - The mocks show `HT-0004` and the Data Dictionary says "Auto increment", but live QA uses the PSD format (`HT-130-N5F4D-26`, 2026-10-12).
- **Manual Ticket Number:** optional. It is in the web drawer, is the first field of the mobile form, and has its own column on the detail table.
- **Audit trail:** ticket logs appear in notifications and the **view all logs** screen.
- **R2 (future):** licence-plate scanning to fill truck and trailer plates.

## Data dictionary (PSD, condensed)

| Field | Source | Notes |
|---|---|---|
| Grower, Farm, Season | Active harvest context | Read-only on the form |
| Hulling Location | Default value | e.g. `YHS` |
| Field | Web / Mobile | Filtered by Site |
| Variety | Web / Mobile (GP master data) | See the multi-variety conflict above |
| Load Type | Web / Mobile | Optional, Enum |
| Split Load Option | Web / Mobile | `Front trailer` / `Rear trailer`, only with Split Load |
| Manual Ticket Number | Web / Mobile | Optional string |
| Driver Name, Truck License Plate, Front / Rear Trailer License Plate | Web / Mobile | Fleet list (searchable); trailers can be "no trailer" |
| Standard quantity | Web / Mobile | Integer input |
| Actual weight | YHS | Read-only |
| Load Type status | System | `Set on site` before capture |
| Updated By, Updated Date/Time | System | Last editor |
| Harvest ticket ID | System | See the ticket-number note above |

## Harvest WO in the PSD (cross-ref)

- Harvest WOs follow the **ad-hoc** WO process. They are created in the Farm App, not from a D365 planned task.
- Creating one adds an ad-hoc task to the job's **WBS Task Lines** in D365, with **no budget, time or date**.
- The PSD mock still shows `Task Type*` = `Planned` (matches live), and plots tagged `ADHOC`.
- The detail mock's Plots grid includes `Target Quantity`, `Crop Variety` and `Spent Hours`.
- The Resources header shows `N hour log change requests awaiting · Review all` (see `hour-log-adjustment.md`).

## Varieties seen live

`ALDRICH`, `MONTEREY`, `BENNETT-HICKMAN`, `AVALON`, `BOOTH`, `BUTTE`, `CARMEL/MONTEREY`, `NONPAREIL`, `PADRE`, `LIVINGSTON`, `FIELDRUN_ALMOND`, `FIELDRUN_PISTACHIO`. The PSD mocks write them as `Almond - Nonpareil`, `Almond - Monterey`.

## API

`HarvestCentral` tag (`vannbrosphasetwo-vann-api-qa`, `reference/HarvestCentral.md`):
- List / header / tickets: `GET /api/HarvestCentral`, `/{id}`, `/ticket/{id}`, `/tickets/{ticketId}`.
- Ticket CRUD: `PUT` and `DELETE` (void) on `/tickets/{ticketId}`; `POST /tickets` creates.
- `POST /tickets/plan`, `/tickets/link-project`, `/tickets/post`.

`HarvestTicket` and `WMSIntegration` tags cover the older ticket and AgriWMS endpoints. Swagger refreshed 2026-10-12: no HarvestCentral changes. The ticket model already carries `fleetID`, `driverID`, `truckID`, `frontTrailerPlateID`, `rearTrailerPlateID`, `isSplitLoad` + `splitLoadOption`, `isLastLoad`, `manualTicketNumber`, `standardQuantity`, `actualQuantity` and `attachments`. The plan model has a single `cropVarietyID` (no multi-variety).

## Not yet established

- When the web plan panel ships the v2 / #26493 design (`Plan Incoming Loads`, multi-field, multi-variety, project per plot). The backend already takes `fields: [...]` (2026-10-16).
- The `Fleet` column, the QR **Download**, and the mobile v2 capture flow (not checked; web only).
- Whether a ticket binds to a specific harvest WO. PSD Business Cases say "linked … later", but describe no control for it.

## QA / automation

- Test plan: [`playwright/test-plans/authenticated/harvest-central.md`](../../../../playwright/test-plans/authenticated/harvest-central.md). It holds the workbook ids HC-001..047 plus the PSD v2 cases HCP-xx (web) and HCM-xx (mobile).
- Spec: `playwright/tests/authenticated/harvest-central.spec.ts` (non-mutating). Workbook HC-001/002/008/009/010 and PSD HCP-10, 11, 13, 15/16, 23, all passing on Firefox 2026-10-12. Page object: `tests/pages/harvest-central.page.ts` (`openDetail`, `openEditDrawer`, `panel`, `cancel`).

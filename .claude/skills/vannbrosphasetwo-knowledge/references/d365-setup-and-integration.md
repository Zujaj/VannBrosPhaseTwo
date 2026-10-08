# D365 F&O Setup & AgriERP Integration (training recordings)

> **Provenance — lower authority.** Distilled from three AI-summarised training-session transcripts in `resources/video-transcripts/`:
> - `VB Phase 2 Release 2 - ERP Overview - 2025_11_27 …` — D365 master-data setup (session 1).
> - `D365_FinOps_AgriERP_MasterData_WBS_Overview.md` — D365 parameters, master data, projects/WBS.
> - `VB Phase 2 Release 2 - Agrierp Work Order Overview - 2025_12_16 …` — end-to-end WO lifecycle across the Farm App, Inventory App and D365.
>
> The summaries contain transcription noise ("Material Atom Groups", "generals"/"generics" = **journals**, "Certified" operations) and predate later builds. **User manuals and live-observed facts in the other references win**; use this file for the *why* and the D365 back-office picture, and verify labels live before putting them in a test or doc. Known disagreements are listed at the end.

## BC → D365 F&O: what changed

| Topic | Business Central (Phase 1) | D365 F&O (Phase 2) |
|---|---|---|
| Land hierarchy | Grower → Site → Location → Field held in ERP | ERP holds a flat **Plots & Fields** list synced from AgriERP; AgriERP keeps the full hierarchy (Grower → Site → Farm → Field/Plot) |
| Seasons | Dimensions | Dedicated **Crop Year** setup (e.g. Crop Year 25/26/27); projects tracked against it |
| Operations | Master tasks with pre-budgeted planning lines | **Farm Operations** are plain master records (Planting, Fertilization, Irrigation…), no pre-configured planning lines |

## AgriERP parameters & setup in D365

Navigation: `AgriERP Management > Setup > AgriERP Parameters` (session 1 places the module under Product Information Management → AgriERP Management).

- **Project edit/status controls** — the project status after which edits are locked (e.g. past `In Process` → `Finished`).
- **Project sync stage / Farm App syncing level** — the project status that triggers sync to the Farm App (on creation, at `In Process`, or at `Finished`). Work orders can only link to projects in **`In Process`**.
- **Item group mapping** — only configured item groups sync, and they drive which Farm App dropdown an item appears in: crop items (harvested yield / semi-finished, group 4) vs materials (liquid fertilizers, chemicals, soil amendments, group 6).
- **Default journals** — Project Item Journal, Expense Journal, Inventory Issue (`INV-ISSUE`) and Inventory Return (`INV-RECV`) journal names and batch-number formats.
- **Staging warehouse / staging location** — where dispatched inventory is received (the "field" side of the shed → staging transfer).
- **Irrigation methods** — maintained in AgriERP, synced to D365, assigned per plot.
- **Farm Operations** — maintained in D365 (ID, status, name, type), synced to AgriERP; only operations in the syncable status are sent. Each operation has a **farming activity** with its own dimensions (e.g. commodity).
- **Plots** — maintained upstream in AgriERP (new field: **Irrigation Source**). Plot dimensions (area, cost center, field) are created separately from the plot and **auto-populate onto a project** when that plot is selected for it. See [`plots-fields.md`](./plots-fields.md) for the Farm App side.
- **Crop Area** — code, description, start/end date, dimensions (Forecast Model: future, unused).

## Resources (D365)

Navigation: `Organization Administration > Resources > Resources`. Farm App side: [`users-resources.md`](./users-resources.md).

| Type | Linked Worker | Usage unit / cost |
|---|---|---|
| **Human** (personal) resource | **Required** — an active Worker in D365 HR | Hours (`hrs`), cost per hour; designation (Operations Manager, Machine Operator…), standard hours, calendar |
| **Machine / Implement** | Not required | Per hour or per acre (e.g. $10/acre × acres), unit cost, calendar |

- **Resource groups** carry a custom **Resource Group Type** mapped to AgriERP types (Farm Hand, Machine Operator, Machine, Implement…) and need a calendar (standard 8-hour) to sync.
- Resource costs currently post through an **expense** category; hour-based journaling was raised as a future enhancement.
- **Rule (Farm App):** a WO with a **Machine** asset must also have a **Machine Operator** resource; a Farm Hand cannot run machinery alone. A WO can carry several resources. A machine is a tractor; an implement is attached to it (cultivator, sprayer).

## Products & inventory

Navigation: `Product Information Management > Released Products` (create product → item model group → units → storage & tracking dimensions → release to `VBS`).

| Class | Location | Tracking | Handling |
|---|---|---|---|
| **Lot-tracked** (chemicals) | Chemical Shed (`CHMCLSHED`) | Batch mandatory | Must be **dispatched** (shed → Staging) via the Inventory App before consumption |
| **Non-lot** (liquid/dry fertilizers, soil amendments) | Yard / umbrella locations | None | Consumed directly, no dispatch |
| **Crop / fresh goods** | Fields / harvest sites | Lot or standard | Harvest output |

- Storage dimension (site / warehouse / location) is mandatory on every transaction.
- Batches belong to one item; opening stock uses manually created batches. Receiving lot items in the Inventory App enforces a batch.
- Item model group uses **FIFO**. **Usage unit** (field application) vs **base unit** (inventory) with a conversion factor.
- **Budgeted quantity = rate per acre × operational area (acres).**

## Projects & WBS

Navigation: `Project Management and Accounting > Projects > All Projects`.

- Projects use the **Time & Material** project group. The **AgriERP** tab links the project to **Plot**, **Crop Year**, **Crop Type** and **Irrigation Method**.
- One field can hold several projects (e.g. a 100 ac field split into 10, or 50 % almonds / 50 % walnuts); one WO can span several plots and projects. Projects close annually; the acreage then returns to the available pool.
- **WBS** = the project's farm operations. Execution is **ad-hoc** (no budget baseline): creating a WO in AgriERP adds an ad-hoc WBS task carrying the WO id (e.g. *WO 58* under *Fertilization*).

## End-to-end WO lifecycle across systems (Dec 2025 walkthrough)

1. **Author (web)** — header: Start/End Date (targets only; execution outside them isn't blocked), Priority (main list sort key), Farm, Task (from Farm Operations; inspection tasks don't appear for execution WOs), Supervisor (opens/manages/closes the WO), optional Responsible Person. Plots link to `In Process` D365 projects. Observations can be converted into an inspection or execution WO (see [`observations-chat.md`](./observations-chat.md)).
2. **Open (mobile)** — the Supervisor opens the WO from `To Do`; workers can't start timers or consume materials until then. A WO can be recalled and edited until it is `In Progress`.
3. **Dispatch (Inventory App)** — Chemical Shed staff dispatch lot-tracked chemicals from the WO list or by scanning the batch QR code → D365 **Transfer journal** `INV-ISSUE`, `CHMCLSHED` → `Staging`. They **may dispatch more than budgeted** (e.g. 150 for a 135 budget) to allow for returns.
4. **Execute (mobile)** — start job (timer), pause to log completed acres and material consumed; consumption maps to `Staging` (chemicals) or `Yard` (fertilizers). Ending the WO sends it to review.
5. **Approve (web)** — the Operations Manager checks progress/quantities and approves → `Done` → D365 **Project Item Journal** on the project's WBS line; lot items consumed from `Staging` by **FIFO** across dispatched batches, valued at **latest cost price** (reconciled at inventory close). Machine usage posts as project expense at unit cost per acre/hour.
6. **Return** — unused chemicals are scanned back at the shed. If the returned batches differ from the FIFO assumption, D365 first posts an **Inventory Adjustment journal**, then the **Return Transfer journal** `INV-RECV` (`Staging` → `CHMCLSHED`). Journal review steps: [`journals-postings.md`](./journals-postings.md).

## Disagreements with live / manual facts

| Transcript says | Current reference says | Treat as |
|---|---|---|
| Statuses `To Do → Open → In Progress → In Review → Done` | Web chips `Draft → Queue → To Do → In Progress → Review → Done` ([`work-orders.md`](./work-orders.md)) | Web labels per `work-orders.md`; "Open" is a mobile Supervisor action — confirm on mobile before testing it |
| WO types "Execution (Default/Mix)" and "Inspection" | Planned, Tank Mix, Inspection, Harvest | Use the four app types |
| Labor cost goes via monthly payroll export (PayCom), not hour journals | Approval triggers `PlanningLinePostingHourLogJob` → `PEJ` expense journal (live QA) | Live behaviour wins; the hour-log job posts expense journals now |
| Session 1: "Machine Operator" resource group represents machines | Machine Operator is a human role/group | Treat as transcription error |

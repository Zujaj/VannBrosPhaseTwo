# AgriProduction (Processor) — YHS Production Management

> **Source:** `resources/yhs/AgriProduction Product Spec Document (Processor).md`
> (title: "AgriProduction Production Management — For Nut Processors - Desktop, Kiosk & Tablet App").
> **Version:** V 1.0, released 10-Mar-26 by Aqib Malik ("Initial Release"). The doc also has a
> section "Updates: Version 1.1 (Draft)" with screen-level specs (no date or author given).
> **Status:** Spec-level only. Not yet live-verified. Prototype URLs are listed in the spec (section 13).
> Many details live in embedded spreadsheets and FDDs that are **not** in the markdown (see section 15).

---

## 1. Module overview

- AgriProduction (for Hullers) is a production management system for agricultural hullers / nut processors.
- It covers the in-plant lifecycle: **precleaning** and **production runs** (hulling and shelling), yield
  tracking, by-product handling and finished goods output.
- It integrates with **Dynamics 365** (ERP), **AgriWMS** and **AgriQuality**.
- Two applications:
  - **Web Application (Huller)** — Production manager.
  - **Kiosk/Tablet Application (Huller)** — Production supervisor and line production floor workers.
- Hardware in scope: weighing scales, barcode/QR scanners, label printers.
- Login: scan of a job card, or a **4 digit pin**. No email / password login.

**In scope (V1.0):** precleaning; production (hulling and shelling); intake of raw materials or rejects
from handlers; batch/lot tracking of inputs, in-production inventory, output, yield and by-product;
output (kernels and inshells) in bins or bulk by chute; by-products/rejects (e.g. hash); new bin IDs
and reuse of previous ones; role-based access; tank status management (e.g. Full, In Use, Empty, Closed),
logged with user and timestamp; duration of each production and preclean order; ERP, AgriWMS and
AgriQuality integration.

**Out of scope (V1.0):** posting cost of consumption on the production order to ERP; IoT automation.

## 2. Roles

| App Access | Role | Responsibility (from spec) |
|---|---|---|
| Web App | Production Manager | Monitors precleaning; creates production orders for hulling and shelling; closes tanks; completes the order. Prints / reprints tank tickets. Assigns operators. |
| Kiosk/Tab App | Production Supervisor | Creates and executes precleaning jobs; starts and pauses / stops production jobs; closes or removes tanks; can void bins; can execute a production order on behalf of a floor worker. |
| Kiosk/Tab App | Floor Workers | Execute assigned production jobs by recording output. Check in / check out. Print and attach labels. Capture weights. |

- Personas: Sarah (Production Manager), David (Production Supervisor), Carlos (Floor Worker).
- Permissions are defined in the embedded **YHS Prod - Permission Matrix** spreadsheet (not in the markdown).
- Floor workers see only `Running/Active` production orders.
- Pre-clean jobs are visible to all supervisors. A job continues across shift changes.

## 3. High-level modules

| Module | Platform | Key features |
|---|---|---|
| Dashboard | Both | Live KPIs: Production, Shipment & Inventory |
| Production | Both | Scale capture, manual weight capture, label printing, new Bin ID generation, tank ticket, Bin ID label and trailer LP scanning, chute mapping with product type & packaging type, ERP integration |
| Inventory | Both | By stage: Field run almonds, Inshells, Kernels and Rejects. Conventional & Organic. On hand views |
| Pre-clean | Both | Scan stockpile/load tickets, start/stop pre-clean, print/reprint tank tickets |
| Scanner | Both | Stockpile/load ticket, tank ticket, Bin & Bin serial label, trailer licence scanning |
| Reports | Web | Production runs, Pre-clean runs, Bins created, Stockpile Inventory, Planned for Production Inventory, Production Duration, by grower / field / variety |
| Profile | Both | Language, Security (Password & Pin), Preferences, Sign-out |
| Settings | Web | Master Data Management, User Management, Label Designing |

**Common UI features:** column hide/show saved as user preference; column sorting saved per user;
table view and card view; dropdowns for growers, handlers, product type, variety, farming type
(organic / conventional), locations; scanner camera for QR, LP and employee badge; widgets for
weighing scale and KPIs; accordions / sections.

## 4. Pre-cleaning workflow (Kiosk/Tab, Supervisor)

1. Open the Pre-cleaning module. Click `Create Pre-Clean Job`.
2. Select Harvest Load ticket(s) manually or scan the barcode.
   Only tickets in **staging** status are shown. Multiple same-GFV selections are allowed.
3. Decision `Select tank now?`
   - Yes → select a tank (only **empty** tanks shown). Tank ticket is auto-generated.
   - No → job is created without a tank ticket. Select the tank later; the ticket is generated then.
4. Optional: change tank and print a new tank ticket.
5. Start the pre-clean job. Driver unloads field run almonds into the pit.
6. Supervisor completes the job when the tank is filled.
7. On completion, field run almonds become cleaned almonds in the selected tank.

**ERP integration:**

| User step | ERP action |
|---|---|
| Pre-clean job created (with or without tank) | Batch order creation |
| Pre-clean job started | Batch order Started |
| Job completed | Post Picking list, RAF journal, Route card, End Batch order |

### Pre-clean job statuses

| Status | Meaning | Where seen |
|---|---|---|
| `Planned` | Created, not started | Web + Kiosk |
| `In Progress` | Being executed | Web + Kiosk |
| `Completed` | Finished | Web + Kiosk |
| `Job Stopped` | Shown as a non-executing state on the kiosk job header ("Planned / Job Stopped") | Kiosk |
| `Pre-Clean Running` | Example label on kiosk execution header | Kiosk |

Load ticket usage status example: `Used`. Tank status example after job: `Closed`.

## 5. Pre-Clean — Web (Manager)

### Main screen
- Summary tiles: `Total Jobs`, `Planned`, `In Progress`, `Completed`.
- Search by Job Number, Grower Name, Variety or Ticket Number.
- Filters: Job Status (Planned, In Progress, Completed), Grower, Variety, Field, Date Range (From Date – To Date).
- Actions: `New Job`, `Export`.

| Grid column | Example |
|---|---|
| Job Number | PCJ-00048 |
| Date | 01/03/2025 |
| Created By | Emily Davis |
| Job ID | PC-0126 |
| Ticket Number | HT-45321-001 |
| Grower | Anderson Farms |
| Variety | Nonpareil |
| Equipment | Pre-Cleaner #1 |
| Processed Quantity | 45,000 lbs |

### Creation screen (`Create Pre-Clean Job`)
- Stepper: **Tickets, Tank, Configuration, Done**. Only Step 1 (Tickets) and Step 2 (Tank) are described.
- Step 2 selects the **empty** storage tank for the cleaned almonds.

| Field | Behaviour |
|---|---|
| Scan Ticket | Scan load ticket barcode; retrieves grower, field, variety, load info |
| Browse Tickets | Pick from list of eligible field run tickets |
| Scan Load Ticket Area | Scan area for mobile device or scanner |
| Manual Ticket Entry | Type ticket number, then `Add` |
| Cancel | Close without saving |

### Details screen (Pre-Clean Job Summary)
- Header: `Pre-Clean Job Number`, `Job ID`, `Status`, `Print Tank Ticket`, `Reprint`.
- Metrics: `Expected Weight`, `Processed Weight`, `Equipment`, `Operators` (count).
- Load Ticket section: Ticket Number, Grower, Field, Variety, Handler, Driver, Carrier, Truck / Trailer,
  Gross Weight, Tare Weight, Net Weight, Location (e.g. Stockpile Area A), Status (e.g. Used).
- Destination Tank: Tank Number, Tank Code (TK-T01), Plant, Assignment ID, Variety, Grower,
  Run Type (e.g. `Meats`), Tank Fill Indicator (e.g. "135k lbs stored"), Tank Status (e.g. Closed).
- Assigned Operators: name + identifier (e.g. David Luke – USR-001).
- Timeline: `Created`, `Started`, `Completed`, `Tank Ticket Generated` (e.g. TKT-9738873).

## 6. Pre-Clean — Kiosk/Tablet (Supervisor)

### Dashboard
- Button `Create Pre-Clean Job`.
- Jobs Summary: `Active Jobs`, `Running`, `Planned`.
- Job list: Job Number, Status, Grower & Variety, Ticket Information (ticket, load weight, date), navigation arrow.
- Status indicators: `Planned`, `In Progress`.

### Creation
- Search placeholder: "Search by ticket, grower, variety, field."
- Available tickets indicator, e.g. "4 tickets available."
- Job header: Job Number (PCJ-80951), Grower and Variety, Job Status.
- Job Details: Grower, Variety, Ticket Number, Equipment, Expected Weight.
- Load Tickets: Ticket Number, Grower, Variety, Load Weight.
- **Matching rule:** all tickets on a job must have the **same grower and variety**. A visual indicator confirms it.
- Destination Tank: Tank Number and Code, Plant, `Change` option (only empty tanks, "to prevent inventory mixing").
- `Start Pre-Clean Job`: status Planned → In Progress; tracking of processed weight and duration starts.

### Execution / details
- Header: Pre-Clean Job Number, Grower and Variety, Pre-Clean Status.
- Current Progress: Processed Weight (e.g. "527 lbs processed"), Duration (elapsed since start).
- Load Tickets: Ticket Identifier, Grower, Variety, Load Weight, `Add Ticket`, Matching Criteria
  (Grower + Variety must match), Available Tickets.
- Destination Tank: `Change Tank` (empty tanks only).
- Status, with created date (e.g. "Created – 01/03/2025").
- Actions: `Start Job`, `Stop Job`, `Complete`.
- `Complete`: processed almonds finalized against the tank; status → Completed; weight and tickets recorded.

## 7. Production workflow (hulling / shelling)

| # | Actor | Step | ERP action |
|---|---|---|---|
| 1 | Manager (Web) | Create production order: date, output type (Inshell or Kernel), product type (Bin or Bulk) | — |
| 2 | Manager | `Scan tank ticket now?` Yes → scan / enter Tank ID (same GFV allowed). No → select tank later | — |
| 3 | Manager | Optional: assign resource. Does **not** bind the order to that resource | — |
| 4 | Manager | Create Production Run / Order | Batch Order created |
| 5 | Supervisor (Kiosk) | If no tank yet, scan / select tank ticket(s). Start Production Order | Batch order starts |
| 6 | Floor Worker | Select order, select chute (before or after scan), scan bin tag / trailer LP | — |
| 7 | Floor Worker | Capture tare & gross by chute type; print label | Update Registration |
| 8 | Supervisor | Close tanks (**mandatory** — "otherwise production will not end"); end Production Order | — |
| 9 | Manager | Mark `Complete` | Batch Order completed, Post Picklist, RAF, Route card |

- Supervisor can void bins created by mistake (ERP: Update registration / Update RAF Registration).

### Chute types and weight capture (Floor Worker journey)
The system fetches bulk vs bin and kernel / inshell / reject from the chute **mappings**.

| Chute directs | Tare | Gross | Label |
|---|---|---|---|
| Kernels in Bins | Auto (scale) | Auto after fill | Worker prints and attaches label |
| Inshells in Bulk (trailer) | Front scale or from database | Front office captures | System generates **Bulk load tag** |
| Inshells in Bins | Auto (scale) | Auto after fill | Worker prints and attaches label |
| Rejects in Bins | Manual entry | Manual scale, manual entry | Worker prints and attaches label |

Kiosk chute examples: `Production Chutes` (inshell / kernel, bins or trailers), `Rejects – 3U`
(oversized, typically weighed manually), `Rejects – Hash` (broken / fragmented), `Rejects – Dust`
(dust / fine material). Each chute card shows material type and manual vs scale-driven weighing.

## 8. Production — Web (Manager)

### Main screen
- Summary: `Total Orders`, `In Progress`, `Planned`, `Completed`.
- Search: Run Number, Grower, Field, Variety, Tank#, Output.
- Filters: Status (Planned, Pending, In Progress, Completed), Product Type (Kernel, Inshell), From Date, To Date.
- Every column supports filter and sort; columns can be hidden / shown.
- Action: `New Order`.

| Grid column | Example |
|---|---|
| Run Number | RUN-00055 |
| Date | 12/29/2024 |
| Created By | Joyel Ibara |
| Product | Clean Field Run |
| Output | Kernel, Inshell (colour coded) |
| Grower / Field / Variety | Anderson Farms / Field A-1 / Nonpareil |
| Tank Ticket# | T-001 (consumed tank ticket) |
| Net Weight | 1,000 Lbs (total produced) |
| Status | Colour coded |

### Creation screen

| Field | Rule / values |
|---|---|
| Production Date | **Mandatory**; calendar picker (e.g. 03/16/2026) |
| Output Item | Kernel, Inshell |
| Product Type | Bin, Bulk |
| Scan Tank Ticket | Scan or manual Tank ID |
| Assign Resources | Optional; at creation or execution (e.g. "David Luke – Machine Operator") |
| Cancel | Close without saving |
| Create Run | Creates the run |

### Details screen
- General Details: Handler (e.g. Central Valley Processing), Grower, Field, Variety, Run Type, Load Bins,
  Field Weight, Bin Weight, Start Date.
- Assigned Tanks: Tank Number, Ticket Number, Grower, Field, Variety, Net Weight, Status.
- Production Flow: Incoming Field Run Weight, Produced Output Weight, Field Intake Indicator (%), Active Tanks.
- Yield metrics: `Current Turnout` (system calculated), `Standard Turnout` (e.g. 80.00%), `Actual Yield` (e.g. 4.01%).
- Chutes: bin count and weight (e.g. "3 bins – 1,955 lbs").
- Processed Bins for Run:

| Column | Example |
|---|---|
| Sequence Number | 1, 2, 3 |
| Container ID | CNT-001, TRL-045 |
| Bin ID | BIN-000123 |
| Product | Inshell, Kernel |
| Bin Type | Bin, Bulk (Trailer) |
| Chute | Chute-1 |
| Tare / Gross / Net Weight | 200 / 1,200 / 1,000 lbs |
| Status | `Pending Weight`, `Completed` |
| Date / Time | 01/02/2025 / 10:45 AM |
| Update Weight | Capture / update weight from scale |

## 9. Production — Kiosk/Tablet (Supervisor / Floor Worker)

- Production Dashboard grid: Run Number, Run Status (`Running`, `Planned`), Bin Count, Variety, Grower,
  Produced Quantity, Production Date, navigation arrow.
- Production Run Execution header: Run Number, Status, Grower and Variety, Bins Produced,
  Total Weight Produced, `Scan Tank` (add another tank), `Stop`.
- Run Information: Handler, Grower, Field, Variety, Product, Bin Type.
- Assigned Tanks: Tank Number, Ticket Number, Grower, Field, Variety, Net Weight, Status (e.g. `In Use`),
  `Close` (when fully consumed), `Remove`.
- Chutes (see section 7).
- Weighing Station: Scale Connection Status, Weight Display, `Scan Container Bin`.
  Sequence: **Scan → Tare → Gross → Net**.
- Bottom `Production Running` indicator; `Stop Production` ends the run and finalizes records.

## 10. Bin tags, labels, void

- **Generate and print bin tag:** floor worker scans the container bin tag. If missing or damaged, click
  `Generate New`. The system generates the tag sequentially and assigns a Bin Label ID.
  **Only the Web Manager can print the Bin Tag.**
- Manager: when a bin tag is missing, scan the Bin Label ID or click `Print Label`. The system prompts
  for `Bin Tag` or `Bin Label ID`; choose `Bin Tag`.
- **Void bin** (Manager or Supervisor): open the bin in the production order → `Void` → bin removed →
  ERP: Update RAF Registration.
- Label Designing sits under Settings (Web). No further detail.

## 11. Formula

- `Net Weight = Gross Weight (from scale) - Tare Weight (from scale)`.
- No formula is given for `Current Turnout`, `Standard Turnout` or `Actual Yield`.

## 12. Master data and settings

| Master data | Source (quoted) | Access |
|---|---|---|
| Growers | Sync from Grower Portal to ERP and AgriWMS & Agri App | Read Only |
| Handlers | Sync from Grower Portal to ERP and WH & QC App | Read Only |
| Fields | Already in AgriERP or GrowerPortal need to sync to Apps | Read only |
| Items | Item basic data will sync from ERP to Apps | Read Only |
| Variety | Item basic data will sync from Growers Portal to Apps | Read Only |
| Locations | Created in Apps and sync to ERP to Apps | Read Only |
| Trailers | Only in Apps | Read Only |
| Equipment | — | CRUD |
| Chutes | — | CRUD |

- Settings (Web): User Management (create users, assign roles/permissions, activate / deactivate),
  Master Data Management, Label Designing.
- Data rule: master data created in any app (AgriERP, AgriWMS, AgriQuality, AgriProduction) must be
  available in all of them. Users must not recreate data.

## 13. Integrations

- **ERP (Dynamics 365)** — batch orders. FDDs (not in repo):
  - `03-FDD-Almonds Precleaning Batch Order Creation Integration.docx`
  - `04-FDD-Precleaning and Tank Storage BO Integration.docx`
  - `05-FDD-Hulling and Shelling BO Integration.docx`
- ERP touchpoints: Batch order creation / start / end; Post Picking list (Picklist); RAF journal;
  Route card; Update Registration (per bin weight); Update RAF Registration (bin void).
- "ERP synchronization to update production output and consumption data in real time."
- **AgriWMS / AgriQuality:** named as integrated systems. No field-level contract in the spec.
  Future: "Closer integration with QC to generate automated quality orders."
- **Grower Portal:** source of Growers, Handlers, Variety (and Fields with AgriERP).
- **Harvest / load tickets:** pre-clean input is "Harvest Load ticket(s)" / "stockpile ticket(s)" /
  "field run tickets" (e.g. HT-45321-001) in **staging** status.
- Prototype links: Web `https://agrierp-production-vb.folio3.site/production`;
  Kiosk/Tab `https://agrierp-production-mobile-vb.folio3.site/`.

## 14. Glossary

| Term | Meaning in this spec |
|---|---|
| Field run (almonds) | Almonds as delivered from the field, before pre-cleaning |
| Pre-clean | Removes debris from field run almonds and fills a tank |
| Tank ticket | Ticket generated when a tank is assigned to a pre-clean job (e.g. TKT-…, T-001) |
| GFV | Not expanded in the spec; used as "same GFV allowed" for tickets and tanks (likely Grower / Field / Variety — unconfirmed) |
| Production run / order | Hulling or shelling run consuming tanks, producing Inshell or Kernel (e.g. RUN-00055) |
| Inshell / Kernel | Output items of production |
| Bin / Bulk | Product Type: bins, or bulk in a trailer |
| Chute | Output stream of the line, mapped to product and packaging type |
| Rejects – 3U / Hash / Dust | Reject chutes: oversized / broken / fine material |
| Bin Label ID / Bin Tag | Sequential ID assigned on `Generate New`; tag printed by Web Manager |
| Trailer LP | Trailer licence plate, scanned for bulk output |
| Bulk load tag | Tag generated for inshell bulk trailer loads |
| Turnout / Yield | Standard vs current turnout and actual yield on the run |
| Batch order, RAF, Route card, Picklist | D365 production postings triggered by app actions |
| Handler | Facility / entity processing the run (also delivers rejects) |
| Run Type `Meats` | Example run type on a destination tank |

## 15. Open questions / ambiguities

1. Requested topics **not covered** in the spec: separate hulling vs shelling steps; "picking for processing"
   as a screen; hulls / shells as named by-products; lot numbering; detailed label layouts.
   Only "Picking list / Picklist" posting to ERP is mentioned.
2. Embedded spreadsheets are not in the markdown: Data & Mappings, Required Fields, Permission Matrix,
   Errors / Validations / Notifications, Formats, List of Statuses, Master Data Structure. Exact
   validations, error texts and the full status list are therefore unknown.
3. Production status lists differ: Web filter has `Planned, Pending, In Progress, Completed`; Kiosk shows
   `Running, Planned`; floor workers see `Running/Active`. `Pending` is not defined.
4. Pre-clean stepper names 4 steps (Tickets, Tank, Configuration, Done); only 2 are described.
5. Kiosk creation "Tank Selection" says the tank "represents the loads that will be processed" — wording
   conflicts with tank as destination.
6. Ticket rules conflict: "multiple same GFV selections" vs "same grower and variety" matching rule.
7. Yield formula absent; example `Actual Yield` 4.01% vs `Standard Turnout` 80.00% is unexplained.
8. Who ends production: Supervisor "ends" the order; `Stop` / `Stop Production` "finalizes records";
   Manager marks `Complete`. Exact status transitions not specified.
9. Supervisor journey says the kiosk user navigates to Production "in AgirProduction Web App" — likely a typo.
10. Web pre-clean `New Job` mentions assigning equipment and "processing parameters"; no equipment field
    is listed in the creation table.
11. Profile lists "Password & Pin" while login allows only card scan or 4 digit pin.
12. Tank statuses (Full, In Use, Empty, Closed) are given as "e.g."; full list unknown.
13. Input of "rejects received from handlers" is in scope but has no screen or flow.

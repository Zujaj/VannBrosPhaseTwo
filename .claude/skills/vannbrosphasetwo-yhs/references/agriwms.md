# AgriWMS (Processor / Huller) — Warehouse Management Product Spec

> **Source:** `resources/yhs/AgriWMS Warehouse Management Product Spec.pdf` (86 pages; pp. 68–86 are screenshots only).
> **Version:** V 1.2 · **Author:** Junaid Mahmood (Folio3) · Revisions: 1.0 = 12-Feb-26 (initial), 1.1 = 16-Mar-26 (Inventory, Locations), 1.2 = 27-Mar-26 (Receiving, Shipment, Truck Check-In, Bulk Weighing, Empty Bins, Handler Bin IDs).
> **Spec-level.** Sections 1–14 come from the spec tables. Section 0 records what the live QA app showed on 2026-10-19; where they differ, **the live label wins** for tests and docs.
> The sibling `AgriWMS Warehouse Management Product Spec.md` holds the AgriProduction spec, not this one. Do not use it.
> Prototype: Web `https://agrierp-wms-vb.folio3.site/` · Mobile/Tablet `https://agrierp-wms-mobile-vb.folio3.site/`.

---

## 1. Module overview

AgriWMS (for Hullers) is a WMS for agricultural hullers/processors (YHS). It digitizes the post-harvest process:
receiving from growers, scale weighing, stockpile management, fumigation tracking, in-plant inventory movement,
and outbound shipments to handlers. Goal: traceability "field ticket → huller intake → processing → shipment".

**In scope**
- Digital warehouse management for nuts (almonds etc.).
- Receiving of raw field-run almonds from growers.
- Drivers, trucks, trailers (incl. tare weights) for inbound and outbound.
- Movement across stockpiles, tanks, staging locations.
- Shipment by bin tracking and container loading via scanning.
- Role-based users (front office, warehouse ops, field teams).
- Real-time reporting, incl. grower/handler inventory visibility.
- ERP sync at receiving, shipment and inventory movement.
- Tank management on Mobile/Tablet: statuses `Full`, `Empty`, `Closed`. Every change syncs to the production app with user name and timestamp.

**Out of scope:** financial accounting / grower payments; external carrier booking; IoT automation (future).

**Summary core features (p.5–6):** digital field ticket capture and grower validation; scale integration;
stockpile recommendation; inventory by stage (Field Runs, Pre-Cleaned, Inshells, Kernels, Rejects); shipment with
full truck lifecycle; "as of date" on-hand view; blocking/lock of movement between locations; shipment tracked by bin
and container quantities. "Offline support for field operators with delayed sync" is **struck through** in the PDF (p.6).

### Apps

| App | Users |
|---|---|
| Web Application (Huller) | Shipment team, Receiving team, Warehouse Ops team |
| Mobile & Tablet Application (Huller Yard Supervisor) | Field, warehouse operators, stockpile workers |

### High-level modules

| Module | Platform | Key features |
|---|---|---|
| Dashboard | Both | Live KPIs for Receiving, Shipment, Inventory |
| Receiving | Both | Scale capture, field ticket, weight certificates, print / re-print ("Duplicate" on top of reprints), stockpile barcode scanning, load-to-stockpile assignment, ERP inventory update |
| Inventory | Both | Field run almonds, Inshells, Kernels; Conventional and Organic; on-hand views |
| Movement | Mobile / Tablet | Stockpile loads to Pre-clean staging; any location to any location; corrections |
| Shipment | Both | Truck check-in, weight capture, picklist, Bin and LP scanning, truck check-out |
| Locations | Both | Stockpiles, Tanks, Shipment Staging, Planned Staging |
| Scanner | Both | Stockpile scanning, bin and serial label scanning, trailer licence scanning |
| Reports | Web | Incoming loads, Stockpile Inventory, Planned for Production Inventory, Production Duration, by grower/field/variety |
| Profile | Both | Language, Security (Password & Pin), Preferences, Sign-out |
| Settings | Web | Master Data Management, User Management, Label Designing, Bulk Upload |

### Common UI features
- Column options: hide/show columns, saved as user preference.
- Column sorting, saved per user.
- Two table views: table view and card view.
- Dropdowns for growers, handlers, product type, variety, farming type (organic / conventional), locations.
- Filters on grids and on columns.

## 2. Roles, personas, login

| App | Role | Duties |
|---|---|---|
| Web | Front Office | Inbound/outbound trucks; field run receiving and shipments (kernels and inshells); tare and gross weights; truck check-in/out |
| Mobile / Tablet | Stockpile Workers | Unload field run trucks at stockpile; load shipment trucks at picking location |
| Mobile / Tablet | Warehouse Workers | Pick and place bins/trailers between locations |

Personas: **Sarah** — Front Desk Officer (Web). **David** — Stockpile Worker (Mobile/Tablet). **Joel** — Picking Warehouse Worker (Mobile/Tablet).
Permission matrix lives in an external sheet "YHS - Permission Matrix" (not in the PDF).

**Login:** sign-in screen has only **card scan** or a **4-digit PIN**. No email/password login.
(Note: Profile module still lists "Security (Password & Pin)".)

**Settings > User Management:** create/manage users, assign roles and permissions, activate/deactivate users.

---

## 0. Live check — QA, 2026-10-19 (Firefox, `playwright-cli`)

URL `https://vann-wms-qa.agrierp.com` (page title `AgriWMS - Warehouse Management System`, footer `v1.9.28`).
Only the **web** app was checked; the mobile/tablet validation app was not.

**Login.** `Choose how to sign in` → `PIN` ("Enter your 6-digit PIN") or `Card Scan` ("Scan your card or enter card ID").
The PIN is entered on an on-screen keypad (`Enter 6-Digit PIN`); keyboard presses do **not** register, so click the
digit buttons. Then a **`Select Configuration`** modal lists client `Vann Brothers - QA` (`1 Company`) with company
button `YHS`. Spec says 4-digit PIN; live is **6 digits**. Superadmin PIN: `playwright/.auth/yhs_wms_credentials.json`
(never print it). It signs in as `Super User` / `superuser@test.com` and lands on `/receiving`.

**Blocker (open, 2026-10-19):** every data call returns **404** —
`User with email 'superuser@test.com' not found in the system. Please ensure the user exists in the database.`
(`errorCode: NOT_FOUND`). So all grids show `No data available.`, Locations counts are `0`, and the Create Field Ticket
dropdowns can't load growers. The Superadmin login is not provisioned in the WMS database; raise it with dev before
any data-level QA. Nothing was saved during the check.

**API.** Same auth gateway as the Farm App: `https://agrierp-authgateway-qa-api.folio3.site`.
- `POST /users/client-environments` → `[{ name: "Vann Brothers - QA", clientId: 4, environmentId: 13930, companies: [{ companyId: 7743, name: "YHS" }] }]`
- `POST /auth/session`
- Data under `/api/v1/…`: `field-tickets?pageNumber=1&pageSize=100`, `locations?…`, `shipments?…`, `master-data/growers/dropdown`.

**Left nav (live):** `Receiving` (`/receiving`) · `Inventory` (`/inventory`) · `Shipment` (`/shipments`) ·
`Locations` (`/locations`) · `Truck Check-In` (`/truck-check-in`) · `Empty Bin Handling` (`/empty-bins`) ·
`Bulk Production (Trailer) Weighing` (`/bulk-load-weighing`) · `Handler Bin IDs` (`/handler-bin-ids`) · `Logout`,
`Collapse menu`.

**Receiving (`/receiving`).** Heading **`Receiving Harvest Loads`**; header buttons `Create Field Ticket`, `Scanner`, user chip.
Search placeholder `Search by Ticket#, Grower, Field, Variety, Stockpile...`; `Scan QR`; status combobox
`All Statuses` · `Planned` · `Assigned` · **`Field Validation Complete`** · **`Voided`** · `Completed`;
`Table View` / `Card View`; `Column Options`; `Filters`.
Default columns: `Date`, `Ticket #`, `Load #`, `Grower`, `Field`, `Variety`, `Gross Weight`, `Assigned Stockpile`,
`Net Weight`, `Status`, `Actions` (the spec's other columns are presumably behind `Column Options`; not checked).

**Create Field Ticket** (heading `Create Field Ticket`, sub-title `Digital Field Receipt`; buttons `Cancel`, `Reset`, `Save Ticket`):

| Section | Live fields (`*` = required marker shown) |
|---|---|
| `Grower Information` | `Manual Ticket #` (placeholder "Optional — enter paper ticket reference"; help "Used to cross-reference this load with the paper ticket from the grower."), `Crop Year *` (`Select Crop Year`), `Product Type` (`Field Run Almonds` default, `Rejects`), `Grower Name *`, `Field # *` (disabled until a grower is picked: "Select grower first"), `Handler *` |
| `Variety Selection *` | Variety picker (empty — master data didn't load) |
| `Load Information` | `Total Trailers` (spinner, "Auto-detected"), `Farming Type` (`Conventional` default, `Organic`), `Gross Weight (lbs)`, `Tare Weight (lbs)`, `Net Weight` (read-only, `—`), toggle cards `Single Load` ("Only one trailer in this load"), `Split Load` ("This is a split delivery"), `Last Load` ("Mark this as the final load") |
| `Transportation Information` | `Carrier *`, `Driver Name *`, `Truck License # *`, `Front Trailer License #`, `Back Trailer License #`; hint "At least one trailer plate required" |
| `Additional Information` | `Comments` ("Add any additional notes about this load..."), `Attachments` ("Click to upload or drag and drop" / "Images, PDFs, or documents (optional)") |

**Other screens (labels only, all empty):**
- `Inventory`: tabs `All (0)`, `Field Run Almonds (0)`, `Processed Almonds (0)`, `Handler Rejects (0)`; `Search inventory...`, `Refresh`, `Column Options`; columns `Container ID`, `Inventory Tag`, `Grower`, `Field`, `Variety`, `Crop Year`, `Total Net Weight`, `Location Type`, `Location`, `Farming Type`, `Production Run#`; empty state `No inventory items`.
- `Shipment`: `Search shipments...`; status chips `All`, `Planned`, `Assigned`, `Loading`, `Loading Complete`, `Ready for Completion`, `Completed`, `Voided`.
- `Locations`: "Browse and manage storage locations across your facility"; cards `Stockpile` (Raw almond storage and inventory), `Tanks`, `Staging Pre Clean`, `Staging Shipment`, `Production`.
- `Truck Check-In`: `New Check-In`; chips `All`, `Assigned`, `Unassigned`; columns `Check-In ID`, `Date`, `Driver`, `Truck LP`, `Front Trailer LP`, `Back Trailer LP`, `Carrier`, `Shipment`, `Status`, `Actions`.
- `Empty Bin Handling`: `All Handlers`, `Crop Year: All`, `Adjust Bins`; columns `Handler`, `Crop Year`, `Received`, `Sent`, `Balance`, `Last Activity`.
- `Bulk Production (Trailer) Weighing`: tabs `All`, `Awaiting Gross`, `Completed`; columns `Inventory ID/Serial #`, `Trailer LP`, `Production Run #`, `Growers`, `Field`, `Variety`, `Tare Weight`, `Gross Weight`, `Net Weight`, `Status`, `Action`.
- `Handler Bin IDs`: `Bulk Upload`, `Create Handler Bin ID`; columns `Handler Bin ID`, `Handler`, `Status`, `Action`.

**Spec ↔ live drift**

| Topic | Spec (V1.2) | Live 2026-10-19 |
|---|---|---|
| PIN length | 4 digits | 6 digits |
| Receiving statuses | `Planned`, `Assigned`, `Awaiting Validation`, `Field Validated`, `Completed`; no `Voided` | `Planned`, `Assigned`, `Field Validation Complete`, `Voided`, `Completed` |
| Required on Field Ticket | `Grower Name`, `Variety Selection`, `Gross Weight (lbs)`, `Driver Name`, `Truck License #` | `Crop Year`, `Grower Name`, `Field #`, `Handler`, `Variety Selection`, `Carrier`, `Driver Name`, `Truck License #` + at least one trailer plate (Gross Weight not starred) |
| `Manual Ticket #` | absent | present (cross-ref to paper ticket; same name as the Farm App ticket field) |
| `Ticket Number` / `Ticket Date` on create form | listed | not shown on the create form |
| Screen title | Receiving Main Screen | `Receiving Harvest Loads` |

---

## 3. Receiving (field run almonds from growers)

### 3.1 End-to-end journey (Front Office + Stockpile Worker)

Front Office (Sarah, Web):
1. Field run almonds arrive at the scale.
2. Sarah logs in to the AgriWMS Web App.
3. Decision: intercompany grower?
   - **No** → she creates a Harvest Ticket from the dashboard/receiving module, enters details, clicks Save.
   - **Yes** → she selects the Harvest Ticket "synced via AgriERP" from the dashboard/receiving module.
4. Decision: single or two trailers? ("Single Trailer = Front / Back only, Spilt Load. Two Trailers = Full load").
   - Two trailers, same grower/field/variety in both → weigh front and back together.
   - Two trailers, different field or variety → **split delivery**: weigh only one trailer; a separate ticket is created for the other field/variety.
   - Single trailer → weigh it alone. (Scale integration in all cases.)
5. Capture gross weight. Overwrite or recapture is allowed.
6. System recommends stockpiles by grower, field, variety and crop year, or any other available stockpile. User **can't** assign a stockpile holding another grower/field/variety.
7. Editing the harvest ticket and reassigning the stockpile is allowed **until the weight certificate is generated** (after tare capture). On weight-certificate creation the app shows a popup that the action cannot be reversed.
8. System updates the harvest ticket status and generates a **stockpile ticket with barcode** once gross, tare and net are calculated. (Wording as in spec; see Open questions.)
9. Sarah prints the stockpile ticket and hands it to the driver.

Stockpile Worker (David, Mobile/Tablet):
- 9. Driver reaches the stockpile. 10. Is the stockpile location available? No → a new stockpile is assigned before unloading.
- 11. David opens the "Receiving / Field Validation module".
- 12. He selects the Harvest Load manually or scans the stockpile ticket barcode.
- 13. Harvest Load opens; he validates the stockpile.
- 14. App opens the QR scanner; he scans the QR code at the stockpile location.
- 15. Wrong stockpile → validation message, correct and retry. Right → 16. system validates the stockpile.
- 17. Driver unloads. 18. Driver returns to the front office to check out the empty truck.

Front Office again:
- 19. Empty trailer is weighed. 20/22. Sarah captures tare weight.
- 21. System derives Net = gross − tare. Adjustments or recaptures allowed.
- 23. Mark the harvest ticket as **Completed**:
  - "Integration with ERP: The system posts the inventory adjustment in F&O via integration."
  - "Integration with AgriERP: The system updates the quantity in harvest ticket."

### 3.2 Statuses (receiving)

The spec has no single receiving status table. Values seen across sections:

| Status | Where it appears | Meaning per spec |
|---|---|---|
| `Planned` | Web grid status; `Capture Gross` "is visible when ticket is in Planned state" | Ticket created, gross not yet captured |
| `Assigned` | Web grid; Mobile ticket card/detail; Web detail | Stockpile assigned; awaiting field validation |
| `Awaiting Validation` | Web detail header example | Likely same stage as Assigned (unclear) |
| `Field Validated` | Web grid status example | Stockpile worker validated the stockpile |
| `Completed` | Front Office journey step 23 | Tare captured, ticket closed; triggers F&O and AgriERP updates |

Implied transitions: `Planned` → (gross captured, `Validate and Assign` stockpile) → `Assigned` → (mobile QR validation) → `Field Validated` → (tare captured, weight certificate) → `Completed`.
No `Voided` status is defined for receiving tickets. "Void" appears only for Bulk Production trailers and Truck Check-In.
Full status list is in the external sheet "List of Statuses".

### 3.3 Web — Receiving Main Screen
- **Search** supports: Ticket No#, Date, Grower, Field, Variety, Assigned Stockpile, Status.
- **Quick filter:** status dropdown with all statuses.
- **Filters panel** (filter icon): Status, Product Type, Grower, Field, Variety, Assigned Stockpile, Date From, Date To. Actions: `Apply` button, close icon.
- **`Column Option`**: hide/show and sort columns; saved as user preference.
- Button to **Create a new Field Ticket** (navigates to creation form).
- Grid and Card views. Pagination like "Page 1 of 3" plus rows-per-page dropdown.
- Row action: **print** — prints the stockpile ticket and weight certificate.

Grid columns: `Ticket #`, `Product Type` (Field Run Almonds, Rejects), `Date`, `Load #`, `Grower`, `Field`, `Variety`,
`Handler`, `Gross Weight`, `Tare Weight`, `Net Weight`, `Assigned Stockpile`, `Farming Type` (Conventional, Organic),
`Crop Year` (CY-2026), `Carrier`, `Driver`, `Truck LP`, `Front Trailer LP`, `Back Trailer LP`, `Single Load` (Yes/No),
`Split Load` (Yes/No — front and back trailers contain different GFVs), `Last Load` (Yes/No — last load of GFV), `Status`.

### 3.4 Web — Field Ticket Creation Screen

| Field | Rule / values |
|---|---|
| `Ticket Number` | System-generated (e.g. 5413-9825) |
| `Ticket Date` | Date ticket is created |
| `Grower Name` | Select; **mandatory** |
| `Field` | Select |
| `Handler` | Select |
| `Crop Year` | Auto-picked from date; changeable via dropdown (CY2026) |
| `Variety Selection` | **Mandatory** (Nonpareil, Fritz, Butte) |
| `Total Trailers` | 0, 1, 2 |
| `Product Type` | Field Run Almonds, Rejects |
| `Farming Type` | Organic, Conventional |
| `Gross Weight (lbs)` | **Mandatory** |
| `Tare Weight (lbs)` | Empty truck/trailer weight |
| `Last Load` | Toggle — final load for the ticket |
| `Split Load` | Toggle — load split across deliveries |
| `Single Load` | Toggle — only one trailer holds field run almonds to receive |
| `Driver Name` | **Mandatory** |
| `Truck License #` | **Mandatory** |
| `Front Trailer License #` / `Back Trailer License #` | Plates |
| `Comments` | Free text |
| `Attachments` | Images or PDFs |
| Buttons | `Cancel`, `Reset` (clears form), `Save Ticket` |

### 3.5 Web — Receiving Details Screen

**Header:** `Ticket Number` (with barcode), Grower/Field/Variety & Product Type line, `Status` (Assigned, Awaiting Validation),
`Assigned Stockpile`, `Load Sequence` (#1), `Load Type` (first, last, or part of series), `Harvest Series` (loads grouped by
grower, field, variety), `Variety Tag`, `Product Type`, `Farming Type`, `Crop Year`, `Total Trailers`.

**Weighing Station:**

| Field | Rule |
|---|---|
| `Scale Status` | e.g. "Ground Scale Connected" |
| `Live Scale Reading` | Real-time scale weight |
| `Gross Weight` | Load + container |
| `Captured Tare Weight` | Tare captured by user |
| `Trailer Tare Weight` | Tare recorded in system DB |
| `Net Weight` | Gross − Captured Tare |
| `Capture Gross` | Visible only when ticket is `Planned` |
| `Capture Tare` | Visible only after validation is completed on the ticket |
| `Read Scale` | Refresh scale value |
| `Auto` | Toggle automatic capture |

**Transportation Information:** `Carrier`, `Driver Name`, `Truck #`, `Front Trailer Plate`, `Rear Trailer Plate`.
**Attachments:** download existing; upload new.

**Certificates and Labels:**
- `Assigned Stockpile`
- `View & Print Certificates` — prints all certificates at once.
- `Weight Certificate` — enabled **only after tare weight is captured**.
- `Stockpile Label` — prints the stockpile label.

### 3.6 Web — Validate & Stockpile Assignment Screen
- Header: Harvest Ticket#; Grower, Field, Variety.
- Search: Stockpile #, Grower, Field, Variety.
- Only locations of type **stockpile** appear. Eligible = **same GFV or empty**. User may pick any eligible one.
- Two groups: **"Recommended Stockpile"** (same GFV; highlighted with colour and a `Recommended` label) and **"Available Stockpile Locations"** (empty).
- Recommended card fields: `Recommended Location Label`, `Stockpile Code` (A16), `Location Area` (North), `Recommendation Note` (e.g. "Active stockpile with 13 previous loads"), `Grower`, `Field`, `Variety`, `Assigned Loads`, `Total Weight`, `Select Recommended` button.
- Available card fields: `Available Stockpile Code`, `Grower`/`Field`/`Variety` (N/A when empty), `Select` button. `Close` (X) icon.
- For handler rejects, `Validate and Assign` auto-assigns a Virtual Stockpile (see 3.9).

### 3.7 Mobile/Tablet — Receiving Main Screen (field validation list)
Fields: `Search Tickets`, `Pending Validation Count` ("7 Pending Validation"), `Ticket Number`, `Ticket Status` (Assigned),
`Grower`, `Field`, `Variety`, `Driver`, `Trailer Plate`, `Assigned Stockpile` (e.g. SP-stockpile-sp-a07),
`Stockpile Barcode`, `View Details` button, `Validate` button. Ticket cards in a scrollable list.

### 3.8 Mobile/Tablet — Field Ticket Details and Stockpile Scanning
Details: `Ticket Number`, `Ticket Status`, `Grower`, `Variety`, `Field`, `Driver`, `Expected Stockpile Location`,
`Stockpile Barcode` (SP-A06), `Load Number`, `Trailer Count`, `Front Trailer`, back trailer (also labelled "Front Trailer" in the spec table — typo),
`Carrier` (N/A if none), `Gross Weight`, `Validate Stockpile` button, `Back to Field Validation` button.

Scanning screen: `Close Button` (X), `Delete / Remove Button` (trash — cancels the validation), `Expected Stockpile Location`,
`Stockpile Barcode Display`, `Barcode Scanner Frame`, `Camera Status Message` (e.g. "Camera unavailable"),
`Scan Instruction Text` ("Align Barcode to Scan"), `Manual Entry Field` ("Enter Stockpile Number"), `Go Button` (`GO`).
- Each stockpile has a unique location QR code; labels can be printed from Locations.
- Wrong stockpile scanned → validation error; correct and retry.

### 3.9 Handler Rejects (receiving)
- Rejects are identified when the user picks the product type (Rejects) on the harvest ticket.
- System **preselects GFV and disables it** for input.
- On `Validate and Assign` the system auto-assigns the predefined **Virtual Stockpile**.
- Mobile users validate it like field run almonds.
- Movement: rejects stockpile tickets are scanned and moved to preclean staging.
- Virtual tanks for rejects: when a pre-cleaning job scans a stockpile ticket with product type Handler Rejects, the virtual tank is auto-selected.
- Production: same as field run, input product = handler rejects; output = inshells or kernels.

### 3.10 Formulas (receiving)
- Net Weight = Gross Weight (scale) − Tare Weight (scale).
- Difference b/w Tare = Tare Weight (scale) − sum of Truck & Trailer Tare from DB.

### 3.11 Printing
- Reprints carry "Duplicate" on top.
- Stockpile ticket (with barcode) is printed for the driver.
- Weight certificate only after tare; once created, ticket edits/stockpile reassignment are blocked (irreversible popup).

---

## 4. Inventory (v1.1)

Tabs: **All** (Field Run Almonds, Processed Almonds, Handler Rejects, Production Rejects), **Field Run Almonds**
(received, not yet processed), **Processed Almonds** with sub-tabs **Cleaned Almonds** / **Inshells** / **Kernels**
(also listed: Production Rejects — Hash, evo), **Handler Rejects**. (Intro says three tabs; list has four. Sub-tab
names vary: "Clean Almonds"/"Cleaned Almonds", "Inshell"/"Inshells".)
Features: search, filters, hide/show columns (saved), refresh, row selection, pagination.

Grid fields: `Container ID` (Field Run Ticket, Tank Ticket, Trailer LP, Bin LP (Handler Bin ID)), `Inventory ID`
(Bin Tag (Bin ID), Bulk / Trailer LP), `Receiving Date`, `Grower`, `Field`, `Variety`, `Crop Year`, `Total Net Weight`,
`Fumigation Status`, `Location Type`, `Location`, `Farming Type` (source Field Ticket), `Production Run#`.
Quality attributes created in the quality app become extra grid columns.

Search: Stockpile Number, Tank Ticket ID, Grower Name, Field, Variety, Run#. Results follow the active tab.
Filters side panel (collapsible): Production Options (Field Run, Inshell & Kernel; Grower, Field, Field Ticket);
Variety (multi-select); Location (Location Types, Location); Additional (Farming Type, Crop Year, Date Range);
Quality Attributes (needs QC integration). Buttons: `Apply Filters`, `Clear All`.

## 5. Locations (v1.1)

- **Location Type** = category (Stockpile, Tank, Staging Pre-Clean, Staging Shipment, Production).
- **Location** = physical unit (Stockpile A01, Tank 1, Pre-Clean Staging A).
- Main screen summary: `Total Locations`, `Total Capacity (lbs)`. Location Type cards show type and `Number of Locations`; click opens the type.

### Stockpiles
Open-yard storage for field-run almonds. Card View and Map View. Hierarchy Zone → Row → Location (Zone 1 / Row A / A01).

| Summary metric | Meaning |
|---|---|
| Total | All stockpile locations |
| Open | Active (has inventory) |
| Closed | Not accepting inventory |
| On Hold | Being fumigated / in movement restriction period |
| Empty | No inventory |
| Fumigated / Not Fumigated | Fumigation done / required |
| Total Weight | lbs across stockpiles |

Card: `Location ID`, `Grower`, `Field`, `Variety`, `Total Net Weight`, `Status` (Active / On Hold / Closed / Empty), `Fumigation Status` (Yes/No). Color-coded.
Details side panel tabs: `Overview` (Zone, Row, Location, Total Loads, Stockpile Status, Fumigation Status, GPS Coordinates; plus Location QR code value; print label),
`Load History` / Loads tab (Ticket Number, Date/Time, Grower, Field, Variety, Handler, Carrier, Driver, Truck, Trailer (front/back LP), Gross Weight, Tare, Net Weight; summary Total Loads, Total Weight),
`Fumigation` (Completion Date, Restriction Period, Material, Technician — needs QC integration).

### Tanks
Store cleaned almonds. Metrics: Total Tanks, Active Tanks, Empty Tanks, Total Field Run. Card: Tank Name, Run Number, Grower, Field, Variety, Weight, Handler. Cards color-coded by variety.

| Chip colour | Status |
|---|---|
| Grey | Empty |
| Green | In Use (In Production) |
| Brown | Closed (Filled with other GFV) |
| Blue | Closed (Filled with same GFV as Production) |

### Pre-Clean Staging
Summary: Number of Loads, Total Lbs. Grid: Location, # of Loads, Total Weight, Average Load (= Total Weight / # of Loads).
Detail panel: Location ID; Loads, Total Lbs, Avg Load; per load Ticket Number (Field Ticket#), Arrival Date/Time (movement datetime), Grower, Field, Variety, Handler, Gross, Tare, Net.

### Shipment Staging
Summary: Total Bins, Total Kernels Weight, Total Bulk Loads, Total Bulk Loads Weight. Grid columns: Location, Number of Runs, Bin Count, Trailer Count, Total Bin Weight, Average Bin Weight, Total Bulk Weight, Average Bulk Weight (the spec's descriptions for these columns are mismatched).
Detail panel: Bins / Bulk / Total Bin Weight / Total Bulk Weight; tabs **Bins** (Bin Container ID, Bin Tag, Production Run#, Grower, Field, Variety, Handler, Gross, Tare, Net) and **Bulk** (Trailer LP, Bulk Load Tag, Production Run#, same GFV/weights).

## 6. Movement (Mobile/Tablet)

- Stockpile → Staging: Movement module → `Field run Almonds` tab → scan stockpile ticket or pick load ticket → select staging / pre-cleaning location → `Transfer` → `Complete`. "The system posts the inventory transfer journal in F&O via integration."
- Bins Production → Staging: inventory module → `Kernels` or inshells tab → scan/select bin → staging / pre-shipment location → `Transfer` → `Complete`. Posts transfer journal in F&SC.
- v1.2 Movement main screen: one card `Movements`; `Step 1: Scan Bin/Trailer LP/Tickets/Stockpile ticket` (QR scan area); `Step 2: Scan Location`.

## 7. Truck Check-In & Check-Out (v1.2, Web)

Journey: `New Check In` → truck and driver info → with shipment? Yes: fill and `Save`. No: fill and `Next`, then pick from unassigned shipments.
(The spec's Yes/No branches look swapped against the screen table, where `Next` appears only "if check in is with shipment".)
Mapping later: mapping button on a truck row → select shipment → save. Truck fields are dropdowns; mandatory fields marked.

Main screen: tabs/quick filters `All`, `Assigned`, `Unassigned`. Search: Carrier Name, Driver Name, Truck LP, Trailer LP, Status. Filter icon: carrier, driver, truck, trailer LP. Button `New Check-In`.
Grid: `Check-In ID`, `Shipment ID`, `Status`, `Driver`, `Truck LP`, `Front Trailer LP`, `Back Trailer LP`, Actions: Link icon (select shipment), De-link icon (unassign), Void (removes check-in), Truck Check Out. Pagination "Page 1 of 4 | 1–10 of 30".

Create screen: `Check-In Type` (Without Shipment / With Shipment); `Carrier Name`*, `Driver Name`*, `Truck License #`*, `Front Trailer Plate`, `Back Trailer Plate`* (marked mandatory); scale widget `Scale Status`, `Tare Weight (Scale Reading)`, `Disconnect Scale`, `Capture Tare Weight`, `Manual Tare Weight Entry`; `Cancel`, `Next` (with shipment only), `Save` (updates shipment status).
Shipment Association panel (cards with radio): `Check In Type`, `Shipment ID`, `Destination`, `No. of Manifests` (hover = Manifest IDs), `Packaging Type` (Bin or Bulk), `No. of Bins or Trailers` (hover = IDs), `Net Weight`; `Cancel`, `Save`.
Check Out panel: carrier/driver/truck/trailers shown **disabled**; widget `Gross Weight (Scale Reading)`, `Capture Gross Weight`, `Manual Gross Weight Entry`; `Save` updates shipment status and **prints the weight certificate and shipping manifest**.

## 8. Shipment (Web + Mobile/Tablet)

Journey (Front Office): empty truck at scale → shipment exists? No: `Create Shipment`, enter customer, carrier/driver via dedicated button (Grower and Product sections hidden), Save. Then select shipment. Planned shipments may exist without check-in; after check-in the shipment shows on Mobile/Tablet. Bins/trailers on one shipment can't be used on another. Driver takes picklist to picking location. On return: select shipment, capture gross (re-capture allowed), system calculates net, complete shipment, documents printable. Corrections allowed (bins/trailers removable). Completion posts an inventory adjustment to ERP.
Mobile (David): Shipment module → scan bin/trailer LPs → complete loading → success message → shipment leaves the mobile list.

**Shipment statuses (Progress Tracker):**

| Status | Meaning |
|---|---|
| `Planned` | Created but not assigned |
| `Assigned` | Inventory allocated |
| `Truck Checked-In` | Truck arrival recorded |
| `Loading` | Loading started |
| `Loading Complete` | All bins loaded |
| `Ready for Completion` | Ready for finalization |
| `Completed` | Fully processed and closed |

Web main: search (manifest#, shipment#, product type, packaging type); status tabs `All`… `Completed`; `+ Create Shipment`; list/grid toggle; column options.
Card fields: Manifest ID (MAN-20260325-607), Shipment ID (SHP-30891), Product Type (Kernel, Inshell), Packaging Type (Bin, Trailer), Handler, Grower, Field, Variety, Carrier, Driver, Truck LP, Front/Back Trailer LP (bulk only), Bin Count, Weight, Created, Status Badge.
Create wizard: Step 1 — `Customer Name`, `Destination`, `Destination Address` (optional), `Carrier`, `Driver Name` (optional), `Staging Location`, `Scheduled Date`, `Packing type` (Bins, Trailers), `Notes`; `Cancel`, `Next`. Step 2 Pick Inventory — search; filters Variety, Container/Bin ID, Packaging Type, Locations, Production Run, Grower, Product Type (Kernels, Inshells, Rejects); `Apply Filter`, `Select All Visible`, available count; grid Bin ID, Location, Variety, Grower, Net Weight; `Back`/`Cancel`/`Next`. Step 3 Review & Create — summary, Pick List Count, Total Weight, pick list grid with `Unload` action, messages "Ready to Create Shipment" and pick-list note; `Back`/`Cancel`/`Create Shipment`.
Details: header (Shipment ID, Manifest ID, Grower Reference, Status Badge, `Print`), progress tracker, Weighing Station (Scale Status, Live Scale Reading, Gross, Tare, Net), Bin Pick List (Bin ID, Location, Variety, Net Weight, Status e.g. Validated, Scanned By, Total; actions `Unload`, `Unassign`), Shipping / Grower (Grower Name, Field, County, Practice) / Transport info, timeline.
Mobile: list (Shipment ID, Grower, Product, Carrier, Truck, Driver, Total Bins, Total Weight, Status); Verification screen (Truck Check-In ID, Driver, Truck LP, Front/Back Trailer LP, Bins with status `Awaiting` / `Validated`, Net, Gross, `Scan Bin`, `Complete Loading`); Scanning screen accepts formats like "6708-XXXX", "SP-A01", "SH-XXXX", with manual field and `Go`.

**Shipment formulas:** Bins: Tare = Bin Tare (from production), Net = Gross − Tare. Trailers with truck: Net = Gross (scale) − Tare (scale). Trailers without truck: Net = Gross (scale) − Tare (from production).

**Shipment Manifest:** auto-generated on shipment creation, one unique manifest ID per grower + field + variety in a crop year. One production run can span many manifests; one shipment can hold many manifests.

## 9. Bulk Production (Trailer) Weighing — AgriProduction link
- Trailers filled in AgriProduction go to "Awaiting Weight" and sync to the AgriWMS Bulk Production Weighing screen.
- User selects trailer (search/filters or `Scan License Plate`) → scale widget → capture gross → `Save` → weight certificate auto-prints. Certificates can be reprinted from the grid.
- Rows disappear once the production run is completed.
- Grid: Trailer LP, Production Run#, Grower, Field, Variety, Tare Weight, Gross Weight, Net Weight, Status (Awaiting Gross), Actions **Void** (only "Awaiting Weight" trailers; confirm prompt; also voids in AgriProd) and **Print** (duplicate tag; weighed trailers only).
- Quick filters `All`, `Awaiting Gross`, `Completed`. Column filters: Trailer LP, Production Run#, Grower, Field, Variety.
- **Max gross limit** (e.g. 80,000 lbs): above it, capture is blocked.
- Capture screen: Trailer LP, Production Run#, Status, Grower, Field, Variety, `Scale Status`, `Disconnect Scale`, `Weight Reading`, `Capture Gross Weight`, `Manual Weight Entry`, `Save`, `Close`. (Several rows say "tare" where gross is meant.)

## 10. Empty Bin Handling
- Separate window to **Receive Empty Bins** (from handlers) and **Send Filled Bins** (back to handlers), tracked per handler.
- Main: Handler Filter, Date Filter, columns Handler, Received, Sent, Balance, Last Activity, pagination.
- Details panel: Handler, Received, Sent, Balance, `Quantity` (whole numbers, + or −), `Save`, `Cancel`.

## 11. Handler Bin IDs (Web master data)
Page `Handler Bin IDs`: Search, `All Statuses` (Empty, Completed), Date Filter, Grid/List toggle, `Create Label`, Filter icon, Column Selector; columns Handler Bin ID, Handler, Status, Action (Print); pagination.

---

## 12. Integrations (quoted)

- **AgriERP harvest tickets (intercompany growers):** "Yes → She selects Harvest Ticket (synced via AgriERP) from the dashboard/receiving module." / "Integration with AgriERP: Harvest ticket synced from AgriERP for intercompany growers".
- Non-intercompany growers: "She creates Harvest Ticket from the dashboard/receiving module".
- **On Completed:** "Integration with ERP: The system posts the inventory adjustment in F&O via integration." and "Integration with AgriERP: The system updates the quantity in harvest ticket."
- **General:** "Synchronizes data with AgriERP for centralized grower and shipment records for handlers (WMS App for handler)."
- **D365 F&O / F&SC:** inventory adjustment on receiving completion and shipment completion; "inventory transfer journal in F&O" (stockpile → staging) and "in F&SC" (bins → staging). "ERP synchronization to update the inventory at the time of receiving, shipment, and inventory movements."
- **Data sharing:** master data "must be consistently available across all relevant applications (AgriERP, AgriWMS, Agri Quality and Agri Production App). Users should not be required to recreate the same data in multiple systems." Mechanism is an architectural decision.
- **AgriProduction:** Bulk trailer weighing (Awaiting Weight sync; void reflects on AgriProd). Tank status changes sync to "the production app" with user and timestamp. Bin tare comes "from production".
- **AgriQuality / QC:** quality attributes appear as inventory columns and filters; stockpile Fumigation tab needs QC; future "QC App integration compatibility during receiving and shipment stage".

**Master data sources (p.17):**

| Data | Source | Access in WMS |
|---|---|---|
| Growers | Sync from Grower Portal to ERP and WH & QC App | Read only |
| Handlers | Sync from Grower Portal to ERP and WH & QC App | Read only |
| Fields | "Already in AgriERP or GrowerPortal need to sync to Apps" | Read only |
| Items | Sync from ERP to Apps | Read only |
| Variety | Sync from Growers Portal to Apps | Read only |
| Locations | Created in Apps, sync to ERP | CRUD |
| Carriers, Drivers, Trucks, Trailers | Only in Apps | CRUD |

Configurational data: Product Type, Farming Type, Variety (sheet "AgriWMS (Processor) - Forms").
APIs and field mappings are in external links ("Agri WMS APIs", "AgriWMS (Processor) - Fields & Mappings"); validation and error messages in "AgriWMS | Errors, Validations, Notifications" — none are reproduced in the PDF.

## 13. Glossary

| Term | Meaning |
|---|---|
| Huller / Processor | Facility (YHS) that receives field-run almonds and processes them |
| Handler | Buyer/processing entity receiving shipments (e.g. Blue Diamond); also sends handler rejects and empty bins |
| Field run almonds | Raw almonds received from growers, unprocessed |
| GFV | Grower, Field, Variety combination |
| Harvest Ticket / Field Ticket | Receiving record for one load (terms used interchangeably) |
| Stockpile ticket | Printed barcode ticket handed to driver after weighing |
| Stockpile | Open-yard location for field run almonds; has unique QR |
| Virtual Stockpile / Virtual Tank | Predefined locations auto-assigned to handler rejects |
| Split Load | Front and back trailers have different GFVs; separate tickets |
| Single Load | Only one trailer holds product to receive |
| Last Load | Last load of a GFV |
| Gross / Tare / Net | Loaded weight / empty weight / Gross − Tare |
| Weight Certificate | Printed weight document; irreversible once generated |
| LP | License plate (truck, trailer, or bin LP) |
| Bin Tag / Bulk Load Tag | Tags produced in production for bins / trailers |
| Manifest ID | Unique ID per GFV per crop year within a shipment |
| Intercompany grower | Grower whose harvest ticket is synced from AgriERP |
| F&O / F&SC | Dynamics 365 Finance & Operations / Finance & Supply Chain |

## 14. Open questions / ambiguities

1. Receiving has no status table; `Planned`, `Assigned`, `Awaiting Validation`, `Field Validated`, `Completed` come from scattered examples. Exact list is in the external "List of Statuses" sheet.
2. Step 8 says the stockpile ticket is generated "if the gross, tare and net weight is calculated", yet the driver takes it to the stockpile before tare. Likely generated after gross + assignment.
3. "Intercompany grower" is not defined. Is it the same as harvest tickets created in the Farm App / Harvest Central? The spec only says "synced via AgriERP".
4. Direction of the AgriERP quantity update: does WMS overwrite or add the net weight on the AgriERP harvest ticket? Not specified.
5. What happens to an AgriERP-synced ticket's GFV fields — editable or locked? Only rejects are said to lock GFV.
6. No void/cancel for receiving tickets is defined.
7. Truck Check-In journey Yes/No branches contradict the screen table (`Next` only "with shipment").
8. "Offline support" is struck through; offline is presumably dropped.
9. Login is card/PIN only, but Profile lists "Password & Pin".
10. Inventory tabs: "three tabs" vs four listed; sub-tab names inconsistent.
11. Shipment Staging grid descriptions do not match column names.
12. Bulk capture screen and Mobile detail table have label typos (tare vs gross; "Front Trailer" twice).
13. Receiving workflow diagram (p.6) has an inter-company grower lane and an AgriERP / D365 systems column; its text is unreadable at PDF resolution — check the Figma "Receiving Process".
14. Weight validation limits for receiving (like the 80,000 lbs bulk limit) are not stated.

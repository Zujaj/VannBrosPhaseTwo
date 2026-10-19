# YHS Functional Requirements (Vann Phase 3)

> **Sources:** `resources/yhs/frd/FRD - Vann Phase 3 - YHS.md` (FRD, 372 lines) and
> `resources/yhs/frd/FRD - Vann Phase 3 - YHS - Diagrams.md` (Mermaid diagrams *derived from* the FRD;
> not part of the signed document). The PDF `FRD - Vann Phase 3 - YHS.pdf` is the same FRD.
> **Date:** 12/19/2025 (sign-off block: Vann Bros. (Client) and Folio3, Dec 19, 2025).
> **Author / client:** Folio3 for Vann Bros., covering **Yolo Hulling and Shelling Company (YHS)**;
> scope is the implementation of **D365 F&SC** at Vann Brothers, gathered in onsite and online discovery
> sessions with Vann's POCs.
> **Scope note:** this file describes **requirements, As-Is → To-Be. It is not live behaviour.** Nothing
> here has been checked against a running system. As-Is flows are linked to Figma boards (`Vann-Phase3-Internal`,
> `Vann-Phase3`) that are not in the repo.

Requirement count in the FRD: **61** (RQ-REC-001..013, RQ-QLT-001..002, RQ-PRC-001..024, RQ-USD-001..002,
RQ-SHP-001..020). The diagrams file says "33 functional requirements total"; that number is wrong.

---

## 1. End-to-end process map

```
Grower field run (truck)
  → Receiving (BP-130) ─→ Stockpile / lot in the yard
        ├─→ Fumigation (BP-134)  [QC decision OR 10+ days in pile] → back to pile
        └─→ Internal Quality on Stockpiles (BP-132)  [first + last load, every 5 loads on large piles]
  → Picking for Processing (BP-155) → plant staging (trailer)
  → Pre-Cleaning (BP-180) → pit → tank (tank ticket)
  → Hulling (BP-190) → inshells | high-fiber hulls (sold) | low-fiber hulls (disposed) | ~30% meats (vacuum)
        ├─→ inshells → Shipment - Inshells (BP-270) → VFO / other handler
        └─→ Shelling (BP-200) → kernels | empty shells
              → Label printing (BP-220) → Storage (BP-140) → Shipment - Kernels (BP-260) → VFO
  USDA (BP-230): kernels 3 lbs per 30,000 lbs; inshells 3 lbs every half hour
```

Document order of sections: Receiving, Fumigation, Internal Quality, Picking, Pre-Cleaning, Hulling, Shelling,
Label printing, Storage, USDA, Shipment - Kernels, Shipment - Inshells, Acceptance / Sign Off. (The table of
contents lists Storage and Fumigation after USDA; the body puts Fumigation right after Receiving.)

### Stage narratives (condensed from the FRD)

- **Receiving (130):** truck gross-weighed at the entrance scale; driver brings three pre-printed field receipt
  tags plus a transport sheet; office staff issue a **Stockpile Location Ticket** (dump location + Grower, Field,
  Variety). First load of a Grower-Field-Variety gets a new stockpile; later loads reuse it. Driver scans the
  ticket barcode in the **YHS mobile app**, which shows the pile on a map. Each pile has a stick showing location,
  field number and variety; lost/damaged paperwork is reprinted from the office copy. If the pile is occupied, the
  Yard Leader coordinates with reception, the Receptionist voids the ticket and assigns a new location. Exit scale
  gives tare; net = entrance minus exit; driver gets a **weight certificate** (gross, tare, net).
- **Fumigation (134):** piles formed on unload. Need is identified by the grower or the incoming QC team (pest
  risk) or if a field run stays in a pile **10 days or more**; growers are informed. **AFS (Advance fumigation
  services)** fumigates with chemicals from YHS inventory that is not tracked in any system. Cost is YHS overhead;
  growers are not billed.
- **Internal Quality on Stockpiles (132):** inspections for moisture, kernel size, insects, gums, twins, etc.
  Samples from the first and last loads of each stockpile, and after every five loads on larger piles. Results kept
  in an Excel internal report; the Grower Representative shares relevant results with growers on request.
- **Picking for Processing (155):** lot selection in Almond Logic by field-run inventory, VFO demand forecasts and
  the weekly production plan. Lot loaded on a YHS trailer, field receipt tag scanned in "send load to plants" to move
  inventory to staging; trailer parked in plant staging.
- **Pre-Cleaning (180):** operator checks tank availability, scans or keys the field receipt ticket in the
  **Plant Status** module (returns grower, field, variety), trailer dumps into the pit for pre-cleaning, operator
  selects a tank, Almond Logic generates a tank ticket, scanning it on the floor marks the tank running.
- **Hulling (190):** tank gates opened manually to the processing line; inshells separated from hulls; hulls are
  high-fiber (stored, sold as byproduct) or low-fiber (disposed). Weak shells give ~30% meats removed by vacuum.
  Inshells loaded into bins or trailers, weighed, issued a **bulk load tag**, shipped to VFO or another handler.
- **Shelling (200):** inshells shelled to kernels; QA throughout, recorded in an Excel report; empty shells stored
  outside the plant; kernels loaded into labelled bins.
- **Label printing (220):** operator records the scale weight in Almond Logic, prints bin labels, and keeps a manual
  log sheet (date, time, bin tag, weight).
- **Storage (140):** kernel bins held outside the factory then trucked to VFO; inshells held in containers near the
  factory and dispatched to VFO; hulls trucked to a separate yard, covered with tarpaulin, sold as cow feed at a
  premium, inventory estimated visually from pile length and breadth, no grower payment; shells dropped by crane,
  given away free to collectors; dirt and stone removed by a third party at YHS cost; byproduct tracking in Excel.
- **USDA (230):** kernels 3 lbs sample per 30,000 lbs; inshells 3 lbs every half hour; USDA merges samples per
  run/pile. Manual USDA handover sheet (not in Almond Logic). VFO-bound product sampled at YHS but reported as VFO
  inventory; external-huller product sampled physically at VFO. USDA posts field notes in its portal; certificates
  are viewed via Almond Logic (linked to VFO's USDA ID) and feed a consolidated report. Wrong weights hold the
  field note until corrected; missed YHS samples can be taken at VFO.
- **Shipment - Kernels (260):** office scans bin tags, groups 20 bins into a shipment, bin load sheet printed;
  truck info entered (carrier, driver, truck, front and back trailer), created if missing; tare fetched or weighed;
  shipment assigned to the truck and **Receive Truck** creates a shipping manifest (several manifests per shipment
  allowed); load truck by selecting and confirming bins → shipment summary report + manifest to driver; gross
  weigh-out records departure.
- **Shipment - Inshells (270):** office creates a bulk load in the **Scale Logistics** module → bulk tare tag ID
  (truck, trailer, handler); master data created if missing; bulk load assigned to a production run; bulk load tag
  printed for the driver, handed to the production run manager, scanned to assign the run to a truck; trailers
  loaded with inshells and moved to staging; tare captured if missing; shipment assigned or created; weigh-out and
  weight certificate for truck and trailers.

---

## 2. Requirements by stage

### 2.1 Receiving — Area "130 - YHS - Receive Field run from growers"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-130-01 | Gross weight of truck measured at the entrance scale. | RQ-REC-001 | The system should be linked with the weight scale at the entrance so that it can keep records of the weight measured at the entrance. |
| BP-130-02 | Driver brings three pre-printed field receipt tags: **White for office, yellow for yard & pink for driver**. | N/A | N/A |
| BP-130-03 | Driver carries a **Transport sheet** with the load. | N/A | N/A |
| BP-130-04 | Driver hands the field receipt tag to office staff, who generate a Stockpile Location Ticket with the dumping location (e.g. "West-A:02") and Grower, field & variety; driver unloads there. | RQ-REC-002 | The system must generate a **Stockpile Location Ticket** upon receiving the field receipt tag from the driver. The ticket must display all essential operational and traceability details, including **Grower, Field, Variety, Handler, Driver Name, Truck and Trailer Plate Numbers, Product, Run Type**, and the assigned stockpile dumping location (e.g., **"West-A:02"**). The driver must use this ticket to unload the load at the specified stockpile location. |
| BP-130-05 | System checks whether the load is the first for the grower-field-variety: first → new stockpile location; continued → existing location reused. | RQ-REC-003 | D365 F&SC is required to generate a Stockpile Location Ticket that assigns a stockpile location based on the grower, field, and variety. For the **first load** of a grower, field, & variety combination, a **new location shall be assigned by the user**. For **subsequent loads**, the **system shall assign the existing location**. |
| BP-130-06 | Truck weight, gross weight and Grower/field/variety of the lot recorded in **Almond Logic**. | RQ-REC-004 | The system shall capture and record all relevant load information, including gross truck weight from the integrated scale and tare weight, which may also be entered manually by staff when required. The system shall also record the associated grower, field, and variety details for each load. |
| BP-130-07 | Driver scans the ticket barcode in the **YHS mobile app**, which shows the stockpile area on a map. | RQ-REC-005 | The system shall enable drivers to scan the Stockpile Location Ticket barcode using the YHS mobile app. After the barcode is scanned, the app must display the mapped location of the assigned stockpile area to guide the driver accurately for unloading. |
| BP-130-08 | Each lot (pile) has a stick showing its location, field number and variety. | N/A | N/A |
| BP-130-09 | Lost/damaged paperwork reprinted from the office copy and attached to the stick. | N/A | N/A |
| BP-130-010 | Occupied location: Yard Leader coordinates with reception; Receptionist voids/discards the ticket and assigns a new location; driver gets the updated ticket. | RQ-REC-006 | The system shall allow reassignment of stockpile locations when the originally assigned location is unavailable. The receptionist must be able to **void the previous ticket and generate a new ticket** with an available location. All updates, including the **original and new location**, must be recorded in D365 F&SC. |
| BP-130-011 | Truck weighed again at exit for tare and net. | RQ-REC-007 | The system shall capture a second weighing of each truck at the exit gate through integration with the scale system, recording the **tare (empty) weight** and calculating the **net weight** of the load. Option to enter the tare weight manually should also be available. |
| BP-130-012 | Driver receives a weight certificate with gross, tare and net. | RQ-REC-008 | D365 F&SC is required to print a **weight certificate** that shows the gross, tare & net weight of the load. |
| BP-130-013 | Pre-printed labels are provided by **VFO** to growers at the time of the grower agreement. | N/A | N/A |
| BP-130-014 | All transportation costs from growers to YHS are borne by the growers. | RQ-REC-009 | The system shall record and identify that transportation costs from growers to YHS are the responsibility of the growers. **No freight charges** shall be calculated or posted to YHS for inbound grower deliveries. |

Note the BP numbering jumps from BP-130-09 to BP-130-010 (three digits) in the FRD.

### 2.2 Fumigation — Area "134 - YHS - Fumigation after Receiving Field run from growers"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-134-01 | Trucks unload, forming piles. | RQ-REC-010 | Begin time tracking once the stockpile is fully created. |
| BP-134-02 | Grower or incoming QC says fumigation is needed, or the field run has been in the pile 10 days or more. | RQ-REC-011 | Identify stockpiles needing fumigation from QC's decision and automatically flag any stockpile **10 or more days** at that location; generate notification or task assignment to the fumigation team; fumigation status indicator (e.g., **Required, Scheduled, Completed**). |
| BP-134-03 | Growers informed fumigation will be done. | N/A | N/A |
| BP-134-04 | AFS uses the chemical/perfume from YHS inventory; inventory not managed in a system. | RQ-REC-012 | Support fumigation chemical and other equipment inventory management, and expense of inventory used in fumigation. |
| BP-134-05 | Growers not billed; YHS absorbs as head expenses. | RQ-REC-013 | Record fumigation cost allocation under **YHS head expenses**; expense tracking for fumigation activities (chemicals, labor, equipment). |

### 2.3 Internal Quality on Stockpiles — Area "132- YHS - Internal Quality on Stockpiles"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-132-01 | QC on stockpiles for Moisture, size, insects, Gums, Twins; samples from first and last loads; every five loads on large piles. | RQ-QLT-001 | D365 F&SC records internal quality assessments per stockpile (moisture, size, insect presence, defect types); log samples from **first and last loads**; automatically track additional samples for large stockpiles (e.g., **every five loads**). |
| BP-132-02 | Results kept in an Excel internal report; Grower Representative highlights and shares entries with growers. | RQ-QLT-002 | Record, store and view all internal quality sample results in D365 F&SC, eliminating Excel; Grower Representative retrieves sample data for any grower, highlights/selects results, and shares them in a system-generated report or exportable format. |

### 2.4 Picking for Processing — Area "155 - YHS - Picking for processing"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-155-01 | Lot chosen by field-run inventory, VFO demand forecasts, weekly production plan. | N/A | N/A |
| BP-155-02 | Lot loaded on a YHS trailer; field receipt tag scanned in **'send load to plants'** in Almond Logic to move inventory to staging. | RQ-PRC-001 | Functionality to scan the field receipt tag. |
| BP-155-03 | (same text as BP-155-02) | RQ-PRC-002 | Support transferring loads to the plant and automatically update the stockpile location to **staging** on scanning the field receipt tag. |
| BP-155-04 | Trailer parked in plant staging. | RQ-PRC-003 | Real-time **trailer counts** in the staging area, with field, variety and grower per trailer (captured when the field receipt ticket was scanned for transfer). |

### 2.5 Pre-Cleaning — Area "180 - YHS - Pre cleaning"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-180-01 | Operator visually checks which tank is empty and available. | RQ-PRC-004 | Show real-time information of the load inside the tank. |
| BP-180-02 | Operator scans the field ticket barcode or keys the number in the **Plant Status** module of Almond Logic. | RQ-PRC-005 | Functionality to scan the tag. |
| BP-180-03 | Scan retrieves grower, field, variety. | RQ-PRC-006 | On scanning the field receipt ticket, fetch grower, field and variety. |
| BP-180-04 | Staged trailer positioned above the pit; load dumped for pre-cleaning. | RQ-PRC-007 | Display the **pre-cleaner's status** with a **start/stop button**. |
| BP-180-05 | Operator selects the tank for filling. | RQ-PRC-008 | Allow users to select which tank will be used for filling. |
| BP-180-06 | Almond Logic generates a tank ticket, scanned on the floor to set tank status **'Running Scanned Tank'**. | RQ-PRC-009 | Generate and print a **tank ticket**: Plant, Tank #, Tank Assignment ID, Load tag, Creation date, Print date, Grower, Field, Variety, Product type, Handler, Contract, Run type. |
| BP-180-07 | Almond Logic tank colours: **Green** = in use for production; **Blue** = load belongs to the same production run; **Brown** = being filled or load belongs to a different run (e.g. different grower or lot). | RQ-PRC-010 | Once the tank ticket is scanned, update the tank status. |

### 2.6 Hulling — Area "190 - YHS - Hulling"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-190-01 | Tanks opened manually; load routed to processing line. | RQ-PRC-011 | Update tank status to show it is **opened for processing**. |
| BP-190-02 | Load passes through processing stages to produce in-shell almonds. | RQ-PRC-012 | Support the complete production cycle of field-run almonds, from input to conversion into inshells. |
| BP-190-03 | Hulls separated: **high fiber** stored in piles and sold as byproduct; **low fiber** disposed. | RQ-PRC-013 | Record inventory of **high fibre hulls** as a by-product. |
| BP-190-04 | **30% meats** generated from weak shells breaking and being sucked by vacuum. | RQ-PRC-014 | Record inventory of **meats/kernels as a by-product** of hulling. |
| BP-190-05 | Inshells loaded directly into trailers or bins. | RQ-PRC-015 | Assign trailers to inshell inventory, or for bins print a **bin ID** and attach to each bin. |
| BP-190-06 | Inshell trailers weighed at the scale. | RQ-PRC-016 | Scale integration for trailer weight, or manual weight entry. |
| BP-190-07 | Operator issues a bulk load tag after weighing. | RQ-PRC-017 | Generate **bulk load tag**: Run Number, Tag ID, Truck, Front Trailer, Rear Trailer, Status, Created date and time, Print date and Time, Handler, Run, Grower, Variety, Gross weight, Tare weight, Net weight, Barcode, Barcode number. |
| BP-190-08 | Inshells shipped to VFO or another handler. | N/A | N/A |

### 2.7 Shelling — Area "200 - YHS - Shelling"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-200-01 | Inshells shelled to produce kernels. | N/A | N/A |
| BP-200-02 | QA tests during shelling; report kept in Excel (same fields as RQ). | RQ-PRC-018 | Generate **quality test reports**: Date, Time, Run, Grower, Field, Variety, Trailer, Tester, Foreign material in Pcs, Shell out weight in Grams, Loose meat weight in grams, Loose meat %, Inshell meat weight in grams, Inshell meat %, Total meat weight in grams, Total meat C/O %, Insect in grams, Insect %, Twins in gram, Twins %, Size (56.8gms), Other %, Moisture %. |
| BP-200-03 | Empty shells stored outside the plant. | RQ-PRC-019 | Record **empty shell inventory**. |
| BP-200-04 | Kernels loaded into bins. | RQ-PRC-020 | Capture **bin weight** via scale integration or manual entry. |
| BP-200-05 | Operator prints the bin label tag and attaches it. | RQ-PRC-021 | Print **bin labels**: Bin ID, Run, Bin #, Date, Grower, Field, Variety, Product, Handler, Handler Bin #, Weight record number, Gross, Tare, Net, the statement "Almonds are not processed to adequately reduce the presence of microorganisms of public health significance.", Copy - Printed, Date and time, Comments. |

### 2.8 Label printing — Area "220 - YHS - Label printing"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-220-01 | Kernels loaded in bins. | N/A | N/A |
| BP-220-02 | Operator records the scale weight in Almond Logic. | RQ-PRC-022 | Capture bin weight via scale integration or manual entry (same wording as RQ-PRC-020). |
| BP-220-03 | Labels printed from Almond Logic. | RQ-PRC-023 | Print bin labels with the same field list as RQ-PRC-021. |
| BP-220-04 | **Log sheet maintenance**: operator manually logs date, time, bin tag, weight. | N/A | N/A |

### 2.9 Storage — Area "140 - YHS - Storage"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-140-01 | Kernel bins stored temporarily outside the factory, then trucked to VFO. | N/A | N/A |
| BP-140-02 | Inshells stored in containers near the factory, dispatched to VFO. | N/A | N/A |
| BP-140-03 | Hulls trucked to a separate yard, tarpaulin-covered, sold at a premium as cow feed; inventory estimated visually from pile length and breadth; no grower payment. | RQ-PRC-024 | Record **sales and payment against the Hull**. |
| BP-140-04 | Shells dropped by crane, piled, given away free; purchasers collect. | N/A | N/A |
| BP-140-05 | Dirt and stone stored near the factory; removed by a third party at YHS cost. | N/A | N/A |
| BP-140-06 | Hash kept in Excel, not Almond Logic; no grower payment. | N/A | N/A |

### 2.10 USDA — Area "230 - YHS - USDA"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-230-01 | Kernels: 3 lbs sample per **30,000 lbs**; Inshell: 3 lbs **every half hour**; USDA merges samples per run/pile. | RQ-USD-001 | Generate and print **sample tags** per sample record: Grower, Field (linked to stockpile), Variety, Total Weight, Type (Inshell or Kernel), Date, Time. |
| BP-230-02 | Manual **USDA handover sheet**, not recorded in Almond Logic. | N/A | N/A |
| BP-230-03 | VFO-bound product sampled at YHS but reported as VFO inventory. | N/A | N/A |
| BP-230-04 | External-huller product sampled physically at VFO. | N/A | N/A |
| BP-230-05 | USDA updates field notes in the USDA portal. | N/A | N/A |
| BP-230-06 | Results viewed via Almond Logic login to the USDA portal (certificates linked to **VFO's USDA ID**), auto-entered to build a consolidated report. | RQ-USD-002 | Support user login to the USDA portal; automatically capture data from certificate field notes to generate **consolidated reports of all certificates**. |
| BP-230-07 | Incorrect weight reported → field note withheld from Almond Logic until corrected. | N/A | N/A |
| BP-230-08 | Missed YHS sample can be taken at VFO and sent to USDA. | N/A | N/A |

### 2.11 Shipment - Kernels — Area "260 - YHS - Shipment - Kernel"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-260-01 | Office scans available bin tags; at 20 bins associates them with a shipment. | RQ-SHP-001 | Scan bin tag IDs (handheld scanner or manual entry); validate bin availability; prevent duplicate bin assignment; auto-group bins into a shipment at the required quantity (e.g., **20 bins**). |
| BP-260-02 | Bin load sheet printed on shipment creation (grower, manifest, variety, etc.). | RQ-SHP-002 | Generate and print a **Bin Load Sheet**: grower details, variety, manifest details, bin list, shipment ID. All shipment documents stored and retrievable in D365. |
| BP-260-03 | Office adds Carrier, driver, truck, front and back trailer; tare fetched if present else manual; missing truck/driver/trailer created (license plate, truck number, front/back trailer). | RQ-SHP-003 | Master data for carriers, trucks, drivers, trailers; auto-fetch during shipment assignment; create truck/driver/trailer records on the fly; **tare weight stored in truck master data** and auto-fetched. |
| BP-260-04 | Empty truck to scale; tare from scale, else manual. | RQ-SHP-004 | Scale integration for tare and gross; manual entry if integration fails. |
| BP-260-05 | Create shipment first if it does not exist. | RQ-SHP-005 | Create a shipment if not already created and get the truck weight; assign the shipment to an existing truck or to a new ad hoc shipment. |
| BP-260-06 | Assign shipment to truck; **receive truck** in Almond Logic creates a shipping manifest; multiple manifests per shipment. | RQ-SHP-006 | Assign shipment to truck and driver; generate **shipping manifest** on assignment; multiple manifests per shipment; manifest includes bin count, shipment details, driver details, truck details (Figma link node 2186-2662). |
| BP-260-07 | **Load truck**: select all bins, confirm; shipment report summary and manifest to driver. | RQ-SHP-007 | Add/remove multiple bins and confirm the load; generate **shipment report summary**; D365 flags bins **"Loaded"**. |
| BP-260-08 | Gross weight captured at scale; departure recorded. | RQ-SHP-008 | Gross weight by scale or manual entry; status auto-updates to **"Departed"**; store tare, gross, net for reporting and compliance. |

### 2.12 Shipment - Inshells — Area "270 - YHS - Shipment - Inshells"

| BP # | As-is | REQ # | To-be requirement |
| --- | --- | --- | --- |
| BP-270-01 | Bulk load created in the **scale logistics** module (truck, trailer info, handler) → bulk tare tag ID; trailer tare captured manually. | RQ-SHP-009 | Unique **bulk load tare tag ID** on creation, **unassigned to any run**; scale integration for tare with manual entry allowed; bulk load record with mandatory fields (truck, trailer, handler, driver, etc.). |
| BP-270-02 | Missing driver/truck master data created; tare captured. | RQ-SHP-010 | Create truck and trailer master data before load creation if missing. |
| BP-270-03 | Bulk load assigned to a production run. | RQ-SHP-011 | Link the bulk load to a production run. |
| BP-270-04 | Bulk load tag created for the driver. | RQ-SHP-012 | Generate and print a **bulk load tag**; driver gives it to the production run manager to assign to a run. |
| BP-270-05 | Driver hands tag to the production run manager. | RQ-SHP-013 | Scan the bulk load tag to retrieve bulk load information. |
| BP-270-06 | Tag scanned; production run assigned to a truck. | RQ-SHP-014 | Assign a production run to a truck/trailer. |
| BP-270-07 | Truck/trailers loaded with inshells once the run is assigned. | RQ-SHP-015 | Status **'Ready for Loading'**; track loading progress against run and truck. |
| BP-270-08 | Loaded trailers sent to a staging location. | RQ-SHP-016 | Transfer inventory from production run to staging location. |
| BP-270-09 | Empty truck weighed for tare. | RQ-SHP-017 | Fetch or capture tare for the empty truck. |
| BP-270-10 | Missing trailer/truck data created in Almond Logic. | RQ-SHP-018 | Capture the trailers' **front and back numbers** when creating a shipment. |
| BP-270-11 | Shipment created if missing, then assigned to a truck. | RQ-SHP-019 | Validate whether a shipment exists; assign it or create a new one. |
| BP-270-12 | Weigh-out after assignment; weight certificate for truck with trailers. | RQ-SHP-020 | Weigh-out to capture gross; **weight certificate** (tare, gross, net, truck/trailer details, shipment ID, date & time); status **'Completed / Ready for Dispatch'**. |

---

## 3. Systems and actors

**Systems**
- **Almond Logic** — current (As-Is) system for receiving records, lot selection ("send load to plants"), Plant
  Status module, tank tickets, bin labels, Scale Logistics module, shipments/manifests ("Receive Truck", "Load
  Truck"), USDA certificate view.
- **D365 F&SC** — the To-Be system (Dynamics 365 Finance & Supply Chain).
- **YHS mobile app** — driver scans the Stockpile Location Ticket barcode, map view of the pile.
- **Scales** — entrance scale (gross), exit scale (tare); scale weighing also for inshell trailers, kernel bins and
  shipment trucks. Every weighing requirement asks for integration plus manual entry.
- **USDA portal** — field notes and certificates, linked to VFO's USDA ID.
- **Excel** — As-Is internal quality report, shelling QA report, byproduct/hash tracking.
- **Figma boards** — As-Is process flows (links only).
- Printers / handheld scanners (tickets, tags, labels).

**Organisations and roles**
- **Vann Bros.** (client), **Folio3** (implementer), **YHS** (Yolo Hulling and Shelling Company).
- **Growers** — deliver field run, bear inbound freight, informed of fumigation, may request quality results.
- **VFO** — provides pre-printed labels to growers at grower agreement; destination for kernels and inshells;
  its demand forecast drives lot selection; holds the USDA ID.
- **Handler** — field on tickets and labels; inshells go "to VFO or another handler".
- **AFS (Advance fumigation services)** — fumigates.
- **USDA** — samples and certifies.
- **Third party** — removes dirt and stone at YHS cost.
- Truck **Driver**, **office staff**, **Receptionist**, **Yard Leader**, **incoming QC team**, **Grower
  Representative**, plant **operator**, **Tester** (QA report field), **production run manager**, **Carrier**.

---

## 4. Diagrams (from the Diagrams file; derived, not signed)

1. **Master Material Flow** — grower field run → Receiving → Stockpile; dotted Fumigation loop (QC flag OR 10+
   days); Internal Quality and Picking off the stockpile; Pre-Cleaning → Hulling → inshells, high-fiber hulls (cow
   feed), low-fiber hulls (disposed), ~30% meats; inshells → Shipment-Inshells or Shelling → kernels + empty shells
   (given away free); kernels → Label Printing → Storage → Shipment-Kernels → VFO/Handler; USDA sampling dotted
   from kernels (3 lb / 30,000 lb) and inshells (3 lb / 30 min).
2. **Receiving** — scale-in (REC-001) → ticket (002) → first load? new/reuse (003) → app scan + map (005) →
   occupied? void + reassign (006) → unload → scale-out, net = gross − tare, manual option (007) → certificate
   (008); note for freight (009).
3. **Fumigation** — dwell tracking (010) → needed? → flag + notify, Required → Scheduled → Completed (011) →
   inform grower → AFS with tracked chemicals (012) → cost to YHS head expenses (013).
4. **Production** — subgraphs Picking (PRC-001..003), Pre-Cleaning (004..010), Hulling (011..017), Shelling
   (018..021).
5. **Label Printing** — weight (PRC-022) → label fields (023) → manual log sheet.
6. **Shipment - Kernels** — SHP-001..008 in sequence, with branches "Tare weight available?" and "Shipment exists?".
7. **Shipment - Inshells** — SHP-009..020, branches "Truck/driver master exists?" and "Shipment exists?".
8. **State machines** — 8a Stockpile lifecycle (Created → Accumulating → Sampling → FumigationDue → Fumigated →
   Staged → Consumed); 8b Tank (Empty → Brown → Running → Green ↔ Blue → Empty); 8c Fumigation (Required →
   Scheduled → Completed); 8d Shipment (Created → Assigned → Loaded → Departed). **Only 8c uses statuses named in
   the FRD.** 8a, 8b's Empty/transitions and 8d are the diagram author's inference.
9. **Traceability mindmap** — REQ groups per area; claims "33 functional requirements total" (actual: 61).
10. **Byproduct disposition** — high-fiber hulls sold (RQ-PRC-024), low-fiber disposed, meats recorded, empty
    shells free, dirt & stone third party, hash in Excel.

---

## 5. Glossary (as used in the FRD)

- **Field run** — product received from growers ("Receive Field run from growers"); the input of hulling.
- **Stockpile / lot / pile** — a yard location holding the loads of one Grower-Field-Variety; marked by a stick
  showing location, field number, variety. Location code example: **"West-A:02"**.
- **Field receipt tag / ticket** — pre-printed (provided by VFO to growers) in three copies: white (office), yellow
  (yard), pink (driver); scanned at picking and pre-cleaning.
- **Transport sheet** — accompanies the load throughout delivery.
- **Stockpile Location Ticket** — barcoded ticket with dump location and load details; voidable and reissuable.
- **Weight certificate** — gross, tare, net (receiving; inshell shipment adds truck/trailer, shipment ID, date & time).
- **Gross / Tare / Net** — loaded weight / empty weight / difference.
- **Handler** — a field on tickets and labels; VFO or another handler receives inshells.
- **Run Type**, **Run**, **Production run** — run identifiers on tickets, tags and labels; not defined further.
- **Staging** — plant staging area/location for trailers (picking) and loaded inshell trailers (shipment).
- **Plant Status** — Almond Logic module where field tickets are scanned at pre-cleaning.
- **Tank ticket** — printed on tank selection; scanning it sets the tank running.
- **Inshell(s)** — hulled almonds still in shell; shipped in trailers/bins/containers.
- **Kernels / meats** — shelled almonds; "meats" also the ~30% by-product vacuumed off during hulling.
- **High-fiber / low-fiber hulls** — sold as cow feed / disposed.
- **Bulk load tag** — tag for inshell trailer loads (hulling) and for bulk loads in inshell shipment.
- **Bulk (load) tare tag ID** — ID generated when a bulk load is created in Scale Logistics, unassigned to a run.
- **Bin label / bin tag** — kernel bin label; scanned to build kernel shipments.
- **Bin Load Sheet**, **shipping manifest**, **shipment report summary** — kernel shipment documents.
- **Hash** — a by-product tracked in Excel; not defined further.
- **Head expenses** — YHS overhead to which fumigation cost is allocated.
- **USDA handover sheet**, **field notes**, **certificates** — USDA sampling paperwork and results.

---

## 6. Open questions and ambiguities

1. **Who assigns the first location?** BP-130-05 says "the system checks"; RQ-REC-003 says the new location is
   "assigned by the user" and only subsequent loads are system-assigned.
2. **Inshell tare capture**: the narrative says trailer tare is "captured automatically through scale integration";
   BP-270-01 says "captured manually"; RQ-SHP-009 asks for integration with manual entry.
3. **Shipment end status differs**: kernels → "Departed" (RQ-SHP-008); inshells → "Completed / Ready for
   Dispatch" (RQ-SHP-020). No full status list for either.
4. **Tank statuses**: As-Is colours Green/Blue/Brown plus "Running Scanned Tank"; RQ-PRC-010/011 say "update the tank
   status" / "opened for processing" without To-Be status names.
5. **Duplicates**: RQ-PRC-020 = RQ-PRC-022 (bin weight) and RQ-PRC-021 = RQ-PRC-023 (bin label); RQ-PRC-001 and
   RQ-PRC-005 are both "scan the tag". Whether these are one feature or two is unstated.
6. **Prefix oddities**: fumigation uses RQ-REC-010..013; storage hull sales uses RQ-PRC-024.
7. **"e.g., 20 bins"** — fixed rule or configurable quantity?
8. **Byproducts without requirements**: low-fiber hulls, empty-shell disposal, dirt and stone, hash (BP-140-04..06
   N/A). RQ-PRC-024 covers hull sales only; how hull inventory is measured (visual estimate) in D365 is open.
9. **RQ-USD-001 field "Grower Field (linked to stockpile)"** — one field or two is unclear; the USDA sampling
   frequency is not a requirement, only As-Is.
10. **USDA integration**: RQ-USD-002 asks for portal login and automatic capture from field notes; no mechanism,
    credentials or VFO-vs-YHS reporting rule (BP-230-03) is specified.
11. **YHS mobile app**: not stated whether it exists today or is new, nor its link to D365 or to the Farm App.
12. **Scale integration**: vendor, devices and failure handling are not specified beyond "manual entry".
13. **RQ-QLT-001 "every five loads"** given as "e.g." — threshold for a "large" stockpile undefined.
14. **RQ-REC-010/011**: "fully created" stockpile (when the clock starts) is undefined; who receives the
    notification and whether AFS is a system user is open.
15. **Structure**: the TOC lists Storage and Fumigation after USDA while the body places Fumigation after Receiving;
    the Fumigation and Label printing As-Is link captions say "Storage process" and "shelling process".
16. **Diagrams file** reports 33 requirements (actual 61) and adds stockpile/shipment state machines not in the FRD;
    treat it as illustration only.

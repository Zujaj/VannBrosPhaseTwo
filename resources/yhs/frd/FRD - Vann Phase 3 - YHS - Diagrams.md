# YHS FRD — Process Diagrams

Mermaid diagrams derived from **FRD - Vann Phase 3 - YHS.md** (Yolo Hulling & Shelling Co.).
Covers the full field-run → kernel/inshell shipment pipeline, byproduct streams,
process state machines, and requirement traceability.

---

## 1. Master Material Flow (End-to-End)

High-level flow of almond material from grower delivery to VFO shipment, including
all byproduct streams (hulls, shells, meats, dirt/stone).

```mermaid
flowchart TD
    G([Grower Field Run]):::input --> R["Receiving<br>BP-130"]
    R --> SP[("Stockpile / Lot")]:::store

    SP -. "QC flag OR 10+ days" .-> F["Fumigation<br>BP-134"]
    F -. "back to pile" .-> SP

    SP --> IQ["Internal Quality Sampling<br>BP-132"]
    SP --> P["Picking for Processing<br>BP-155"]
    P --> PC["Pre-Cleaning<br>BP-180"]
    PC --> H["Hulling<br>BP-190"]

    H --> IS[/"In-shell Almonds"/]
    H --> HF["High-fiber Hulls"]:::by
    H --> LF["Low-fiber Hulls"]:::by
    H --> MM["~30% Meats (vacuum)"]:::by

    HF --> SOLD1["Sold as cow feed"]:::out
    LF --> DISP["Disposed"]:::out

    IS --> SHI["Shipment - Inshells<br>BP-270"]
    IS --> SH["Shelling<br>BP-200"]

    SH --> K[/"Kernels"/]
    SH --> ES["Empty Shells"]:::by
    ES --> FREE["Given away free"]:::out

    K --> LP["Label Printing<br>BP-220"]
    LP --> ST[("Storage<br>BP-140")]:::store
    ST --> SHK["Shipment - Kernels<br>BP-260"]

    SHK --> VFO([VFO / Handler]):::out
    SHI --> VFO

    K -. "3 lb / 30,000 lb" .-> USDA["USDA Sampling & Certs<br>BP-230"]:::qc
    IS -. "3 lb / 30 min" .-> USDA

    classDef input fill:#d4edda,stroke:#28a745,color:#000
    classDef store fill:#cce5ff,stroke:#0066cc,color:#000
    classDef by fill:#fff3cd,stroke:#cc9a06,color:#000
    classDef out fill:#f8d7da,stroke:#cc0000,color:#000
    classDef qc fill:#e2d9f3,stroke:#6f42c1,color:#000
```

---

## 2. Receiving Process (BP-130)

Truck weigh-in → stockpile ticket → location assignment → unload → weigh-out.

```mermaid
flowchart TD
    A([Truck arrives at YHS]) --> B["Scale-in: gross weight<br>RQ-REC-001"]
    B --> C["Driver hands field receipt tag<br>to office staff"]
    C --> D["Generate Stockpile Location Ticket<br>Grower/Field/Variety/Handler/Driver/Plates<br>RQ-REC-002"]

    D --> E{"First load for<br>Grower-Field-Variety?"}
    E -- Yes --> F["Assign NEW stockpile location<br>RQ-REC-003"]
    E -- No --> G["Reuse EXISTING location<br>RQ-REC-003"]

    F --> H["Driver scans barcode in YHS app<br>map navigation to pile<br>RQ-REC-005"]
    G --> H

    H --> I{"Assigned location<br>already occupied?"}
    I -- Yes --> J["Yard Leader + Reception<br>void ticket, assign new location<br>reissue ticket<br>RQ-REC-006"]
    J --> K
    I -- No --> K["Unload at stockpile location"]

    K --> L["Scale-out: tare weight<br>net = gross - tare (manual entry option)<br>RQ-REC-007"]
    L --> M["Print weight certificate<br>gross / tare / net<br>RQ-REC-008"]
    M --> N([Truck exits])

    note["Transport cost borne by grower<br>no freight posted to YHS — RQ-REC-009"]:::note
    classDef note fill:#fff3cd,stroke:#cc9a06,color:#000
```

---

## 3. Fumigation (BP-134)

Triggered by QC decision or 10+ day dwell; cost absorbed by YHS overhead.

```mermaid
flowchart TD
    A[("Stockpile created")] --> B["Start dwell-time tracking<br>RQ-REC-010"]
    B --> C{"Fumigation needed?<br>QC decision OR 10+ days in pile"}
    C -- No --> B
    C -- Yes --> D["Flag stockpile + notify fumigation team<br>status: Required → Scheduled → Completed<br>RQ-REC-011"]
    D --> E["Inform grower"]
    E --> F["AFS fumigates using YHS chemicals<br>track chemical/equipment inventory + expense<br>RQ-REC-012"]
    F --> G["Record cost under YHS head expenses<br>no grower billing<br>RQ-REC-013"]
    G --> H[("Stockpile fumigated")]
```

---

## 4. Production: Picking → Pre-Cleaning → Hulling → Shelling (BP-155/180/190/200)

```mermaid
flowchart TD
    subgraph PICK["Picking — BP-155"]
        A["Select lot: inventory + VFO forecast + weekly plan"] --> B["Load lot on YHS trailer"]
        B --> C["Scan field receipt tag — 'send load to plants'<br>transfer inventory to staging<br>RQ-PRC-001 / 002"]
        C --> D["Trailer parked in plant staging<br>real-time trailer count + field/variety/grower<br>RQ-PRC-003"]
    end

    subgraph PRE["Pre-Cleaning — BP-180"]
        D --> E["Check empty/available tank (real-time)<br>RQ-PRC-004"]
        E --> F["Scan field ticket in Plant Status<br>fetch grower/field/variety<br>RQ-PRC-005 / 006"]
        F --> G["Position trailer over pit, dump load<br>pre-cleaner start/stop<br>RQ-PRC-007"]
        G --> H["Select tank for filling<br>RQ-PRC-008"]
        H --> I["Generate + print Tank Ticket<br>RQ-PRC-009"]
        I --> J["Scan tank ticket → tank 'Running'<br>RQ-PRC-010"]
    end

    subgraph HULL["Hulling — BP-190"]
        J --> K["Open tank gates → processing line<br>RQ-PRC-011 / 012"]
        K --> L[/"In-shell almonds"/]
        K --> M["High-fiber hulls (byproduct inventory)<br>RQ-PRC-013"]
        K --> N["~30% meats via vacuum (byproduct)<br>RQ-PRC-014"]
        L --> O["Load inshells to trailer/bins<br>bin ID printed<br>RQ-PRC-015"]
        O --> P["Weigh trailer (scale or manual)<br>RQ-PRC-016"]
        P --> Q["Issue bulk load tag<br>RQ-PRC-017"]
    end

    subgraph SHELL["Shelling — BP-200"]
        L --> R["Shell inshells → kernels"]
        R --> S["QA test report: moisture, defects, twins,<br>insect, size, meat % ...<br>RQ-PRC-018"]
        R --> T["Empty shells inventory<br>RQ-PRC-019"]
        R --> U["Load kernels to bins, capture weight<br>RQ-PRC-020"]
        U --> V["Print bin label tag, attach to bin<br>RQ-PRC-021"]
    end
```

---

## 5. Label Printing (BP-220)

```mermaid
flowchart LR
    A["Kernels loaded in bins"] --> B["Record scale weight<br>(scale integration or manual)<br>RQ-PRC-022"]
    B --> C["Print bin label<br>Bin ID, Run, Grower, Field, Variety,<br>Product, Handler, Gross/Tare/Net<br>RQ-PRC-023"]
    C --> D["Manual log sheet<br>date / time / bin tag / weight"]
```

---

## 6. Shipment — Kernels (BP-260)

```mermaid
flowchart TD
    A["Scan 20 bin tags — validate, no duplicates<br>RQ-SHP-001"] --> B["Auto-group bins → create shipment"]
    B --> C["Print Bin Load Sheet<br>grower/variety/manifest/bin list/shipment ID<br>RQ-SHP-002"]
    C --> D["Enter truck info: carrier/driver/truck/trailers<br>create master data if missing<br>RQ-SHP-003"]
    D --> E{"Tare weight available?"}
    E -- Yes --> G
    E -- No --> F["Empty truck to scale OR manual entry<br>RQ-SHP-004"]
    F --> G{"Shipment exists?"}
    G -- No --> H["Create shipment<br>RQ-SHP-005"]
    H --> I
    G -- Yes --> I["Assign shipment to truck → 'Receive Truck'<br>generate manifest (multiple per shipment)<br>RQ-SHP-006"]
    I --> J["Load truck: select + confirm bins → bins 'Loaded'<br>generate shipment summary + manifest<br>RQ-SHP-007"]
    J --> K["Gross weigh → status 'Departed'<br>store tare/gross/net<br>RQ-SHP-008"]
    K --> L([Truck departs to VFO])
```

---

## 7. Shipment — Inshells (BP-270)

```mermaid
flowchart TD
    A["Create bulk load in Scale Logistics<br>→ bulk tare tag ID (unassigned)<br>truck/trailer/handler, tare via scale<br>RQ-SHP-009"] --> B{"Truck/driver master exists?"}
    B -- No --> C["Create master data<br>RQ-SHP-010"]
    C --> D
    B -- Yes --> D["Assign bulk load to production run<br>RQ-SHP-011"]
    D --> E["Print bulk load tag for driver<br>RQ-SHP-012"]
    E --> F["Driver → run manager: scan tag<br>RQ-SHP-013"]
    F --> G["Assign production run to truck/trailer<br>RQ-SHP-014"]
    G --> H["Load truck with inshells → 'Ready for Loading'<br>RQ-SHP-015"]
    H --> I["Move loaded trailers to staging<br>RQ-SHP-016"]
    I --> J["Empty truck → scale: capture tare<br>RQ-SHP-017"]
    J --> K["Capture trailer front/back numbers if missing<br>RQ-SHP-018"]
    K --> L{"Shipment exists?"}
    L -- No --> M["Create shipment<br>RQ-SHP-019"]
    M --> N
    L -- Yes --> N["Weigh-out loaded truck → weight certificate<br>status 'Completed / Ready for Dispatch'<br>RQ-SHP-020"]
    N --> O([Dispatch to VFO])
```

---

## 8. State Machines

### 8a. Stockpile (Lot) Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created : first load received
    Created --> Accumulating : continued loads (same G-F-V)
    Accumulating --> Accumulating : add load
    Created --> Sampling : internal QC (first/last + every 5 loads)
    Accumulating --> Sampling
    Sampling --> FumigationDue : QC flag OR 10+ days
    FumigationDue --> Fumigated : AFS treats
    Fumigated --> Staged : picked for processing
    Sampling --> Staged : picked for processing
    Staged --> Consumed : dumped to pit / pre-clean
    Consumed --> [*]
```

### 8b. Tank Status (BP-180-07)

```mermaid
stateDiagram-v2
    [*] --> Empty
    Empty --> Brown : being filled / different run
    Brown --> Running : tank ticket scanned
    Running --> Green : in use for production
    Green --> Blue : load belongs to same run
    Blue --> Green
    Green --> Empty : production complete
```

### 8c. Fumigation Status (RQ-REC-011)

```mermaid
stateDiagram-v2
    [*] --> Required : QC flag / 10+ days
    Required --> Scheduled : task assigned to AFS
    Scheduled --> Completed : treated + cost recorded
    Completed --> [*]
```

### 8d. Shipment Status (BP-260 / BP-270)

```mermaid
stateDiagram-v2
    [*] --> Created : bins grouped / bulk load created
    Created --> Assigned : assigned to truck
    Assigned --> Loaded : bins/inshells confirmed
    Loaded --> Departed : gross weigh-out + weight cert
    Departed --> [*]
```

---

## 9. Requirement Traceability Map

Requirement IDs grouped by area (33 functional requirements total).

```mermaid
mindmap
  root(("YHS FRD<br>Vann Phase 3"))
    Receiving 130
      "RQ-REC-001 scale-in"
      "RQ-REC-002 stockpile ticket"
      "RQ-REC-003 location assign/reuse"
      "RQ-REC-004 load capture"
      "RQ-REC-005 barcode + map"
      "RQ-REC-006 reassign location"
      "RQ-REC-007 scale-out / net"
      "RQ-REC-008 weight certificate"
      "RQ-REC-009 grower-borne freight"
    Fumigation 134
      "RQ-REC-010 dwell tracking"
      "RQ-REC-011 flag + status"
      "RQ-REC-012 chemical inventory"
      "RQ-REC-013 cost allocation"
    Quality 132
      "RQ-QLT-001 sample records"
      "RQ-QLT-002 results in D365"
    Processing 155-220
      "RQ-PRC-001..010 pick + pre-clean"
      "RQ-PRC-011..017 hulling"
      "RQ-PRC-018..021 shelling"
      "RQ-PRC-022..024 label + storage"
    USDA 230
      "RQ-USD-001 sample tags"
      "RQ-USD-002 portal + consolidated certs"
    Shipment 260-270
      "RQ-SHP-001..008 kernels"
      "RQ-SHP-009..020 inshells"
```

---

## 10. Byproduct / Disposition Summary

```mermaid
flowchart LR
    H["Hulling/Shelling"] --> HF["High-fiber hulls"]:::sell
    H --> LF["Low-fiber hulls"]:::disp
    H --> M["Meats (~30%)"]:::by
    H --> ES["Empty shells"]:::free
    H --> DS["Dirt & stone"]:::third
    H --> HASH["Hash"]:::xl

    HF --> S1["Sold @ premium as cow feed<br>visual pile estimate, no grower pay<br>RQ-PRC-024"]
    LF --> S2["Disposed"]
    M --> S3["Byproduct inventory recorded"]
    ES --> S4["Given away free, self-collect"]
    DS --> S5["Removed by 3rd party at YHS cost"]
    HASH --> S6["Tracked in Excel, no grower pay"]

    classDef sell fill:#d4edda,stroke:#28a745,color:#000
    classDef disp fill:#f8d7da,stroke:#cc0000,color:#000
    classDef by fill:#fff3cd,stroke:#cc9a06,color:#000
    classDef free fill:#cce5ff,stroke:#0066cc,color:#000
    classDef third fill:#e2d9f3,stroke:#6f42c1,color:#000
    classDef xl fill:#f0f0f0,stroke:#666,color:#000
```

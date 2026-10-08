# AgriERP & D365 Work Order Management — Training Notes

## Executive Overview
These training notes document the end-to-end operational and financial lifecycle of Work Orders (WO) within AgriERP and its integration with Microsoft Dynamics 365 Finance & Operations (FinOps).

---

## 1. System Hierarchy & Visual Field Mapping
- **Organizational Hierarchy:**
  - **Grower** (e.g., VBS Grower) $\rightarrow$ **Site** $\rightarrow$ **Farm** $\rightarrow$ **Field/Plot** (the actual cultivation area).
- **Map Visualization:**
  - Coordinates provided by fields populate visually on the AgriERP map interface.
  - Map toggles display crop types and custom color-coding per commodity (e.g., walnuts, almonds).

---

## 2. Module Navigation & Work Order Categorization
- **Navigation Path:** Top navigation bar $\rightarrow$ `Work Order` module.
- **Filtering Options:** View work orders filtered by status (`To Do`, `In Progress`, `In Review`, `Done`).
- **Work Order Types:**
  1. **Execution Work Order (Default / Mix):** Used for field operations like spraying, harvesting, soil preparation, and planting.
  2. **Inspection Work Order:** Used strictly for scouting and observation tasks.
- **Observations Workflow:**
  - Field workers raise an **Observation** (e.g., detecting a spider mite attack at 50% threshold on Field #15).
  - Observations can be converted into an **Inspection Work Order** (to assess field state) or an **Execution Work Order** (to apply corrective treatment).

---

## 3. Work Order Header & Scheduling Parameters
- **Header Fields:**
  - **Start Date & End Date:** Define the planned operational window. *Note:* Dates act as target schedules for sorting/organization; system logic does not restrict actual job execution outside these dates.
  - **Priority:** Primary sorting key in list views (High, Medium, Low).
  - **Farm Selection:** Specifies the target farm location.
  - **Task Selection:** Choose from configured Farm Operations (inspection tasks do not appear in default WO execution dropdowns).
- **Role Definition:**
  - **Supervisor:** Responsible for opening, managing, and closing work orders.
  - **Responsible Person:** Optional field; allows a user to initiate or run job execution on behalf of others.

---

## 4. Field Plots & D365 FinOps Project Integration
- **Project Linkage:** Selecting plots links the Work Order directly to active D365 FinOps Projects (must be in `In Process` status).
- **Multi-Plot & Multi-Project Flexibility:**
  - A single Work Order can cover **multiple plots** and **multiple projects**.
  - A single physical field can contain **multiple projects** (e.g., a 100-acre field split into 10 projects, or multi-cropped fields like 50% almonds and 50% walnuts).
- **Project Lifecycle:** Projects close annually for financial alignment with crop cycles. Once closed, field acreage returns to the available land pool.

---

## 5. Material & Inventory Item Classification
Items are synchronized from D365 FinOps and categorized into Raw Materials and Fresh Goods:

| Item Classification | Storage Location | D365 Tracking | Operational Handling |
| :--- | :--- | :--- | :--- |
| **Lot-Tracked Materials** | Chemical Shed | Batch/Lot Enabled | Requires pre-dispatch transfer via Inventory App |
| **Non-Lot Tracked Materials** | Yard / Umbrella Locations | Non-Batch | Liquid/Dry fertilizers, soil amendments; consumed directly |
| **Fresh Goods** | Fields / Harvest Sites | Serial/Lot or Standard | Harvested crop output |

- **Budgeted Quantity Calculation:**
  $$\text{Budgeted/Total Quantity} = \text{Rate per Acre} \times \text{Operational Area (Acres)}$$

---

## 6. Resource & Asset Allocation Rules
- **Human Resources:** Workers (Farm Hands or Machine Operators) assigned based on D365 User IDs.
- **Assets & Implements:**
  - **Machine (Asset):** e.g., Tractor.
  - **Implement:** Equipment attached to the tractor (e.g., cultivator, sprayer).
- **Validation Constraint:** If a Machine asset is attached to a Work Order, a **Machine Operator** resource *must* be assigned. A Farm Hand cannot operate machinery alone. Multiple resources can be assigned to a single Work Order.

---

## 7. Work Order Execution Lifecycle & Mobile Flow
```
[Draft / To Do] ──(Supervisor Opens)──> [Open] ──(Worker Starts Job)──> [In Progress]
                                                                             │
[Done] <──(Manager Approves)── [In Review] <──(Worker Ends WO)──────────────┘
```

1. **Supervisor Initiation:** Supervisor logs into the AgriERP Mobile App, selects the WO under `To Do`, and sets status to `Open`. (Workers cannot start timers or consume materials until the WO is opened).
2. **Editing Rights:** Work Orders can be recalled and edited until set to `In Progress`.

---

## 8. Material Dispatching via Inventory App
- **Dispatch Execution:** Handled by Chemical Shed warehouse personnel (e.g., Maria) using the Inventory Mobile App.
- **Dispatch Methods:** Via Work Order list or directly from the Inventory Module using QR code scanning on batch labels.
- **Inventory Transfer Journal in FinOps:**
  - Dispatching lot-tracked chemicals automatically triggers an **Inventory Transfer Journal** in D365 FinOps.
  - Moves inventory from `Chemical Shed` location to `Staging` location (representing the field).
- **Quantity Flexibility:** Warehouse can dispatch more than the budgeted quantity (e.g., dispatching 150 units for a 135-unit budget, anticipating returns).

---

## 9. Mobile Job Execution & Time Tracking
- **Job Timer:** Field worker starts job on mobile app (initiating active duration tracking).
- **Pause & Progress Entry:**
  - Worker pauses job to log actual completed acreage and material consumed.
  - System automatically maps consumed items to mapped field locations (`Staging` for chemicals, `Yard` for fertilizers).

---

## 10. Review, Approval & FinOps Financial Postings
1. **Submission for Review:** Worker ends WO on mobile app $\rightarrow$ Status changes to `In Review`.
2. **Operations Manager Approval:** Operations Manager reviews actual progress and consumed quantities $\rightarrow$ Changes status to `Done`.
3. **FinOps Project Item Journal Posting:**
   - Automatically posts a **Project Item Journal** in D365 FinOps against the linked Project.
   - **FIFO Consumption:** Lot-tracked chemicals are consumed from `Staging` using First-In, First-Out (FIFO) logic across dispatched batches.
   - **Costing Basis:** Valued at D365 **Latest Cost Price**, with financial reconciliation occurring during standard FinOps Inventory Closing.
4. **Resource Expense Posting:**
   - Machine usage expenses post to the project based on defined unit costs per acre/hour.
   - Human labor costs are managed externally via monthly payroll exports (e.g., PayCom / Nikki's monthly project upload) rather than real-time hour journals.

---

## 11. Material Returns & FIFO Batch Adjustments
- **Return Process:** Unused chemicals brought back to the Chemical Shed are scanned via QR code on mobile.
- **FinOps Adjustment & Transfer:**
  - If returned batches differ from the FIFO consumption assumption, FinOps automatically executes an **Inventory Adjustment Journal** prior to posting the **Inventory Transfer Journal** (`Staging` $\rightarrow$ `Chemical Shed`).

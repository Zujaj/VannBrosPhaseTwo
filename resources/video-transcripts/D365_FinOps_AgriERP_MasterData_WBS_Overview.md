# Dynamics 365 FinOps & AgriERP Integration: Training Notes

> **Topic:** D365 Finance & Operations (FinOps / F&O) AgriERP Master Data Setup, Resource Management, Product Inventory, and Work Order WBS Sync

---

## 1. Architectural Shift: Business Central (BC) vs. D365 FinOps (F&O)
* **Hierarchy Simplification:** In Business Central, master data was structured under a multi-tier hierarchy (*Grower → Site → Location → Field*). In D365 FinOps, this hierarchy is eliminated on the ERP side. AgriERP maintains the full spatial hierarchy, while D365 FinOps holds a streamlined, direct list of **Plots and Fields** synced directly from AgriERP [2, 3].
* **Seasons vs. Crop Years:** Business Central managed seasons via dimensions. D365 FinOps features a dedicated **Crop Year** setup page (e.g., Crop Year 25, 26, 27) against which all project management and tracking occur [4].
* **Farm Operations:** In BC, operations contained master tasks with pre-budgeted planning lines. In D365 FinOps, **Farm Operations** are defined as clean master records (e.g., Planting, Fertilization, Irrigation) without complex pre-configured planning lines, supporting dynamic field execution [5].

---

## 2. AgriERP Parameters & System Configuration in FinOps
*(Navigation: `AgriERP Management > Setup > AgriERP Parameters`)*

* **Project Edit & Status Controls:** Parameters define at which status a project can be updated or locked. For example, once a project moves past `In Process` to `Finished`, editing and updates are restricted [6, 9, 10].
* **Farm App Syncing Level:** Configurable trigger that dictates when a project syncs to the mobile Farm App (e.g., sync upon creation, at `In Process`, or when `Finished`) [9, 10].
* **Material Item Group Mapping:** Categorizes items into functional groups so AgriERP surfaces them in the correct dropdown lists:
  * **Group 4:** Semi-Finished Goods / Crop Items (harvested yield) [8].
  * **Group 6:** Liquid Fertilizers, Chemicals, and Soil Amendments [6, 8].
* **Default Journals & Batch Formats:** Configures default **Project Item Journals**, **Expense Journals**, and inventory issue/receiving batch numbering rules (e.g., Prefix + `01`) [11, 12].

---

## 3. Master Data Setup in D365 FinOps

### A. Plots, Fields & Irrigation Methods
* **Plot & Field Master:** Synced from AgriERP containing field name, description, total area, irrigation storage, and weather attributes [2, 4].
* **Irrigation Setup:** Configured at the Plot level to specify the exact irrigation method assigned to each field [6].

### B. Resource Management
*(Navigation: `Organization Administration > Resources > Resources`)*

1. **Personal Resources (Human Resources):**
   * Must be linked to an active **Worker** record in D365 HR [13, 14].
   * Captures designation (e.g., Operations Manager, Machine Operator), fixed or contract status, standard hours, and joining calendar [13, 14].
   * Usage Unit is set to **Hours (`hrs`)** with a defined cost price per unit [14].
2. **Machine Resources (Assets & Implements):**
   * Configured as `Machine` or `Implement` resource groups [15].
   * Does **not** require a linked Worker record [15].
   * Defines usage unit (e.g., Acres operated), unit cost, and assigned calendar [15].

### C. Product & Inventory Setup
*(Navigation: `Product Information Management > Released Products`)*

* **Lot-Tracked Items (Chemicals):** Require dispatching and inventory receiving before consumption can be posted [16, 17].
* **Non-Lot Tracked Items (Fertilizers):** Can be consumed directly during field work without prior dispatch transfers [16].
* **Item Model Group (FIFO Costing):** Items use **First-In, First-Out (FIFO)** logic to automatically pick inventory from the earliest received batch or staging location [18, 19].
* **Units of Measure:** Distinguishes between **Usage Unit** (how material is applied in the field) and **Base Unit** (inventory storage unit) with defined unit conversion factors [20].

---

## 4. Project Management & Work Order WBS Sync
*(Navigation: `Project Management and Accounting > Projects > All Projects`)*

### A. Project Creation
* Projects are created under the **Time & Material** project group to enable mobile time and material tracking [24].
* The **AgriERP Tab** on the project record links the D365 Project to specific AgriERP parameters: **Plot**, **Crop Year**, **Crop Type** (e.g., Corn), and **Irrigation Method** [25].

### B. Work Breakdown Structure (WBS) & Ad-Hoc Execution
* The **Work Breakdown Structure (WBS)** represents the master farm operations for the project [27, 30].
* **Ad-Hoc Execution:** D365 FinOps currently operates on an **Ad-Hoc** basis (without pre-budgeted baseline lines). When a Work Order is generated in AgriERP, an Ad-Hoc task is created in the WBS containing the Work Order ID (e.g., *WO 58* under *Fertilization*) [28, 29, 30].

### C. Journal Postings & Ledger Entries
* **Item Consumption:** Actual field material usage generates and posts a **Project Item Journal** linked directly to the WBS activity line [31, 32, 33].
* **Machinery & Labor Expenses:** Resource usage generates **Expense / Hour Journals** under the project to capture machine and labor costs against the activity [31, 33].

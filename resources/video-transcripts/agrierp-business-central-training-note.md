# AgriERP Business Central Training Notes

A comprehensive training guide covering organizational structure, master data setup, task management, task templates, and crop project planning workflows within AgriERP and Microsoft Dynamics 365 Business Central.

---

## 1. AgriERP Organizational Hierarchy

The agricultural enterprise structure in AgriERP / Business Central is organized in a multi-tiered geographic hierarchy that defines land usage and ownership from macro-level entity down to micro-level plot.

### 1.1 Hierarchy Layers
1. **Grower**: The top-level entity or enterprise owning/managing the agricultural operations (e.g., *Circle B Farms*).
2. **Growing Site**: The specific geographical location or site under a grower.
3. **Growing Area**: The farm or sector grouping within a site.
4. **Growing Plots / Fields**: The specific operational land units where crop cultivation occurs.

```
Grower (e.g., Circle B)
 └── Growing Site (Location)
      └── Growing Area (Farm)
           └── Growing Plots / Fields (Specific Land Units)
```

### 1.2 Area Distinctions
* **Total Area**: The total geographic physical land area assigned to a plot (e.g., 400 acres/hectares).
* **Operational Area**: The actual net area utilized for active crop growing or operational activities within that plot.
  * *Constraint*: Operational Area can be less than or equal to Total Area, but can **never** exceed Total Area.

### 1.3 Coordinates & Map Syncing
* Each growing plot stores spatial metadata including **Latitude**, **Longitude**, and boundary **Coordinates**.
* These coordinates automatically synchronize with the **AgriERP Map** interface for visual field mapping.

### 1.4 Architecture Transition
* **Current State**: The full organizational hierarchy is managed inside Business Central ERP.
* **Target Architecture**: The hierarchy management is transitioning entirely to the **AgriERP mobile application** (already completed for FAO, ongoing in Business Central) to streamline field operations.

### 1.5 Navigation Path
> **Main Menu / Search** $\rightarrow$ `Growing Plots`  
> *(Alternative Path: `Growers` $\rightarrow$ Select Grower $\rightarrow$ `Growing Sites` $\rightarrow$ `Growing Areas` $\rightarrow$ `Growing Plots`)*

---

## 2. Master Data Setup

Before executing planning or field activities, core master datasets must be defined across Resources and Items.

### 2.1 Resources Master Data
Resources track labor and machinery costs across field operations.

* **Person Resources**:
  * Represents individuals performing manual or machine-driven field work (e.g., tillage operators, fertilizer sprayers).
  * Configured with **Person Group**, **Base Unit of Measure**, and **Use Unit of Measure**.
* **Machine & Implement Resources**:
  * **Machine Resources**: Primary motorized equipment (e.g., Tractors, Green Carts).
  * **Implement Resources**: Attachments connected to or drawn by machines (e.g., tillage implements, spray rigs, attachments).
  * Configured with **Resource Group**, **Machine ID**, **Base Unit**, and **Use Unit**.

> **Navigation Path**:  
> **Search / Menu** $\rightarrow$ `Resources` $\rightarrow$ Filter by `Type` (`Person` or `Machine`) $\rightarrow$ Resource Card

### 2.2 Items Master Data
Items represent materials and agricultural outputs used or produced in the field.

* **Item Categorization**:
  * **Growing Items**: Crop produce cultivated on plots (e.g., *Potato L1*, *Corn Yellow*).
  * **Material / Non-Growing Items**: Consumable inputs applied during field operations (e.g., fertilizers, chemicals, spray material, fuel/Fuel Farm).
* **Item Types**:
  * `Inventory` (physical materials consumed in field activities).
  * `Service` / `Non-Inventory`.
  * Classified explicitly via **Item Type** (e.g., `Growing Item` vs. `Material`).
* **Field-Level Variety Handling**:
  * Crop varieties (e.g., Almond varieties like *Aldrich*, *Nonpareil*, *Padre*) are managed at the **Field/Plot Level** (rows or sub-zones within a plot) rather than directly on the raw inventory item level.

> **Navigation Path**:  
> **Search / Menu** $\rightarrow$ `Products` / `Items` $\rightarrow$ Filter by `Item Type` (`Growing Item` or `Material`) $\rightarrow$ Item Card

---

## 3. Master Tasks & Planning Lines

Master Tasks standardise recurring agricultural operations across fields.

### 3.1 Master Tasks
* Standardized operational templates for specific field activities (e.g., *Corn Yellow Spray*, Tillage, Irrigation).
* Allows repeat usage whenever an operation needs to be executed across various plots.

### 3.2 Planning Lines
Every Master Task contains underlying **Planning Lines** defining exact resource requirements:
* **Person Resources**: Specifies required labor roles/operators.
* **Machine Resources**: Specifies required tractors or implements.
* **Material Items**: Specifies exact chemicals/fertilizers required for the activity.
* *Note*: Growing items are excluded from task planning lines; they are assigned directly to the plot/project level.

> **Navigation Path**:  
> **Search / Menu** $\rightarrow$ `Master Tasks` $\rightarrow$ Select Task $\rightarrow$ `Planning Lines`

---

## 4. Task Templates

Task Templates bundle individual operations into full crop lifecycle workflows.

### 4.1 Purpose & Function
* Bundles multiple Master Tasks spanning from initial soil preparation/tillage through to harvest (e.g., 10 to 20+ sequential operations).
* Standardizes crop management protocols and maximizes reusability during project creation.

### 4.2 Lifecycle Workflow
1. Select Target Crop / Growing Item (e.g., *Corn Yellow*).
2. Attach sequential Master Tasks in chronological order.
3. Save template for re-use across multiple projects.

> **Navigation Path**:  
> **Search / Menu** $\rightarrow$ `Task Templates` $\rightarrow$ `New` $\rightarrow$ Select `Growing Item` $\rightarrow$ `Import Master Tasks`

---

## 5. Project & Crop Planning Workflow

Crop Planning integrates organizational hierarchy, master items, and task templates into an actionable, budgeted project.

### 5.1 Project Setup Steps
1. **Define Crop & Cycle**: Assign `Growing Item` (e.g., *Corn Yellow*) and `Growing Cycle Code` (e.g., *2025/2026/2027*).
2. **Assign Geographic Location**: Select `Grower`, `Growing Site`, `Growing Area`, and `Growing Plot`.
3. **Set Operational Area**: Define the exact active area for this plan (can be a subset of total plot operational area, e.g., 20 units out of 100).
4. **Define Yield Expectations**: Enter the **Budgeted Harvest Quantity** (estimated crop yield).

### 5.2 Importing Operations & Budget Calculation
1. **Import Master Tasks / Task Template**: Pull pre-configured task templates or individual master tasks into the project.
2. **Automatic Budget Summation**: The system automatically calculates the total **Project Budget** by aggregating unit costs across all planning lines (person labor + machine usage + material input costs).
3. **AgriERP Sync**: Upon confirmation, project plans and line tasks automatically sync to the **AgriERP Mobile App** for field execution and tracking.

> **Navigation Path**:  
> **Search / Menu** $\rightarrow$ `Projects` / `Crop Planning` $\rightarrow$ `New Project` $\rightarrow$ Fill General & Location Details $\rightarrow$ Action: `Import Master Tasks / Task Template` $\rightarrow$ Verify `Calculated Budget`

---

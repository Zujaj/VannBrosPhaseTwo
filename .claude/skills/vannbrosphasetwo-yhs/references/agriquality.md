# YHS AgriQuality (Quality Management) — spec reference

> **Source:** `resources/yhs/AgriQuality Quality Management Product Spec.md` (Markdown copy of the PDF).
> **Title:** "AgriQuality Quality Management — Processor Mobile and Desktop App", Product Specifications Document **V 1.1**.
> **Revision history:** only one row: 31-Dec-25, Aqib Malik, 1.0, "Initial Release". The v1.1 changes are in a trailing section, "Updates: v1.1", with no date.
> **Spec-level — not yet live-verified.** Nothing here has been checked against a running app.
> Prototype (web): `https://agrierp-quality-vb.folio3.site/`. The mobile prototype `https://agrierp-quality-mobile-vb.folio3.site/` is struck through in the source. Final design link: "[Yet to be inserted]".

## 1. What the spec does and does not cover

The task asked about sampling at receiving, grading, USDA, certificates, holds/rejections and lab results. Coverage in the spec:

| Topic | In spec? | What it says |
|---|---|---|
| Configurable quality parameters (moisture, FM, defects, size) | Yes | Built as **Quality Attributes**. They are examples only. No fixed parameter list is given. |
| Insect damage | No | Not mentioned. |
| Sampling at receiving / stockpile | Partly | "Incoming sampling (receiving / stockpile)" is a supported process. It runs as a Quality Order built from a template. There is no separate sampling screen. |
| Multiple samples, lot-level averages | Overview only | "Support for multiple samples and calculation of aggregated (lot-level) quality results". No screen is specified. It is done through Formula attributes (AVG, SUM, and so on). |
| Grading / inspection | Yes | A Quality Order is the inspection record. AI/ML-based grading is out of scope. |
| USDA | Out of scope | "External regulatory integrations (e.g., USDA systems)" are out of scope. "USDA Sampling (Future Release - Handler)" is listed as a module. |
| Fumigation | Contradictory | It is in scope ("Fumigation Orders"), but the "Fumigation Order" row in the module table is struck through. No screen is specified. |
| Certificates, holds, rejections, lab results | No | Not mentioned. The only Quality Order statuses are To Do and Completed, plus the Void action. |
| Quality-based pricing | Out of scope | "Financial processing or quality-based pricing adjustments". |

## 2. Module overview

- AgriQuality is a "centralized Quality Management System (QMS) that manages quality across receiving, production, and finished goods".
- It is template-driven, with these building blocks:
  - **Quality Attributes**: the measurements (for example moisture, FM, defects).
  - **Template Attributes**: the context (for example lot, sample, location, run).
  - **Templates**: the quality test definitions.
  - **Quality Orders**: the execution of samples and tests.
  - **Fumigation**: the execution of fumigation. Not detailed.
- It supports four kinds of quality process: incoming sampling (receiving / stockpile), in-process production quality, equipment quality checks for calibration, and finished goods quality.
- "Quality Orders are linked to operational data (stockpiles, bins, runs, lots)".
- Apps:
  - **Web** for configuration, monitoring and management.
  - **Mobile/Tablet** for on-floor execution. In v1.1, mobile/tablet is moved to Future Considerations ("Enable mobile/tablet interface for field users").
- The flow diagrams name the app "AgriQC Web App". Elsewhere it is "AgriQuality Web App".

### High-level modules (Key Modules & Features table)

| Module | Platform | Notes |
|---|---|---|
| ~~Dashboard~~ | ~~Both~~ | Struck through. |
| Quality attributes | Web | "moisture content, foreign material (FM), size, etc." |
| Template attributes | Web | "fields for field run almonds, inshells, kernels, and farming" |
| Templates | Both | Standardized templates for quality control jobs. |
| Quality Orders | Both | "incoming quality tests, process/production quality test" |
| USDA Sampling (Future Release - Handler) | Both | "Built in Handler Quality App, used here for processors also." |
| ~~Fumigation Order~~ | ~~Both~~ | Struck through. |
| Scanner | Both | "Stockpile scanning, Bin & serial label scanning, and trailer licence scanning." |
| Reports & Inquiries | Web | "Generate the spreadsheets for quality orders data." |
| Profile | Both | Language, Security (Password & Pin), Preferences, Sign-out. |
| Settings | Web | Master Data Management, User Management, Bulk Upload (future). |

In v1.1, Setup / Settings, master data and user permissions move to a central **Admin portal**, which has its own separate spec.

## 3. Roles

| Role | v1.0 app | v1.1 app | Responsibilities |
|---|---|---|---|
| Quality Manager (persona "Nikki") | AgriQuality Web App | AgriQuality Web App | Manages quality control jobs. Assigns jobs to resources. Reviews pending jobs. Manages user access. Defines templates and attributes. |
| Quality Supervisor (persona "John") | AgriQuality Mobile/Tab App | **AgriQuality Web App** | Creates and completes quality orders. Selects templates or assigned orders, enters values, and saves drafts. |

In v1.1, both roles can create, submit and complete Quality Orders.

## 4. Shared list-screen behaviour

All main screens (Quality Attributes, Template Attributes, Templates, Quality Orders) share this behaviour:

- **Card View** and **Grid View (Tabular View)** with a toggle.
  - Card View is the default for attributes and templates.
  - Grid View is the default for Quality Orders.
- A search bar and an expandable/collapsible filter panel.
- Column show/hide and sorting, saved as a per-user preference. Each column can be sorted and filtered.
- Pagination: records per page (for example 10 entries) and next/previous.
- Each module is reached from the left-side navigation panel.
- Dropdown lists exist for growers, handlers, product type, variety, farming type (organic and conventional) and locations.

## 5. Quality Attributes

These are measurable parameters that are reused across all templates.

**Main screen columns:** Attribute Name, Attribute Type, Description, Unit, Acceptable Range, Compliance rules, Created By, Created Date, Actions.

- **Search:** Name, Description, Type.
- **Filter panel:** Name, Status, Type.
- **Create button:** `New Attribute`. The user journey calls it "Create New Attribute".
- **Actions:**
  - **Edit:** the edit icon on a card, or a click on the row in the grid.
  - **Disable:** a toggle. Disabled attributes are excluded from templates and execution.
  - **Clone/Copy:** opens a pre-filled form named "[Copy of + Copied Template Name]".

**Create / Update form**

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text | Yes | Unique identifier |
| Type | Dropdown | Yes | Text, Number, Number Slider, Range, Switch, Dropdown, Formula |
| Description | Text Area | No | |
| Compliance Rules | Text | No | Free text. It is shown prominently for this attribute on the Quality Order. |

Extra fields per type:

| Type | Extra fields |
|---|---|
| Text, Number | None |
| Number Slider | Min Value, Max Value, Unit |
| Range | Min Value, Max Value, Unit, plus the checkbox `Allow values outside range with warning` |
| Switch | Toggle |
| Dropdown | Dropdown Options (text) and an `Add` button. A default value is marked *(future)*. |
| Formula | A Formula field and an Attribute Selection list of enabled attributes (click to insert) |

- **Unit options:** None, % (Percentage), lb (Pounds), ton, kg, Count, mm, inch, °F, °C, Gms, Pcs.
- **Range checkbox (spec text):** "Unchecked: Values outside range with an alert will be allowed. Checked: Values outside range will be blocked with a validation message." See Open questions, item 1.
- **Formula inputs:** numbers, decimals, arithmetic operators (+ - * /), and the functions SUM, AVG, MIN, MAX, IF, ROUND, ABS, COUNT, plus selected attributes.
  - A formula is validated for syntax, attribute references and overall validity.
  - It is system-calculated on Orders and is not entered by the user.
- **Buttons:** `Save` (validates required fields) and `Close / Cancel`.
- **Rules:**
  - Min cannot be greater than Max.
  - Updates apply wherever the attribute is used.
  - Formula attributes are evaluated during execution.
- **Future:** custom alerts on Range and Number Slider that reference other attributes through functions.

## 6. Template Attributes

These are contextual or metadata fields, such as grower, field, location, date and inspectors.

- The main screen is the same as for Quality Attributes, without the Acceptable Range and Compliance columns.
- Create button: `New Attribute`. Actions: Edit, Disable, Clone/Copy.

**Create / Update form**

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text | Yes | Unique within the system |
| Type | Dropdown | Yes | Text, Number, Switch, Dropdown, Date. The section also lists "System Fetched attribute type". |
| Description | Text Area | No | |

Type behaviour:

- **Date:** "By default, quality order would show current date".
- **System Fetched:** the value is derived from another selected attribute. The user configures the source attribute and picks a field from the reference data. Spec example: "selecting a Stockpile Ticket can automatically fetch the associated Grower".
- **Dropdown:** the user picks either a `Reference Table` or a Custom Dropdown.
  - **Reference Table options:** Growers, Fields, Variety, Location Types, Handlers, Stockpiles, Bins, Equipment, Inspectors / Resources.
  - **Custom Dropdown:** Dropdown Options and an `Add` button. A default value is marked *(future)*.
  - When a reference table is selected, manual entry is disabled.

Buttons: `Save` and `Close / Cancel`. Mandatory fields are enforced before saving.

## 7. Templates

A template combines Template Attributes (context) with Quality Attributes (measurements).

**Main screen columns:** Template Name, Status (for example Active), Template Type (for example "Quality Check", "WIP/By Products Quality"), Description, Quality Attributes (tags), Template Attributes (tags with "+ more"), Created Date, View, Edit, Copy / Clone, Delete.

- **Search and filter fields:** Name, Description (search only), Status (filter only), Type, Quality Attributes, Template Attribute.
- **Create button:** `New Template`.
- **Actions:** View, Edit, Disable (toggle), Clone/Copy. The column list also shows Delete.

**Create / Update form**

| Field | Type | Required | Notes |
|---|---|---|---|
| Template Name | Text | Yes | |
| Description | Text Area | No | |
| Type | Dropdown | Yes | Incoming, Equipment Calibration, Process Other |

Per-attribute settings, applied after an attribute is selected:

| Setting | Default | Note |
|---|---|---|
| Visible / Hidden | Visible | |
| Editable / Read Only | Editable | Formula Quality Attributes are forced to Read Only |
| Mandatory / Not Mandatory | Mandatory | Mandatory is set at template level, not on the attribute |

- Template Attributes are captured "before quality inspection begins".
- **Buttons:**
  - `Save`: saves in **draft**. A draft template cannot be used on quality orders.
  - `Save & Publish`: saves as **active**.
  - `Cancel`
- **Validation:**
  - A template needs at least one quality attribute.
  - Only active attributes can be selected.
- **View screen:** the same fields, read-only, with a different UI. The header adds Created By, Created Date and Updated Date.

**Template statuses seen in the spec:** Draft, Active. Disable is a toggle.

## 8. Quality Orders (v1.1)

A Quality Order is the inspection transaction created from a template. The spec also calls it a "Quality Work Order" or "Work Order".

### Main screen

- **Favorite Templates section** at the top:
  - Contains cards, `Add Favorite`, a `View All Templates` link and a horizontal slider.
  - Each card shows the template name, template type, attribute count and a ⭐ icon. Unstarring a template removes it from the section.
- **Columns:** Quality Order Number, Type (for example "Almond Receiving", "Process Quality", "Inspection"), Template Name, Created Date, Created by, Status (To Do, Completed), all attributes (grid only), Actions.
- **Search:** Work Order Number, Type, Template Name.
- **Filters:** Quality Order Number, Type, Template, From Date, To Date, Created By, Status ("All, Draft, Completed, etc."), and All Attributes. The attribute filter control depends on the attribute type:
  - Dropdown attribute: its values.
  - Numeric, range or slider attribute: a range.
  - Date attribute: a date range.
  - Any other type: a text box.
- **`Export to Excel`:** exports the filtered orders with their attributes, one template at a time.
- **Actions:**
  - **View:** completed orders, read-only.
  - **Edit:** draft or in-progress orders.
  - **Void**

### All Templates screen

- Reached from the left nav: Quality Orders > `View All Templates`.
- Shows active templates only, as cards (name, type, attribute count, ⭐).
- Search by Template Name or Template Type.
- Clicking a card starts a new order. Favorites are per user.

### Details screen

The screen has three sections:

1. **Template assignment:** one dropdown that shows the template.
2. **Template Attributes:** shows the template name and a field count (for example "8 fields"). The section is collapsible.
3. **Quality Attributes:** shows an attribute count (for example "2 attributes"). The section is collapsible.

Validation:

- Real-time min/max checks, which either block or warn depending on the attribute setting.
- Mandatory fields are enforced.
- Formula fields are disabled and auto-calculated. They cannot be overridden.

| Action | Resulting status | Notes |
|---|---|---|
| `Save` | To Do | Saves without completing. The workflow calls this "Click on Save". |
| `Submit` | Completed | Runs validations first. The workflows and journeys call this "Click on Complete". |
| `Cancel` | Not stated | "Cancels the quality order (if not completed)" |
| `Void` (list action) | Not stated | "Voids the quality orders" |

**Data rules:**

- All orders stay editable, including completed ones.
- Template or attribute changes apply only to **new** orders.
- Data is stored against the specific order instance.
- Audit/history is described as "future-ready".

### Workflows

- **Create:** Quality Orders → pick a template (Favorites or All Templates) → Save → success message.
- **Submit new:** Quality Orders → pick a template → fill Template Attributes → fill Quality Attributes → Complete → success message.
- **Complete existing:** Quality Orders → select an order → fill the attributes → Complete → the system saves and completes the order.

## 9. Integrations (quoted)

**Ecosystem (Data Source Guidelines):** "reference and operational master data created within any application must be consistently available across all relevant applications (AgriERP, AgriWMS, Agri Quality, and Agri Production App). Users should not be required to recreate the same data in multiple systems." The mechanism is left open: "shared data source, synchronized databases, or other integration mechanisms".

**Master data list:** Growers, Handlers, Fields, Items, Variety, Locations, Stockpiles, Trailers, Bins, Equipment, Quality Attributes, Template Attributes, Templates. Details are in the "YHS - Master Data Structure" spreadsheet.

**Configuration-level integration (v1.0):**

- AgriQuality "integrates with shared master data across the AgriERP ecosystem".
- It consumes: Growers, Fields, Variety, Locations, Handlers, Stockpiles, Bins, Equipment, Inspectors / Resources, Production Run#.
- Template Attributes use these as reference tables. They also use "system-fetched attributes such as fetching of grower on the basis of stockpile ticket & production run#".
- Out of scope: "Configuration (i.e., Template, Attributes) data push to external systems".

**Quality Orders integration (v1.1):**

| # | Integration | Data used | Usage |
|---|---|---|---|
| 1 | "Locations & Receiving module (Locations & Receiving > Quality Orders)" | Stockpile / Location, Stockpile ticket | "Linking quality orders to stockpiles or locations", "Supporting quality checks during receiving and storage" |
| 2 | "Inventory Module (Quality Orders > Inventory)" | Stockpile Ticket, Production Run #, Attributes | "Mapping inspection results to corresponding inventory records", traceability across receiving, storage and processing |
| 3 | "Production Module (Production > Quality Orders)" | "Production Run#, GFV based on run#" | Associating orders with production runs. Process-level inspections. |
| 4 | "Master Data (Shared Across AgriERP Suite)" | Growers, Fields, Variety, Locations, Inspectors / Users | Populating template attributes during execution |

- **Data interaction:**
  - "Quality Orders consume data from external systems for reference and linkage".
  - "Quality Orders share attribute-level data to external systems".
  - Reference data is selected during execution.
  - "Data visibility is limited to active and relevant records".
- **Not mentioned anywhere:** Farm App, Harvest Central, harvest tickets, Dynamics 365 / D365 / FinOps, Business Central. The word "AgriWMS" appears once, in the ecosystem list. The receiving link is the "Locations & Receiving module" and the "Stockpile ticket".
- **Future:** "Integration with Warehouse and Production systems for automatic creation of quality orders", auto-triggered orders, barcode/QR scanning, offline capture, approval workflows, image attachments, threshold alerts, bulk creation, and USDA / device integration.

## 10. Use cases

| ID | Use case |
|---|---|
| AG-01 / AG-02 | Create / Update Quality Attribute |
| AG-03 | Define Formula for Attribute |
| AG-04 | Configure Compliance Rules |
| AG-05 / AG-06 | Create / Update Template Attribute |
| AG-07 / AG-08 | Create / Modify Quality Template ("attributes, sequence, or configuration") |
| AG-09 | Activate / Deactivate Template |
| AG-10..AG-12 | Standardize, reuse attributes, manage centrally (web) |
| AG-13 | Validate Template Before Saving |
| AG-14 | Create Quality Order |
| AG-15 / AG-16 | Fill Template / Quality Attributes |
| AG-17 | Submit Quality Order ("clicking on Complete") |
| AG-18 | Validate Quality Data (mandatory, ranges, data types) |
| AG-19 | Calculate Formula Attributes |
| AG-20 / AG-21 | Edit / Complete Existing Quality Order |
| AG-22 | Allow Editing of Completed Orders |
| AG-23 | Handle Validation Errors |

Error, validation and notification texts are not in the spec. They are in an external Google Sheet: "AgriQuality | Errors, Validations, Notifications". The other reference sheets are Features List, Master Data Structure, "YHS - Enums, Mappings, Other Config Data", "YHS QC - Creation/Details Form Fields" and Statuses.

## 11. Glossary

| Term | Meaning in the spec |
|---|---|
| Quality Attribute | A measurable parameter (moisture, FM, defects, size) with a type, unit, range and optional formula |
| Template Attribute | A contextual field (grower, field, location, date, inspector, stockpile ticket, run) |
| Template | A reusable test definition made of Template and Quality Attributes. Draft or Active. |
| Quality Order / Quality Work Order | An inspection record created from a template. To Do or Completed. |
| FM | Foreign material |
| Stockpile ticket | A receiving identifier. It can system-fetch the Grower. |
| Production Run# | A production batch identifier. It is the source of GFV. |
| GFV | Used in "GFV based on run#". Not expanded in the spec. |
| Handler | A master data entity. USDA Sampling is "Built in Handler Quality App". |
| System Fetched | A Template Attribute type whose value is derived from another attribute |
| Compliance Rules | Free text shown prominently on the order for an attribute |
| Favorite Templates | Per-user shortcuts for creating orders |

## 12. Open questions / ambiguities

1. **Range checkbox is inverted.** The label is `Allow values outside range with warning`, but the spec says **Checked** = blocked and **Unchecked** = allowed with an alert.
2. **Status names do not match.** The list uses To Do / Completed. The filter uses "All, Draft, Completed". The details actions are `Save` (To Do) and `Submit` (Completed). The workflows say "Complete". The statuses after Void and Cancel are not defined.
3. **Template Type values differ in three places.**
   - List example: "Quality Check", "WIP/By Products Quality".
   - Form dropdown: "Incoming, Equipment Calibration, Process Other".
   - Order Type example: "Almond Receiving, Process Quality, Inspection".
4. **Template removal is unclear.** The template list shows a Delete column, but the actions list has Disable and no Delete. It is unclear whether Disable is the same as Draft/Active status.
5. **Completed orders: edit or read-only?** "All the quality orders are editable, even the completed ones" conflicts with "View: Open completed quality order in read-only mode". AG-22 says both "allows users to modify completed" and "enforces read-only behavior".
6. **Cancel vs Void.** It is not stated how Cancel (details screen) differs from Void (list action).
7. **System Fetched is half-listed.** It is described as a Template Attribute type but is missing from the Type dropdown list (Text, Number, Switch, Dropdown, Date).
8. **Min/max rule on Template Attributes.** The rule is repeated there, but Template Attributes have no Min/Max fields.
9. **Name descriptions and clone naming.**
   - The Template Attribute Name description says "quality attribute".
   - The clone name is "[Copy of + Copied Template Name]" even for attributes.
10. **Fumigation.** It is in scope and in the overview, but struck through in the module table. No screens are given.
11. **Mobile/Tablet scope.** v1.0 put the Supervisor on mobile. v1.1 puts the Supervisor on web and moves mobile to the future. The mobile prototype is struck through.
12. **Data push.** "Quality Orders share attribute-level data to external systems" does not say which system, how or when. Configuration push is out of scope.
13. **No AgriERP, Farm App, Harvest Central or D365 detail.** The link to AgriERP is only "shared master data across the AgriERP ecosystem". No harvest ticket or grower-portal flow is described. It is unclear whether "Stockpile ticket" maps to a harvest ticket.
14. **Multi-sample and lot-level results.** These are claimed in the overview, but no sample-count or per-sample UI is specified.
15. **Version history.** The header says V 1.1, but the revision table lists only 1.0.
16. **Details screen numbering.** The sections are numbered 1, 3, 5, 6, 7, 8. Sections 2 and 4 may be missing.
17. **Prototype label.** The appendix prototype is labelled "AgriProduction - Farm Management", which may be the wrong link.
18. **Search label.** Search lists "Work Order Number", while the column is "Quality Order Number".
19. **GFV is not defined.**

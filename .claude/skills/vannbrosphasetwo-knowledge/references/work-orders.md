# Work Orders — Overview (hub)

Source manuals: *Work Order Submission (Web)*, *Work Order Approval (Web)*, *Inspection Work Order (Web)*, *Tank Mixing Work Order (Web)* — all Vann Brothers / VBS, V1.0. Live-verified against QA `agrierp-vann-qa.folio3.site` (2026-06-10).

This file holds the **shared** Work Order facts (concept, lifecycle, list, common create-form fields, approval, toasts, gotchas). The **per-type creation flows** live in their own files:

- [`work-orders-planned.md`](./work-orders-planned.md) — Planned (standard) WO: plot + materials + resources + assets. Most detailed; live-verified end to end.
- [`work-orders-tank-mix.md`](./work-orders-tank-mix.md) — Tank Mix WO: materials with Unit/Mix Method/Per + Liquid Application params.
- [`work-orders-inspection.md`](./work-orders-inspection.md) — Inspection WO: plot + resources only, requires an Inspection Template.
- [`work-orders-harvest.md`](./work-orders-harvest.md) — Harvest WO: own sub-tab, `Task*` scoped to five harvest operations, plot + resources + assets (no materials). Also covers the **Harvest Central** ticket screen. No vendor manual — live-observed only.

## Concept

A **Work Order (WO)** is the unit of planned field work. It binds: a task/operation, a farm + plots, a date range, a priority, a supervisor (and optional responsible person), and — depending on type — materials, resources, and assets. WOs are **authored and submitted on web**, **executed on mobile**, and **approved on web**. Approval posts material & machine consumption to the ERP.

Four creation flows differ only by the **Operation/Task type** chosen:

| Flow | Pick an operation that is… | Distinctive parts | Accessed via | Detail |
|---|---|---|---|---|
| **Planned (standard)** | NOT a tank-mix operation | Materials (Rate per acre), Resources, Assets | Work Orders tab → Create New Work Orders | [planned](./work-orders-planned.md) |
| **Tank Mix** | a tank-mix operation | Materials with Unit/Mix Method/Per + Liquid Application params; optional Material Template | Work Orders tab → Create New Work Orders | [tank-mix](./work-orders-tank-mix.md) |
| **Inspection** | an inspection operation | Requires Inspection Template; Plots + Resources only (no materials/assets) | Work Orders tab → **Inspection Work Orders** sub-tab → Create | [inspection](./work-orders-inspection.md) |
| **Harvest** | one of the five harvest operations | `Task*` scoped to Harvest/Hulling & Drying/Shaking/Conditioning/Pickup; Plots + Resources + Assets (no materials, no tank mixing); `Target Quantity` / `Harvest Quantity` on the detail | Work Orders tab → **Harvest Work Orders** sub-tab → Create | [harvest](./work-orders-harvest.md) |

## Lifecycle / statuses

Status chips on the list: `All | Queue | Draft | To Do | In Progress | Review | Done | Filter`.

`Draft → Queue → To Do → In Progress → Review → Done`

- **Draft**: saved via `Save As`.
- **Submit** → **"Create Work Order" confirm dialog** (`Are You Sure You Want To Save The Work Order`, buttons `Cancel` / `Save`) → on `Save`, WO enters Queue/To Do, visible on mobile. **Submit alone does not persist — the dialog `Save` does** (verified live 2026-06-10).
- Field execution on mobile → In Progress → Review.
- Web **`Work Order Completed`** → **`Approve`** dialog → **Done** (posts consumption to ERP).

## Work Orders list

Tabs (live 2026-08-27, in order): `Work Orders` | `Inspection Work Orders` | **`Harvest Work Orders`** | `Point Of Interests` / `Observations` (same tab, two names — the QA host has served both, `Observations` on 2026-09-17; match either). Each is a plain `button.btn.btn-outline-primary.btn-sm` whose text is its accessible name — `getByRole('button', { name, exact: true })` matches one node per tab and is the locator to use. The `Harvest Work Orders` tab is **current**, not legacy — see [`work-orders-harvest.md`](./work-orders-harvest.md).
Columns (live header text): `WO Sequence No.`/`Seq No`, `WO Name`/`Wo Name`, `Priority`, `WO Start Date`/`Wo Start Date`, `WO End Date`/`Wo End Date`, `Farm`, `Plots`/`Blocks`, `Progress` (% Completed bar), `Task`/`Operation`, `Materials`, `Status`, `Submitted By`, `Responsible`, `Actions`.
Row actions: `Edit Work Order`, `Clone Work Order`, `View Work Order Detail`, `Delete Work Order` (Delete only on Draft/To Do).
Create button label: **`Create New Work Orders`** (top-right). Form header buttons: **`Save As`** (dropdown), **`Submit`**, **`X`**. Form title: **`Create New Work Order`** with a green **`Planned`** chip. **`Submit` is disabled** until required `*` fields are filled (verified live 2026-06-10).

Right-hand **Summary** panel (collapsible): `General`, `Plots`, `Materials`, `Resources`, `Assets` (+ `Tank Mixing` for tank-mix WOs).

## Create form fields (common)

Required marked `*`. Common across flows:

- **Work Order Name\*** — placeholder `Enter Work Order Name`.
- **WO Start Date\*** / **WO End Date\*** — prefilled with a valid current window.
- **Priority\*** — `Low`, `Medium` (default), `High`, `Urgent` (custom dropdown with a search box).
- **Farm\*** — custom search dropdown (e.g. `Vann Farm (VBSF)`).
- **Operation Type\*** — `Planned` or `Inspection`. **Label drifts between renders: live header shows either `Operation Type*` or `Task Type*` for this field, and `Operation*` or `Task*` for the next.** The read-only Approval detail panel uses `Task Type`/`Task`.
- **Operation\*** — the specific operation (e.g. `Almond Preparartion (1290)` [sic — live tenant spelling], `Fertilization (1240)`, `Irrigation (1410)`, `Soil Sampling & Testing (100006)`, `Pest Preventive Mix Spray (2014)`).
- **Supervisor\*** — resource who manages the WO. **Selecting Supervisor before the plot/material/resource/asset section saves gets wiped by a form re-render — select it LAST, just before Submit** (verified live 2026-06-10).
- **Responsible** — optional; single responsible person.
- **Inspection Templates\*** — required on inspection tasks; selectable only if the template is **Enabled** (see `templates.md`).
- **Material Template** — optional; tank-mix only (info tooltip).
- **Notes** — optional.
- **Select Plot\*** — see per-type flow files; added via the **`+` (`Add Plot`)** button (re-verified 2026-08-26; formerly labelled `Add Block`), not the adjacent date picker.
- **Tank Mixing** — the **Enable Tank Mixing** toggle (`input[type=checkbox]` in a `.custom-switch`) is present on the **Planned** create form too, not only tank-mix WOs. OFF (default): Materials grid = `Rate` + `Usage Unit`. ON: surfaces `Mix Method` / `Per` / `Unit` columns and hides plain `Usage Unit` (verified live 2026-06-10).

### Custom dropdowns (Priority / Farm / Operation / Supervisor)

Not `<select>`s. Each is a `div.dropdown` whose toggle is a `button.dropdown-toggle` with **no accessible name** (the chosen value renders in a `span.tag`). When open, the panel gets the `show` class and contains a search `input` plus clickable option rows. Anchor on the visible field label, then act on the next button; pick the option from inside `.dropdown.show`.

### Section `+` add icons (`i.icon-add-icon`)

- `button[title="Add Plot"]` (re-verified 2026-08-26; formerly `Add Block`) — opens the **Select Plots** (plot) modal. Enabled once **Farm + Operation** are set.
- `button[title="Add Material"]`, `button[title="Add Resources"]`, `button[title="Add Asset"]` — **inert on a fresh form**; they open no modal until **Farm + Operation + Plot** are selected first.
- `button[title="Add Plot using map"]` (`i.icon-map`) — sits beside `Add Plot`; map-based plot picker.

**Pitfall:** the form also renders an inline "Select Plot" table with its own **`Task Date Range`** / **`Select Range`** filter beside the modal trigger — this is a date-range filter (an Angular Material date-range picker), **not** the plot picker. As of the 2026-08-26 verification its min/max are stuck at `1900-01-01` (a broken/dead calendar, month-nav disabled, no selectable day) and it is **not required** to add a plot or submit — forcing a value into its underlying `<input>` does not flow into the app's form state and instead makes Submit fail server-side with a date-range validation error. Add plots via the **`+` (`Add Plot`)** button → modal instead, and leave `Select Range` untouched.

Each selection modal: a level-2 heading (the form's own section title reuses the same text as a level-3 heading), a search box, `Apply`/`Reset` (or `Search`/`Reset`), a header-row **select-all** checkbox plus per-row checkboxes, and a **`Save`** button. Empty states: `No Record Found` (blocks), `No materials found`, `No resource found`, `No assets found`.

## Approval — flow

1. After the WO is completed in the field (mobile), in the web Work Orders list select the WO and click the **eye icon** (`View Work Order Detail`).
2. Review detail (right panel: `General`, `Plots`, `Materials`, `Resources`). Detail read-only fields include: `Start Date`, `End Date`, `Progress`, `Supervisor`, `Farm`, `Work Order Type`, `Task Type`, `Task`, `Crop Stage`, `Assets`, `Material Template`, `Inspection Template`, `Submitted By`, `Responsible`, `Created By`, `Notes`, `Approve Comments`. Plots grid: `Plot`, `Customer Name`, `Progress`, `Crop Variety`, `Total Area - ac`, `Operational Area - ac`, `Spent Hours`, `Attachments` (`View Attachment(s)`).
3. Click **`Work Order Completed`** (top-right, "Mark as Completed").
4. In **`Approve this Work Order`** dialog enter comments in **`Description`** (placeholder `Enter Text`) → **`Approve`** (or `Cancel`).

Effects (verbatim): "The work order status will change to 'Done.'" and "Any material and machine consumption recorded will be posted to ERP."

**Label drift on the Harvest flow (live 2026-08-27):** harvest WO details render the button as **`Workorder Completed`** (one word), the row action as **`Delete Workorder`**, and the comments field as **`Approver Comments`**. Assert the per-flow string; don't carry the Planned spellings across. See [`work-orders-harvest.md`](./work-orders-harvest.md).

## Messages / toasts

- **Live (verified 2026-06-10), title-case:** `Work Order WO-640 | Almond Prep 06/08/2026-1 Saved Successfully` (toast title `Success`, body as quoted).
- **V1.0 manual examples (lowercase, may be stale):** `Success — Work Order WO-000087 | Planned Inspection 02/01/2025-2 saved successfully`; `Success — Work Order WO-47 | Pest Preventive Mix Spray-07/12/2025-1 saved successfully`.
- Note: "Work order that is created on web is visible on mobile screen."
- Cross-reference: building tank-mix materials uses the *Create Material Template* manual (see `templates.md`).

## Gotchas

- Operation/task type gates the flow: standard requires a **non-tank-mix** operation; tank-mix flow needs a tank-mix operation. **Confirmed live (2026-06-10):** the **Enable Tank Mixing** toggle gates the tank-mix Material columns on the Planned form. Whether selecting a tank-mix *operation* also auto-changes sections is **not yet verified** — manual claim only.
- **Submit ≠ save.** Submit opens the `Create Work Order` confirm dialog; the dialog's `Save` is what persists.
- **Supervisor must be selected last** — section saves re-render the form and clear an early Supervisor pick, leaving Submit disabled.
- **Plot availability is data-coupled.** An operation with no plot schedule in the date window shows zero selectable blocks (e.g. `Almond Preparartion` had none in Crop Year 2026; `Fertilization (1240)` had 99). Pick an operation with live plots when authoring/testing.
- **Rate is per acre** in standard WOs; tank-mix adds Mix Method/Per (Per Area vs Per Volume).
- Inspection WO **requires** an enabled Inspection Template; disabled templates don't appear in the dropdown.
- Only **one Responsible Person** per WO at a time (Manager toggles it).
- Harvest WOs are **scoped to their own sub-tab** — a harvest WO is not listed on the main `Work Orders` tab, and the harvest form's `Task*` excludes every non-harvest operation.

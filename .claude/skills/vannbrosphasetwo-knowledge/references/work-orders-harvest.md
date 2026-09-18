# Work Orders — Harvest flow

Creating a **Harvest** Work Order: a work order whose operation is one of the five harvest tasks, authored from its own **Harvest Work Orders** sub-tab and using **plot + resources + assets** — no materials, no tank mixing. Shared facts (lifecycle, list, common form fields, approval, toasts) live in [`work-orders.md`](./work-orders.md).

Separate from, but adjacent to, **Harvest Central** (`/harvest-central`) — a top-nav screen for harvest **tickets**, documented at the end of this file.

> **Provenance:** captured live from `agrierp-vann-qa.folio3.site` on **2026-08-27** (Site `Colusa`, Season `Crop Year 2026`). There is **no vendor manual** for this flow in `resources/user-manuals/` — unlike the planned / tank-mix / inspection flows, every fact here is live-observed, not manual-derived.

## Flow

1. Log in.
2. **Work Orders** tab → **Harvest Work Orders** sub-tab → **Create New Work Orders**.
3. Set **Work Order Name\***, dates, **Priority\***, **Farm\***, and **Task\*** (one of the five harvest operations below). **`Task Type*` is pre-set to `Planned` and disabled.**
4. **Select Plot** → `+ (Add Plot)` → `Select Plots` modal → tick plot(s) → `Save`.
5. **Select Resources** → `By Resource` / `By Groups` radio → `+ (Add Resources)` → pick → `Save`.
6. **Select Assets** → `+ (Add Asset)` → pick machines/implements → `Save`.
7. Select **Supervisor\*** last → **Submit** → confirm dialog → `Save`.

## Harvest operations (`Task*`)

The Harvest tab's create form scopes `Task*` to exactly these five — this is what makes the WO a harvest WO. No other operation is selectable.

| Task | Code |
|---|---|
| `Harvest` | 1610 |
| `Hulling & Drying` | 1620 |
| `Shaking` | 1630 |
| `Conditioning` | 1640 |
| `Pickup` | 1650 |

## Differences from Planned

- **No `Select Materials` section and no `Enable Tank Mixing` toggle.** Sections are **`Select Plot` → `Select Resources` → `Select Assets`** only; the Summary panel lists `General` / `Plots` / `Resources` (no `Materials`, no `Tank Mixing`).
- **`Task Type*` is disabled** at `Planned` (as on the inspection form) — but unlike inspection, **`Supervisor*` and `Responsible` stay enabled**, and Supervisor is required.
- **Two harvest-only detail columns:** **`Target Quantity`** on the Plots grid and **`Harvest Quantity`** (plus `Asset Usage UOM`) on the Assets grid.
- **Harvest WOs live only on the Harvest Work Orders tab** — they are not listed on the main `Work Orders` tab.

## Label drift vs. the Planned flow

The harvest screens use different wording for the same controls. Use these exact strings; do not carry the Planned spellings across.

| Planned flow | Harvest flow |
|---|---|
| `Work Order Completed` (detail header button) | **`Workorder Completed`** (one word) |
| `Delete Work Order` (row action) | **`Delete Workorder`** (one word) |
| `Approve Comments` (detail field) | **`Approver Comments`** |

## Verified live (2026-08-27, VBS tenant)

- **Sub-tab order:** `Work Orders` | `Inspection Work Orders` | **`Harvest Work Orders`** | `Point Of Interests`. Each is a plain `button.btn.btn-outline-primary.btn-sm` whose text is its accessible name (no `aria-label`). **`getByRole('button', { name: 'Harvest Work Orders', exact: true })` matches exactly 1** — use it, exactly as the inspection spec does for its sub-tab. Do **not** substitute `getByText`: it is equivalent for the harvest/inspection/POI tabs but resolves **4 nodes** for `Work Orders`, so the role locator is the consistent choice. The tabs mount late — wait for the list before clicking.
- **List** is the standard WO list: same status chips (`All | Queue | Draft | To Do | In Progress | Review | Done | Filter`) and columns (`WO Sequence No.`, `WO Name`, `Priority`, `WO Start Date`, `WO End Date`, `Farm`, `Plots`, `Progress`, `Operation`, `Materials`, `Status`, `Submitted By`, `Responsible`, `Actions`). 28 harvest records vs. 823 on the main tab at capture time.
- **Row actions:** `Clone Work Order`, `View Work Order Detail`, `Edit Work Order`, `Delete Workorder`.
- **Create form header:** `Create New Work Order` with the green **`Planned`** chip (same as Planned/Inspection). `Save As` and `Submit` are **disabled** on a fresh form.
- **Add controls:** `button[title="Add Plot"]`, `button[title="Add Plot using map"]`, `button[title="Add Resources"]`, `button[title="Add Asset"]`.
- **`Select Plots` modal** columns: `Select`, `Crop`, `Plot`, `Customer Name`, `Plot Area`, `Operational Area`, `Task Start Date`, `Task End Date`; counters `N Plots Selected` and `Total selected plot area`; footer `99 Total Records`.
- **Detail view** (`WO-1070 | HWO2`, Task `Pickup`, status `Review`): header `Work Order: WO-XXXX | <name>` + status chip + `Workorder Completed` button. Read-only fields `Start Date`, `End Date`, `Progress`, `Supervisor` (+ `View Spent Hours`), `Farm`, `Work Order Type` (= `Planned`), `Task Type` (= `Planned`), `Task`, `Crop Stage`, `Assets`, `Created By`, `Inspection Template` (`N/A`), `Submitted By`, `Responsible`, `Notes`, `Approver Comments`. Sections: `Plots`, `Additional Information` (`Total Plots Area` / `Total Activity Area without Band` / `Total Operational Area` / `Total Effective Area`), `Resources`, `Assets`, `Plot Details`, `Weather`, `Plots Map`. **No Materials grid.**
- **Weather** grid columns: `Plot`, `Datetime`, `Temprature` [sic — live spelling], `Wind Speed`, `Wind Direction`, `Humidity`, `Conditions`, `Cloud Cover` — two rows per plot, matching that plot's start/end times in `Plot Details`.
- **Example tenant data:** Farm `Vann Farm (VBSF)`; plots `330 (PRJ_000077)`, `331 (PRJ_000078)`, `332 (PRJ_000079)`; resource group `Machine Operator`; asset `2013 JD Diesel Gator ATV 6x4 (OR055)`.

## Harvest Central (`/harvest-central`)

A **top-nav item** (`Maps | Planning | Work Orders | Harvest Central | Template Management | Communication Center | Attendance`), not a WO sub-tab. Lists harvest **tickets** aggregated per field.

- **Columns (live 2026-09-17):** `Field`, `Variety`, `No Of Planned Tickets`, `No Of Actual Tickets`, `Planned On`, `Planned By`, `Actions`. Row actions: `Add More` (opens **`Add More Loads`**, the same panel with Field/Variety locked to the row) and `View Details` (chevron) → `/harvest-central/:id`. Header buttons: `Refresh Data` (icon) and **`Plan Harvest Tickets`**. A row appears only once a field/variety pair has tickets.
- **`Plan Harvest Tickets` panel (live 2026-09-17; replaced the older `Create Harvest Ticket` form with driver/plate fields):**
  - Read-only context: **`Grower`** (`Vann Brothers`), **`Season`** (`Crop Year 2026`), **`Hulling Location`** (`YHS`).
  - Required: **`Field *`**, **`Variety *`** (custom search dropdowns; note the space before `*`), **`No Of Harvest Tickets *`**: preset buttons `10` / `20` / `30` plus a number box (min 1, max 100; default 10).
  - Footer: `Cancel` / **`Create N Planned Tickets`** (label tracks the box; disabled at 0 or below, and until Field + Variety are set).
  - **Saving shows no toast.** The panel closes and the pair's `No Of Planned Tickets` rises by N (a new pair gets a row); `Planned On` keeps the pair's first date. Backend: `POST /api/harvestcentral/tickets/plan` `{fieldID, cropVarietyID, seasonID, quantity}`.
  - Typing more than 100 raises the error toast `Harvest Ticket Plan Max 100` and clamps the box to 100. A decimal (`2.5`) is accepted and leaves the button enabled.
  - `Variety` lists every variety whichever Field is picked (HC-018 expects it filtered by field).
  - Seeding: `pnpm seed:tickets` (playwright/scripts/seed.mts).
- **Varieties seen:** `ALDRICH`, `MONTEREY`, `BENNETT-HICKMAN`, `AVALON`, `BOOTH`, `BUTTE`, `CARMEL/MONTEREY`, `NONPAREIL`, `PADRE`, `LIVINGSTON`, `FIELDRUN_ALMOND`, `FIELDRUN_PISTACHIO`.

## Gotchas

- **Carried over from the Planned flow** (see `work-orders.md`): **Submit ≠ save** — the confirm dialog's `Save` persists; **Supervisor must be selected last** or a section-save re-render clears it; the **`Task Date Range` / `Select Range`** picker beside the plot `+` is a broken, non-required date filter (min/max stuck at `1900-01-01`) — never touch it; the full-screen truck loader (`#f3-overlay-loader`) intercepts clicks during fetches.
- **`Add Resources` / `Add Asset` are inert until a plot is saved**; `Add Plot` is inert until Farm + Task are set.
- **Don't reuse Planned's button strings** — see the label-drift table above.
- **Harvesting is a feature toggle.** Role permissions are gated by "(if harvesting is enabled)", and `Manage Harvest Ticket` / `Manage Harvest ID` are separate Work Order permission checkboxes (see `users-resources.md`). On a tenant without harvesting the tab and nav item may be absent.

## Not yet established

- Whether a harvest ticket created in **Harvest Central** binds to a specific **Harvest WO** — the linkage was not determined during the 2026-08-27 pass. Needs a product answer; do not assert either way.
- The exact Submit confirm-dialog wording on the harvest form (assumed to match Planned's `Create Work Order` / `Are You Sure You Want To Save The Work Order`, but **not observed** — no harvest WO was created during the read-only pass).
- Whether `Target Quantity` is authored anywhere on web or only populated from mobile execution.

## QA / automation

- Test plan: [`playwright/test-plans/authenticated/work-orders-harvest.md`](../../../../playwright/test-plans/authenticated/work-orders-harvest.md) (22 cases, manual).
- No spec yet. Target path when automated: `playwright/tests/authenticated/work-orders-harvest.spec.ts`.

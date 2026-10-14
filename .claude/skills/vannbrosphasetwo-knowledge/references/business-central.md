# Microsoft Dynamics 365 Business Central (Phase 1 ERP) — AgriERP training notes

> **Provenance — lowest authority, different system.** Distilled from one AI-summarised training note,
> `resources/video-transcripts/agrierp-business-central-training-note.md`. It documents the **Business
> Central (BC)** AgriERP, the Phase 1 predecessor — **not** the D365 F&O back office that VannBrosPhaseTwo
> (Phase 2) syncs with. The example grower is *Circle B Farms* (not Vann Brothers); the note also mentions an
> "FAO" rollout, so assume it describes another tenant/edition. Nothing here is observed live and there is no
> BC environment in this repo, so **verify every label against the BC app before putting it in a test or doc**.
> For Phase 2 facts use [`d365-setup-and-integration.md`](./d365-setup-and-integration.md) and the other references.

## When to use this file

- A task, ticket or stakeholder mentions **Business Central / BC**, Phase 1 behaviour, or migration from BC.
- You need the *why* behind a Phase 2 design choice (flat plots in F&O, Crop Year, plain Farm Operations).
- You are comparing BC concepts (Master Tasks, Task Templates, Planning Lines) with Phase 2 equivalents.

Not a source for Phase 2 UI labels, statuses, or test steps.

## Concept map: BC → Phase 2

| BC (this note) | Phase 2 equivalent | Where documented |
|---|---|---|
| Grower → Growing Site → Growing Area → Growing Plot | AgriERP keeps Grower → Site → Farm → Field/Plot; D365 F&O holds a flat Plots & Fields list. Farm App: Site selector + **Settings > Plot** | [`plots-fields.md`](./plots-fields.md), `d365-setup-and-integration.md` |
| Growing Cycle Code (e.g. 2025/2026/2027) | **Crop Year** (header Season selector, e.g. "Crop Year 2026"; D365 Crop Year setup) | `SKILL.md`, `d365-setup-and-integration.md` |
| Master Task (e.g. *Corn Yellow Spray*) with Planning Lines | **Farm Operation** — plain master record, **no** planning lines. Farm App: **Settings > Tasks / Operations** | `d365-setup-and-integration.md` |
| Planning Lines (person / machine / material) | Work order resources, assets and materials (Rate/acre) | [`work-orders-planned.md`](./work-orders-planned.md) |
| Task Template (bundle of Master Tasks, tillage → harvest) | No direct equivalent. Phase 2 *templates* are inspection / material / attribute templates | [`templates.md`](./templates.md) |
| Project / Crop Planning (`New Project`, Calculated Budget) | D365 F&O **Project** (Time & Material, **AgriERP** tab) with ad-hoc WBS; budget = rate/acre × operational area | `d365-setup-and-integration.md` |
| Person Resource / Machine & Implement Resource | D365 Human resource (needs Worker) / Machine or Implement resource, via resource groups | [`users-resources.md`](./users-resources.md) |
| Growing Item vs Material Item | Crop items (item group 4) vs materials (group 6) item-group mapping | `d365-setup-and-integration.md` |
| Sync of confirmed project to AgriERP Mobile App | Project in `In Process` syncs to Farm App (configurable sync stage) | `d365-setup-and-integration.md` |

## Organizational hierarchy

`Grower` (enterprise, e.g. Circle B Farms) → `Growing Site` (location) → `Growing Area` (farm / sector) →
`Growing Plots / Fields` (operational land unit).

- **Total Area** = physical area assigned to the plot. **Operational Area** = net area actively used.
  **Operational Area ≤ Total Area, never greater** — a ready-made negative/boundary test for any plot-area field
  (Phase 2 equivalent: Plot Area vs Operational Area in acres, see `plots-fields.md`; confirm the same rule live).
- Each plot stores **Latitude**, **Longitude** and boundary **Coordinates**; they sync to the AgriERP **Map**.
- Direction of travel: hierarchy management moves from BC into the **AgriERP mobile app** (stated as done for "FAO",
  in progress for BC). In Phase 2 the hierarchy already lives in the Farm App and syncs one way to F&O.
- Navigation: `Growing Plots` (search), or `Growers` → select Grower → `Growing Sites` → `Growing Areas` → `Growing Plots`.

## Master data

**Resources** (labor and machinery cost) — search `Resources`, filter `Type` = `Person` or `Machine`, open the Resource Card.

| Kind | Examples | Configured with |
|---|---|---|
| Person | tillage operators, fertilizer sprayers | Person Group, Base Unit of Measure, Use Unit of Measure |
| Machine | tractors, green carts | Resource Group, Machine ID, Base Unit, Use Unit |
| Implement | tillage implements, spray rigs, attachments | same as Machine |

**Items** — search `Products` / `Items`, filter `Item Type` (`Growing Item` or `Material`), open the Item Card.

- **Growing Items**: crops cultivated on plots (*Potato L1*, *Corn Yellow*).
- **Material / non-growing**: fertilizer, chemicals, spray material, fuel.
- Item types seen: `Inventory`, `Service` / `Non-Inventory`.
- **Varieties** (e.g. almond *Aldrich*, *Nonpareil*, *Padre*) are held at **field/plot level** (rows or sub-zones),
  not on the inventory item. Phase 2 also keeps varieties per plot/field
  (see `plots-fields.md`), not on the F&O item master.

## Master Tasks, Planning Lines, Task Templates

- **Master Task**: reusable operation (*Corn Yellow Spray*, Tillage, Irrigation). Path: `Master Tasks` → select → `Planning Lines`.
- **Planning Lines** define required **Person**, **Machine** and **Material** lines. **Growing items are excluded**
  (assigned at plot/project level).
- **Task Template**: bundles 10–20+ Master Tasks in chronological order, tillage → harvest, tied to one Growing Item.
  Path: `Task Templates` → `New` → select `Growing Item` → `Import Master Tasks`; save for reuse.

## Project & crop planning workflow (BC)

Path: `Projects` / `Crop Planning` → `New Project`.

1. Define crop and cycle: `Growing Item` (e.g. *Corn Yellow*) + `Growing Cycle Code` (e.g. *2025/2026/2027*).
2. Assign location: `Grower`, `Growing Site`, `Growing Area`, `Growing Plot`.
3. Set **Operational Area** for this plan — may be a subset of the plot's operational area (e.g. 20 of 100).
4. Enter **Budgeted Harvest Quantity** (estimated yield).
5. Action `Import Master Tasks / Task Template`.
6. **Project Budget is auto-calculated** by summing unit costs over all planning lines (labor + machine + material). Verify `Calculated Budget`.
7. On confirmation the project and its line tasks sync to the AgriERP Mobile App for execution.

## Testing guidance

- **No BC target in this repo.** Playwright specs, the `api/` client and the QA env all hit the Phase 2 Farm App;
  there is no BC URL, credential file or auth template. Before any BC testing, get from the user: environment URL,
  tenant/company, test credentials, and which edition (Circle B vs another).
- BC data reaches Phase 2 only through the D365 F&O integration; Phase 2 verification belongs on QA
  (`agrierp-vann-qa.folio3.site`) and F&O journals, using `vannbrosphasetwo-knowledge` + `vannbrosphasetwo-finops-api`.
- Candidate checks if BC testing is ever scoped (all **unverified**, derived from the note):
  - Operational Area cannot exceed Total Area on a Growing Plot.
  - Plot Latitude / Longitude / Coordinates appear on the AgriERP Map after save.
  - Person vs Machine resource cards require their respective fields (Person Group vs Resource Group + Machine ID).
  - Growing Items do not appear in Master Task planning lines; Material items do.
  - Task Template import adds Master Tasks in order; Project Budget equals the sum of planning-line costs.
  - A confirmed project and its tasks appear in the mobile app.
- Tag any spec or case derived from this file as unverified until confirmed against a real BC environment.

## Open questions for the product team

- Is BC still in use by any tenant after Phase 2, or only a migration source?
- Does "FAO" name a separate product/tenant? (The note says hierarchy management is "already completed for FAO".)
- Do BC Task Templates have any planned Phase 2 equivalent, given F&O Farm Operations have no planning lines?

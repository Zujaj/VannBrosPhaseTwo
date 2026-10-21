# Farming Setup — Settings › Farming Setup (PSD v1.0, R1–R4)

**Status (2026-10-21): not deployed on QA. Current target: R1.** Everything below is from the
product spec `resources/product-specifications-document/AgriERP FSCM - Farming Setup v1.0.docx.pdf`
(34 pages; mocks on pp. 13–19, workflows pp. 6–12) until a live check replaces it. The ADO
enhancement ticket is still pending from the product team; add its id here when it lands.

Farming Setup moves the farm hierarchy (Grower › Site › Farm), crop years, a permanent **Field
Master**, the crop-year-wise **Field Cultivation** records and their **D365 projects** into the
Farm web app. Until now this data lived in D365 and later in the AgriERP database, edited by
scripts only — there was no UI.

## Release plan

R1–R4 are **internal** build/test phases; the client gets Farming Setup as one feature.

| Release | Goal | In scope | Not in this release |
|---|---|---|---|
| **R1** | Hierarchy & Crop Year Setup | List/search existing Growers, Sites, Farms; add (IDs from the existing numbering scheme), edit names, delete when nothing is linked below. Create an **empty** Crop Year (Code + Name), edit Name, delete when it has no cultivation records. | Fields, cultivation records, copy, projects |
| R2 | Field Master & Crop-Year-Wise Cultivation | Field Master per Farm; Field Cultivation per Field + Crop Year (General / Varieties / Advanced tabs); Create Crop Year with Plot Copy; records already linked to a project locked | Creating/updating D365 projects |
| R3 | D365 Project Creation | Select cultivation records → **Create Project** (Name, Type, Group, Start Date per row); D365 sets **AgriProject = Yes**, returns Project No.; Creating… / Failed + retry | Updating an existing project |
| R4 | D365 Project Update | Save on a project-linked record auto-syncs D365-mapped fields: Updating… → Synced (last synced time) or Update failed + **Retry** (same project, never a new one) | Deleting/closing D365 projects |

## Navigation and access (all releases)

- **Settings** gear → left nav **Farming Setup** (collapsible group) → `Growers`, `Sites`, `Farms`,
  `Crop Years`, `Plot Cultivation` (R2). Breadcrumb `Home > Settings > Farming Setup > <Page>`.
- In the mock the Settings nav no longer has top-level `Plot` or `Sites`; `Seasons` is still there.
  How `Crop Years` relates to the existing **Seasons** page is an open question (below).
- Routes are not in the PSD — capture them on first live check and add them to
  `playwright/tests/constants/routes.ts`.
- **Permission:** feature-based. Granted to **Farm Admin** and **Farm Operations Manager**; both have
  identical full access (view/add/edit/delete/copy, create/update projects). **All other roles: no
  access** — pages and actions hidden, and **direct API calls refused by the server**. On QA the
  known roles include `Admin` and `Farm Operations Manager`; a role literally named *Farm Admin* is
  not confirmed yet.
- Mobile is out of scope (it reads plot, variety and project data only).
- Every add, update, delete, copy and project call writes an **audit** entry.

## R1 — pages (from the mocks)

All list pages share: page title + subtitle, blue `+ Add …` button top right, a **search box
under every column** (searches combine; Clear resets), Actions column with **edit (pencil)** and
**delete (trash)** icons, footer `Page Size` (10 in the mock) and `Page N of M, Showing X - Y of Z
records`. Sites and Farms also have a **Filter** button.

| Page | Subtitle | Columns | Add button |
|---|---|---|---|
| **Growers** | Companies that own the farming operation | `Grower ID` · `Grower Name` · `Sites` (count link, e.g. `2 sites`) · `Actions` | `+ Add Grower` |
| **Sites** | Locations under a grower | `Grower` · `Site ID` · `Site Name` · `Farms` (count link, `1 farm`) · `Actions` | `+ Add Site` |
| **Farms** | Farms under a site | `Grower` · `Site` · `Farm ID` · `Farm Name` · `Plots` (count link, `12 plots`) · `Actions` | `+ Add Farm` |
| **Crop Years** | Seasons used across all farms — a new crop year can copy last year's plots | `Crop Year Code` · `Crop Year` · `Farms` · `Plots` (link, `15 plots`) · `Total Area (ac)` · `Actions` | `+ Add Crop Year` |

- A **count link** opens the child page filtered to that parent.
- **Add Grower** side panel: title `Add Grower`, button `Save Grower`, fields `Grower ID` (read
  only, hint `System generated`, mock value `GR-002`) and `Grower Name*`. Add Site / Add Farm
  follow the same pattern plus the parent picker(s).
- Mock IDs (`GR-001`, `ST-001`, `FM-001`, `CY-2026`) are illustrative. **QA's real IDs look
  different** — see baseline below; the rule is "new IDs follow the *existing* numbering scheme".

## R1 — rules

- Existing Grower/Site/Farm records are listed with their **current IDs**. New records get an ID
  from the existing numbering scheme; the ID is **read only** and **never re-used** (also not after
  a delete). Two users adding at once get different IDs.
- **Name**: required, max **50**, **unique within the parent**. Only the name is editable — ID and
  parent are read only on Edit.
- **Delete** only when nothing is linked below. Otherwise the delete action is **disabled** with
  `Linked to n …` (e.g. `Linked to {n} plots`). Delete confirm text:
  `{ID} has nothing linked to it and will be removed. This can't be undone.`
- **Hierarchy pickers** fill top-down; a child picker is **disabled** until its parent is chosen;
  changing the parent **clears** the child; a level with **one option is auto-selected**.
- **Crop Year Code**: user-entered, **suggested `CY-YYYY`** (editable), required, unique, max **20**,
  **locked after save**. **Crop Year Name**: required, unique, max **50**, editable.
- R1 Add Crop Year has **Code + Name only — no copy option** (copy is R2: `Copy plots from`,
  `Don't copy — start with no plots`).
- A crop year **with cultivation records cannot be deleted** — delete disabled with
  `Linked to n plots`.

## R1 — detail test cases (PSD verbatim intent)

Existing data: list shows all DB records with current IDs · column search narrows, combines, Clear
resets · count link opens child page filtered to the parent.
Add: ID read only, filled on save · concurrent adds get different IDs · empty name blocked · same
name under same parent blocked with a message · Add Site without Grower / Add Farm without Site →
child picker disabled · single child option auto-selected; changing parent clears child.
Edit/Delete: only name editable · delete on record with children/fields → disabled `Linked to n …`
· confirmed delete removes it; its ID is never re-issued.
Crop Year: Add → Code (suggested, editable) + Name only · empty or duplicate Code/Name blocked ·
Edit → Name editable, Code read only · delete with cultivation records → disabled `Linked to n plots`.

QA test plan: `playwright/test-plans/authenticated/farming-setup.md` (`FS-R1-*`).

## QA baseline before R1 (API, 2026-10-21)

Read through the existing endpoints (`vannbrosphasetwo-vann-api-qa`: `Grower`, `Location` = Site,
`Farm`, `Season`). Use these to check "existing records are listed with their current IDs".

| Level | id · code · name (parent) |
|---|---|
| Grower | 2 · `VBSG` · Vann Bros - HQ; 88 · `G9` · Grower 9/28; 89 · `S2` · Sep 28; 90 · `G9` · Grower 9/29 |
| Site (`/api/Location`) | 2 · `VBSL` · Colusa (G2); 4 · `VBLY` · Yolo (G2); 90 · `G9` · Grower 9/28 (G88); 91 · `S2` · Sep 28 (G89); 92 · `G9` · Grower 9/29 (G90) |
| Farm (`GET /api/Farm?LocationID=`) | 2 · `VBSF` · Vann Farm (Colusa); 3 · `VBYF` · Yolo Farm (Yolo); 89 · `G9` · Grower 9/28; 90 · `S2` · Sep 28; 91 · `G9` · Grower 9/29 |
| Crop Year (`/api/Season`) | ids 2–17 · codes `2015`–`2030` · names `Crop Year 2015`–`Crop Year 2030` |

**Live web, 2026-10-21 (Firefox, admin `CP`):** Settings has **no Farming Setup group**. The
pre-R1 Settings nav is `Crops, Crop Stages, Machines and Implements, Maps Toggle Config, Materials,
Notifications, Plot, Resources, Seasons, Sites, Tasks / Operations, Template Management, User
Management`. Today's overlapping pages:
- **Sites** `/settings/location` — columns `Name` · `Code` only (no grower column, no actions seen);
  5 rows = the Site rows above.
- **Seasons** `/settings/season` — columns `Name` · `Code` · `From` · `Till`; 16 rows, every
  From/Till `01/01/1900`.
- **Plot** `/settings/plot` — see `plots-fields.md`.

Observations that matter for R1 testing:
- Existing codes are free-text mnemonics (`VBSG`, `VBSL`, `VBSF`), not `GR-001` style — what
  "existing numbering scheme" means for a new record must be confirmed.
- Two growers already share code **`G9`** (88 and 90) — if ID/code uniqueness is enforced, legacy
  data already breaks it.
- Existing season codes are `2026`, not the suggested `CY-2026`.
- Endpoints before R1: `Grower` and `Location` have **no DELETE**; `Farm` has `DELETE /api/Farm/{id}`;
  `Season` has no DELETE. Expect new/changed endpoints with R1 — rerun
  `.claude/skills/vannbrosphasetwo-vann-api-qa/scripts/refresh.sh` (on 2026-10-21 the QA
  `swagger.json` returned HTTP 200 with an empty body, so the refresh aborted and the local spec is
  pre-R1).
- The 9/28–9/29 growers/sites/farms are leftovers from earlier QA; they are the natural
  delete-candidates for the "nothing linked" case only if they truly have no children/plots.

## R2–R4 (summary, for later)

**Data model.** One **Field Master** per physical field (permanent **Field ID**, max 50, never
changes, never re-created per crop year; uniqueness per Farm vs company-wide **pending**). One
**Field Cultivation** per Field Master + Crop Year (unique) holding name, Total Area, Operational
Area, Irrigation Method, Irrigation Sources, Coordinates, Varieties, Planted Year, Advanced fields.
Each cultivation has its own D365 project. Editing one crop year never touches another.

**R2 Plot Cultivation page** (Crop Year banner `Crop Year 2026 · 15 plot cultivation · 2,109.59 ac`):
buttons `Copy Plots from Crop Year`, `Create Project` (R3), `Add Plot Cultivation`; `Filter`
(Crop Year, Grower, Site, Farm; badge = active filter count; Clear all removes Crop Year too).
Columns: checkbox, `Grower`, `Site`, `Farm`, `Plot/Field ID`, `Plot/Field Name`, `Total Area (ac)`,
`Operational Area (ac)`, `Irrigation Me[thod]`, ….
- Add: **Existing Field** (lists only fields with no record in that crop year; Field ID read only;
  nothing copied) or **New Field** (creates the Field Master). Messages:
  `Field ID already exists. Please select the existing field.` /
  `A cultivation record already exists for Field {Field ID} in Crop Year {Crop Year}.`
- General: `Plot/Field Name` (req, 50) · `Total Area (ac)` (req, >0, 2 dp) · `Operational/Production
  Area (ac)` (req, >0, ≤ Total; `Can't be more than the total area`) · `Irrigation Method` (req,
  single) · `Irrigation Sources` (req, multi) · `Coordinates` (optional, lon,lat,alt list, 20000).
- Varieties: variety unique per plot, planted area > 0, Σ ≤ Operational (`{X} of {Y} ac — more than
  operational area`); Add Variety pre-fills unplanted acres.
- Advanced (all optional): Bed & Row (Number of Beds, Rows/Bed, Bed Lineal Meter Length (m), Number
  of Rows, Spacing b/w Beds, Spacing b/w Rows, Skipped Rows) · Planting (Depth of Planting, Year
  Planted YYYY, RootStock, Tree/Acre, Plants/Acre) · Land & Records (FSA Reported Area, Lease Land
  Area, APN#, Old Field#, LandOwner or Company Name, Range, Other).
- Errors: red field, red dot on the tab, Save jumps to the first tab with an error.
- Delete: `Only the cultivation record for the selected crop year will be deleted. The Field Master
  and other crop year records will remain unchanged.` Project-linked → delete blocked
  (`Can't delete — Project {Project No.} already created`), read only except adding a new variety.
- Copy (Create Crop Year with Plot Copy / Copy into existing): Site/Farm/Field ID locked; Name,
  areas, irrigation, coordinates, varieties editable; Operational follows Total when equal; no
  Project No. copied; rows already in target shown `Already in …` and unselectable; invalid rows
  outlined red block Save. Toasts `{Crop Year} created with {n} plots` / `{n} plots copied to {Crop Year}`.
- Saved toast: `Plot {ID} added in {Crop Year}` / `Plot {ID} updated in {Crop Year}`.

**R3** Project Name default `{Plot ID} {Plot Name} – {Crop Year}` (max 60); Start Date defaults to
today (past allowed); Type and Group dropdowns per row; AgriProject never shown in AgriERP; second
create for the same pair returns the existing Project No. Toasts `Creating {n} projects in D365…` /
`Project {No.} created for plot {ID}` / `D365 error: {message}. Fix the plot and create again.`
Status enum: None / Creating / Created / Failed / Updating / Synced / Update failed.

**R4** Sync on Save only for D365-mapped fields; mapping of Project Name, Total/Operational Area and
Irrigation Method is still **To confirm**. Varieties/Advanced never synced. Toasts
`Plot {ID} saved · updating Project {Project No.} in D365…` / `Project {Project No.} updated in D365` /
`Project {Project No.} not updated — D365 rejected the change. Saved in AgriERP; use Retry.`

## Open questions to raise (R1 first)

1. Is the role **Farm Admin** the existing QA `Admin` role, or a new role? Which permission/feature
   toggle grants Farming Setup in User Management?
2. What exactly is the "existing numbering scheme" for new Grower/Site/Farm IDs, given QA codes are
   mnemonics (`VBSG`, `VBSL`, `VBSF`) and the mock shows `GR-002`?
3. Legacy duplicates (two growers coded `G9`) — how should the list and uniqueness rules treat them?
4. Crop Years vs the existing **Settings › Seasons** page (`/api/Season`): same table? Does Seasons
   stay? Existing codes are `2026`, not `CY-2026`.
5. R1 delete rule for a crop year says "no cultivation records" — before R2 exists, are current
   plots/WOs/projects linked to a season counted?
6. Settings › **Plot** and top-level **Sites** disappear from the mock nav — removed in R1 or only
   when R2 ships?
7. Field ID uniqueness scope (per Farm vs company-wide) — pending in the PSD; QA data has codes like
   `130` repeated across farms (see `plots-fields.md`).

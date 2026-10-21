# Test Plan — Farming Setup R1 (Hierarchy & Crop Year Setup)

- **Spec:** _none yet — manual only_. Planned: `playwright/tests/authenticated/farming-setup.spec.ts`
  (tag `@FS`), written after the first live check of the R1 build.
- **Product spec:** `resources/product-specifications-document/AgriERP FSCM - Farming Setup v1.0.docx.pdf`
  (PSD v1.0; R1 workflow p. 6, R1 mocks pp. 13–15, R1 detail cases p. 31)
- **ADO:** enhancement ticket pending from the product team — add the id here.
- **Source of truth:** `vannbrosphasetwo-knowledge/references/farming-setup.md`
- **API contract:** `vannbrosphasetwo-vann-api-qa` — today `Grower`, `Location` (= Site), `Farm`,
  `Season`; rerun `scripts/refresh.sh` once R1 is on QA and update the seed/teardown table below.
- **Automation status:** Manual (feature not deployed on QA as of 2026-10-21)
- **Live verification:** none yet. All labels below are from the PSD mocks; mock IDs (`GR-001`,
  `ST-001`, `FM-001`, `CY-2026`) are **not** the QA IDs — use the baseline in the knowledge ref.
- **Last updated:** 2026-10-21

**Scope (R1 only):** Settings › Farming Setup › **Growers**, **Sites**, **Farms**, **Crop Years**:
list existing records, column search, count links, add (ID from the existing numbering scheme),
edit name, delete when nothing is linked; create an **empty** Crop Year. Out of scope for R1:
Plot Cultivation, Field Master, copy, D365 projects (R2–R4).

**P1 smoke cases:** FS-R1-01, FS-R1-03, FS-R1-05, FS-R1-08, FS-R1-13, FS-R1-17, FS-R1-22,
FS-R1-26, FS-R1-27, FS-R1-32.

> ⚠️ **Mutating.** Adds and deletes change shared QA master data that work orders, plots and
> Harvest Central read. Name every record `QA FS <yyyy-mm-dd hh:mm>` and delete it at the end of the
> run (the delete cases do this). Never delete or rename `Vann Bros - HQ`, `Colusa`, `Yolo`,
> `Vann Farm`, `Yolo Farm` or any existing `Crop Year NNNN`.

## QA baseline (pre-R1, from the API on 2026-10-21)

| Level | Existing records to expect in the list |
|---|---|
| Growers | `VBSG` Vann Bros - HQ · `G9` Grower 9/28 · `S2` Sep 28 · `G9` Grower 9/29 |
| Sites | `VBSL` Colusa · `VBLY` Yolo (both under Vann Bros - HQ) · `G9` Grower 9/28 · `S2` Sep 28 · `G9` Grower 9/29 |
| Farms | `VBSF` Vann Farm (Colusa) · `VBYF` Yolo Farm (Yolo) · `G9` Grower 9/28 · `S2` Sep 28 · `G9` Grower 9/29 |
| Crop Years | codes `2015`–`2030`, names `Crop Year 2015`–`Crop Year 2030` (16 rows) |

Whether the "ID" columns show these codes or the numeric ids is itself something to confirm on the
first run (FS-R1-05).

---

## A) Access

### FS-R1-01 — Farming Setup visible to a Farm Admin

| Field | Content |
|---|---|
| **ID** | FS-R1-01 |
| **Title** | Farm Admin sees the Farming Setup group in Settings |
| **Module** | Settings › Farming Setup |
| **Role** | Farm Admin (QA `Admin` until the role is confirmed) |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | R1 deployed; the user's role has the Farming Setup feature |
| **Steps** | 1. Log in. 2. Click the **Settings** gear. 3. Expand **Farming Setup** in the left nav. |
| **Expected result** | The group lists `Growers`, `Sites`, `Farms`, `Crop Years` (and `Plot Cultivation` only if R2 has shipped). Each opens with breadcrumb `Home > Settings > Farming Setup > <Page>`. |
| **Type** | Smoke / Permission |

### FS-R1-02 — Farm Operations Manager has the same access

| Field | Content |
|---|---|
| **ID** | FS-R1-02 |
| **Title** | Farm Operations Manager can view, add, edit and delete like Farm Admin |
| **Module** | Settings › Farming Setup |
| **Role** | Farm Operations Manager |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | A user with the `Farm Operations Manager` role |
| **Steps** | 1. Log in as that user. 2. Open each R1 page. 3. Check the `+ Add …` buttons and the edit / delete icons. |
| **Expected result** | Same pages and actions as FS-R1-01; no action is hidden or disabled because of role. |
| **Type** | Permission |

### FS-R1-03 — Other roles have no access (UI)

| Field | Content |
|---|---|
| **ID** | FS-R1-03 |
| **Title** | A role without the feature sees no Farming Setup and cannot open its URLs |
| **Module** | Settings › Farming Setup |
| **Role** | Any other web role (e.g. Full Planner, Field Workers) |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | A user whose role lacks the Farming Setup feature; the R1 page URLs captured in FS-R1-01 |
| **Steps** | 1. Log in as that user. 2. Open **Settings**. 3. Paste each R1 page URL directly. |
| **Expected result** | No **Farming Setup** group in the nav. Direct URLs do not render the pages or their actions (redirect / no-access state). |
| **Type** | Negative / Permission |

### FS-R1-04 — Other roles are refused by the API

| Field | Content |
|---|---|
| **ID** | FS-R1-04 |
| **Title** | The backend refuses Farming Setup writes from a role without the feature |
| **Module** | Settings › Farming Setup (API) |
| **Role** | Operator token (`ApiClient.asOperator()`) |
| **Platform** | API |
| **Priority** | P2 |
| **Preconditions** | R1 endpoints known (refresh the API skill) |
| **Steps** | 1. With the operator token, call the R1 create endpoint for a Grower and the delete endpoint for a test record. |
| **Expected result** | 401/403 (not 200); nothing is created or deleted. PSD: "the same check is enforced in the UI and in the backend/API". |
| **Type** | Negative / Security |

## B) Growers

### FS-R1-05 — Existing growers are listed with their current IDs

| Field | Content |
|---|---|
| **ID** | FS-R1-05 |
| **Title** | Growers page lists every existing grower |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Steps** | 1. Open **Farming Setup › Growers**. |
| **Expected result** | Title `Growers`, subtitle `Companies that own the farming operation`, button `+ Add Grower`. Columns `Grower ID` · `Grower Name` · `Sites` · `Actions`. All baseline growers appear with their existing IDs; `Vann Bros - HQ` shows `2 sites`. Footer shows `Page Size` and `Page 1 of 1, Showing 1 - 4 of 4 records`. |
| **Type** | Smoke / Functional |

### FS-R1-06 — Column search narrows, combines and clears

| Field | Content |
|---|---|
| **ID** | FS-R1-06 |
| **Title** | Per-column search on Growers |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Type `Vann` under `Grower Name`. 2. Also type `VBSG` under `Grower ID`. 3. Type `zzz` under `Grower Name`. 4. Clear the searches. |
| **Expected result** | 1 → only Vann Bros - HQ. 2 → still that row (searches combine). 3 → empty-state message. 4 → all rows back. A new search returns to page 1. |
| **Type** | Functional |

### FS-R1-07 — Sites count opens the filtered Sites page

| Field | Content |
|---|---|
| **ID** | FS-R1-07 |
| **Title** | The `2 sites` link opens Sites filtered to that grower |
| **Module** | Farming Setup › Growers → Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. On Growers, click `2 sites` on Vann Bros - HQ. |
| **Expected result** | **Sites** opens showing only `Colusa` and `Yolo`, with the grower filter visible as active. |
| **Type** | Functional |

### FS-R1-08 — Add Grower with a system-generated ID

| Field | Content |
|---|---|
| **ID** | FS-R1-08 |
| **Title** | Add Grower assigns the next ID from the existing scheme |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Test data** | Grower Name `QA FS <timestamp>` |
| **Steps** | 1. Click `+ Add Grower`. 2. Inspect `Grower ID`. 3. Enter `Grower Name*`. 4. Click `Save Grower`. |
| **Expected result** | Side panel `Add Grower`; `Grower ID` is read only with hint `System generated`; `Save Grower` disabled until a name is entered. After save the new row is listed with an ID that follows the existing scheme (record the actual format — open question) and `0 sites`. |
| **Type** | Smoke / Functional |

### FS-R1-09 — Grower Name is required

| Field | Content |
|---|---|
| **ID** | FS-R1-09 |
| **Title** | Saving without a name is blocked |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. `+ Add Grower`. 2. Leave `Grower Name*` empty (also try only spaces). 3. Try `Save Grower`. |
| **Expected result** | Save is blocked; the field is marked required. Nothing is added. |
| **Type** | Negative |

### FS-R1-10 — Duplicate grower name is blocked

| Field | Content |
|---|---|
| **ID** | FS-R1-10 |
| **Title** | A grower name that already exists cannot be saved again |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Test data** | `Vann Bros - HQ`; also `vann bros - hq` and ` Vann Bros - HQ ` |
| **Steps** | 1. `+ Add Grower`. 2. Enter an existing name. 3. `Save Grower`. |
| **Expected result** | Save blocked with a duplicate-name message. Note how case and surrounding spaces are treated. |
| **Type** | Negative |

### FS-R1-11 — Name length limit 50

| Field | Content |
|---|---|
| **ID** | FS-R1-11 |
| **Title** | Names accept 50 characters and no more |
| **Module** | Farming Setup › Growers / Sites / Farms |
| **Role** | Farm Admin |
| **Platform** | Web + API |
| **Priority** | P3 |
| **Test data** | 50-char and 51-char names |
| **Steps** | 1. Add with a 50-char name. 2. Try a 51-char name in the UI. 3. Send a 51-char name through the API. |
| **Expected result** | 50 saves. 51 is stopped in the UI and rejected with a 400 (not a 500) by the API. |
| **Type** | Negative / Boundary |

### FS-R1-12 — Edit changes the name only

| Field | Content |
|---|---|
| **ID** | FS-R1-12 |
| **Title** | Edit Grower: ID read only, name editable |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | The grower from FS-R1-08 |
| **Steps** | 1. Click the pencil on the test grower. 2. Try to edit `Grower ID`. 3. Rename to `QA FS <timestamp> edited`. 4. Save. |
| **Expected result** | `Grower ID` is read only; the new name shows in the list with the same ID; an audit entry is written. |
| **Type** | Functional |

### FS-R1-13 — Delete is disabled when sites are linked

| Field | Content |
|---|---|
| **ID** | FS-R1-13 |
| **Title** | A grower with sites cannot be deleted |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web + API |
| **Priority** | P1 |
| **Steps** | 1. Hover / click the trash on `Vann Bros - HQ`. 2. Call the R1 delete endpoint for it. |
| **Expected result** | Trash disabled with `Linked to 2 …` (sites). The API refuses the delete; the grower is unchanged. **Do not** proceed if the UI lets you confirm — cancel and log a bug. |
| **Type** | Negative |

### FS-R1-14 — Delete a grower with nothing linked; ID never re-used

| Field | Content |
|---|---|
| **ID** | FS-R1-14 |
| **Title** | Deleting an unlinked grower removes it and retires its ID |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | The test grower from FS-R1-08 with no sites |
| **Steps** | 1. Note its ID. 2. Click the trash. 3. Read the dialog and confirm. 4. Add another test grower. |
| **Expected result** | Dialog: `{ID} has nothing linked to it and will be removed. This can't be undone.` Row removed after confirm. The next grower gets a **new** ID, never the deleted one. Delete that grower too (cleanup). Cancel on the dialog changes nothing. |
| **Type** | Functional |

### FS-R1-15 — Concurrent adds get different IDs

| Field | Content |
|---|---|
| **ID** | FS-R1-15 |
| **Title** | Two simultaneous adds never share an ID |
| **Module** | Farming Setup › Growers |
| **Role** | Farm Admin (two sessions) |
| **Platform** | Web / API |
| **Priority** | P3 |
| **Steps** | 1. Open `+ Add Grower` in two tabs (or fire two create calls in parallel). 2. Save both. |
| **Expected result** | Two rows with distinct IDs. Clean both up. |
| **Type** | Edge |

## C) Sites

### FS-R1-16 — Sites list and filter

| Field | Content |
|---|---|
| **ID** | FS-R1-16 |
| **Title** | Sites page lists existing sites with grower and farm count |
| **Module** | Farming Setup › Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Open **Sites**. 2. Use **Filter** to choose `Vann Bros - HQ`. 3. Click `1 farm` on Colusa. |
| **Expected result** | Subtitle `Locations under a grower`; columns `Grower` · `Site ID` · `Site Name` · `Farms` · `Actions`; baseline sites listed. Filter leaves Colusa and Yolo. `1 farm` opens **Farms** filtered to Colusa (Vann Farm). |
| **Type** | Functional |

### FS-R1-17 — Add Site needs a Grower first

| Field | Content |
|---|---|
| **ID** | FS-R1-17 |
| **Title** | Add Site under a grower |
| **Module** | Farming Setup › Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | A test grower `QA FS <timestamp>` |
| **Steps** | 1. `+ Add Site`. 2. Try to save with no Grower. 3. Pick the test grower, enter `Site Name`, save. |
| **Expected result** | Site ID read only (system generated). Save blocked without a Grower. After save the site is listed under the test grower; the grower's `Sites` count becomes `1 site`. |
| **Type** | Smoke / Functional |

### FS-R1-18 — Site name unique within its grower only

| Field | Content |
|---|---|
| **ID** | FS-R1-18 |
| **Title** | Same site name: blocked under the same grower, allowed under another |
| **Module** | Farming Setup › Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Test data** | `Colusa` |
| **Steps** | 1. Add Site `Colusa` under `Vann Bros - HQ`. 2. Add Site `Colusa` under the test grower. |
| **Expected result** | 1 blocked with a duplicate message. 2 saves (unique within the parent only). Delete the test site afterwards. |
| **Type** | Negative |

### FS-R1-19 — Edit Site: grower read only

| Field | Content |
|---|---|
| **ID** | FS-R1-19 |
| **Title** | Only the site name can change |
| **Module** | Farming Setup › Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Pencil on the test site. |
| **Expected result** | `Site ID` and `Grower` read only; name editable and saves. |
| **Type** | Functional |

### FS-R1-20 — Site with farms cannot be deleted

| Field | Content |
|---|---|
| **ID** | FS-R1-20 |
| **Title** | Delete disabled on Colusa |
| **Module** | Farming Setup › Sites |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Trash on `Colusa`. |
| **Expected result** | Disabled with `Linked to 1 …` (farm). |
| **Type** | Negative |

## D) Farms

### FS-R1-21 — Farms list

| Field | Content |
|---|---|
| **ID** | FS-R1-21 |
| **Title** | Farms page lists existing farms with plot counts |
| **Module** | Farming Setup › Farms |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Open **Farms**. |
| **Expected result** | Subtitle `Farms under a site`; columns `Grower` · `Site` · `Farm ID` · `Farm Name` · `Plots` · `Actions`; `Vann Farm` (Colusa) and `Yolo Farm` (Yolo) listed with plot counts that match **Settings › Plot** for that farm. `Filter` present. |
| **Type** | Functional |

### FS-R1-22 — Add Farm: pickers fill top-down

| Field | Content |
|---|---|
| **ID** | FS-R1-22 |
| **Title** | Site picker waits for Grower, auto-selects a single option, clears on parent change |
| **Module** | Farming Setup › Farms |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Preconditions** | Test grower with exactly one test site (FS-R1-17) |
| **Steps** | 1. `+ Add Farm`. 2. Check the Site picker before choosing a Grower. 3. Choose the test grower. 4. Change Grower to `Vann Bros - HQ`. 5. Choose `Colusa`, then switch back to the test grower and save `QA FS <timestamp> farm`. |
| **Expected result** | 2 → Site disabled. 3 → the only site is auto-selected. 4 → Site cleared, then offers Colusa and Yolo. 5 → farm saved with a read-only system Farm ID under the test site; site's `Farms` shows `1 farm`. |
| **Type** | Smoke / Functional |

### FS-R1-23 — Farm name unique within its site

| Field | Content |
|---|---|
| **ID** | FS-R1-23 |
| **Title** | Duplicate farm name under the same site is blocked |
| **Module** | Farming Setup › Farms |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Add Farm `Vann Farm` under Colusa. |
| **Expected result** | Save blocked with a duplicate message. |
| **Type** | Negative |

### FS-R1-24 — Farm with plots cannot be deleted

| Field | Content |
|---|---|
| **ID** | FS-R1-24 |
| **Title** | Delete disabled on Vann Farm |
| **Module** | Farming Setup › Farms |
| **Role** | Farm Admin |
| **Platform** | Web + API |
| **Priority** | P1 |
| **Steps** | 1. Trash on `Vann Farm`. 2. Call `DELETE /api/Farm/2` (existing endpoint) — **only** if the R1 build says it is guarded; otherwise skip step 2. |
| **Expected result** | Disabled with `Linked to {n} plots`. API refuses. |
| **Type** | Negative |

### FS-R1-25 — Hierarchy cleanup bottom-up

| Field | Content |
|---|---|
| **ID** | FS-R1-25 |
| **Title** | Test farm → site → grower delete in order |
| **Module** | Farming Setup |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Try to delete the test grower (has a site). 2. Delete the test farm. 3. Delete the test site. 4. Delete the test grower. |
| **Expected result** | 1 disabled (`Linked to 1 …`). 2–4 succeed with the delete dialog text; counts update after each step. |
| **Type** | Functional / Cleanup |

## E) Crop Years

### FS-R1-26 — Crop Years list shows existing seasons

| Field | Content |
|---|---|
| **ID** | FS-R1-26 |
| **Title** | Existing crop years are listed |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Steps** | 1. Open **Crop Years**. |
| **Expected result** | Columns `Crop Year Code` · `Crop Year` · `Farms` · `Plots` · `Total Area (ac)` · `Actions`; the 16 baseline crop years (`2015`…`2030`) listed — or, if Crop Years is a new table, record what is shown and raise it (open question: Crop Years vs Settings › Seasons). |
| **Type** | Smoke |

### FS-R1-27 — Add an empty Crop Year

| Field | Content |
|---|---|
| **ID** | FS-R1-27 |
| **Title** | Add Crop Year has Code + Name only and creates an empty crop year |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Test data** | Code `QA-FS-<mmddHHMM>` (≤ 20), Name `QA FS Crop Year <timestamp>` |
| **Steps** | 1. `+ Add Crop Year`. 2. Inspect the panel. 3. Overwrite the suggested code, enter the name, save. |
| **Expected result** | Only `Crop Year Code` (pre-filled with a `CY-YYYY` suggestion, editable) and `Crop Year Name`; **no** `Copy plots from` option in R1. Saved row shows `0` farms / `0 plots` / `0` area. Check whether it appears in the header **Season** selector and in Settings › Seasons. |
| **Type** | Smoke / Functional |

### FS-R1-28 — Code and Name required

| Field | Content |
|---|---|
| **ID** | FS-R1-28 |
| **Title** | Empty Code or Name blocks save |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Clear the code, enter a name, save. 2. Enter a code, clear the name, save. |
| **Expected result** | Both blocked; the empty field is marked. |
| **Type** | Negative |

### FS-R1-29 — Code and Name unique

| Field | Content |
|---|---|
| **ID** | FS-R1-29 |
| **Title** | Duplicate Code or Name blocks save |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Test data** | Code `2026`; Name `Crop Year 2026` |
| **Steps** | 1. Add with code `2026` and a new name. 2. Add with a new code and name `Crop Year 2026`. |
| **Expected result** | Both blocked with a duplicate message. |
| **Type** | Negative |

### FS-R1-30 — Length limits (Code 20, Name 50)

| Field | Content |
|---|---|
| **ID** | FS-R1-30 |
| **Title** | Crop Year field lengths |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web + API |
| **Priority** | P3 |
| **Steps** | 1. Try a 21-char code and a 51-char name in the UI and via the API. |
| **Expected result** | UI stops input / blocks save; API returns 400, not 500. |
| **Type** | Boundary |

### FS-R1-31 — Edit: Code locked, Name editable

| Field | Content |
|---|---|
| **ID** | FS-R1-31 |
| **Title** | Crop Year Code is locked after save |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Preconditions** | The crop year from FS-R1-27 |
| **Steps** | 1. Pencil on it. 2. Try to edit the code. 3. Change the name, save. |
| **Expected result** | Code read only; new name saved. |
| **Type** | Functional |

### FS-R1-32 — Crop year with plots cannot be deleted

| Field | Content |
|---|---|
| **ID** | FS-R1-32 |
| **Title** | Delete disabled on Crop Year 2026 |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P1 |
| **Steps** | 1. Trash on `Crop Year 2026`. |
| **Expected result** | Disabled with `Linked to {n} plots`. (If R1 counts no plots because cultivation records arrive in R2, the delete must still be refused while WOs/projects use the season — log it as a question, do not confirm a delete.) |
| **Type** | Negative |

### FS-R1-33 — Delete an empty crop year

| Field | Content |
|---|---|
| **ID** | FS-R1-33 |
| **Title** | The empty test crop year can be deleted |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Trash on the FS-R1-27 crop year. 2. Confirm. |
| **Expected result** | Removed from Crop Years (and from the Season selector / Settings › Seasons if it appeared there). |
| **Type** | Functional / Cleanup |

## F) Cross-cutting

### FS-R1-34 — Paging and search together

| Field | Content |
|---|---|
| **ID** | FS-R1-34 |
| **Title** | Totals stay right with paging + search |
| **Module** | Farming Setup › Crop Years |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P3 |
| **Steps** | 1. Page Size 10 → page 2. 2. Type `202` under `Crop Year Code`. |
| **Expected result** | Search jumps to page 1; `Showing X - Y of Z` reflects the filtered total. |
| **Type** | Functional |

### FS-R1-35 — Audit entries

| Field | Content |
|---|---|
| **ID** | FS-R1-35 |
| **Title** | Add, edit and delete each write an audit entry |
| **Module** | Farming Setup |
| **Role** | Farm Admin |
| **Platform** | Web / API |
| **Priority** | P3 |
| **Steps** | 1. After FS-R1-08/12/14, look up the audit log (existing mechanism: `EventTrail` / `HistoryLog` APIs — confirm which). |
| **Expected result** | One entry per action with entity, action, before/after, user and time. |
| **Type** | Functional |

### FS-R1-36 — Regression: existing consumers still resolve the hierarchy

| Field | Content |
|---|---|
| **ID** | FS-R1-36 |
| **Title** | Header Site/Season selectors, Settings › Plot and WO plot picker unaffected |
| **Module** | Regression |
| **Role** | Farm Admin |
| **Platform** | Web |
| **Priority** | P2 |
| **Steps** | 1. Rename a test site/farm. 2. Check the header **Site** selector, **Settings › Plot** (Farms picker in Add Plot) and the **+ Add Plot** picker in a Planned WO. 3. Run `pnpm test:smoke` (Firefox). |
| **Expected result** | Renamed test records show the new name; Colusa / Vann Farm / Crop Year 2026 flows are unchanged; smoke green. |
| **Type** | Regression |

## Open questions (block or shape the run)

See `farming-setup.md` → *Open questions to raise*. The ones that change expected results here:
the *Farm Admin* role mapping (A), the ID scheme for new records (FS-R1-08), legacy duplicate code
`G9` (FS-R1-05), Crop Years vs Seasons (FS-R1-26/27/33), and what "linked" means for a crop year
before R2 (FS-R1-32).

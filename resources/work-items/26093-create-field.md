# ADO #26093 — Integrate Create Field Functionality to Vann Farm Web App

Source: [dev.azure.com/AgriERPProduct/Vann Brothers/_workitems/edit/26093](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26093)

| Field | Value |
|---|---|
| Work item type | Enhancement |
| State | In Development (since 2026-09-18) |
| Area / Iteration | `Vann Brothers\Vann Brothers Phase 2` |
| Created by | Zujaj Misbah Khan — 2026-09-11 |
| Assigned to | Mohsin Aqee |
| Revision | 16 |

## Scope

Let users create a plot/field from the **Farm web app** instead of only in FinOps (D365 F&O), and keep
the two sides in sync.

- User creates a field through a form, with validation limits.
- Form fields match the equivalent FinOps form.

Entry point: **Settings** gear → **Plot** (`/settings/plot`) → **Add Plot**.

![Settings > Plot list with the Add Plot button](../../.claude/skills/vannbrosphasetwo-knowledge/assets/settings-plot-list.png)

![Add Plot form](../../.claude/skills/vannbrosphasetwo-knowledge/assets/add-plot-form.png)

## Acceptance criteria

1. Coordinates are **optional** on the **Add Plot** form.
2. The **PlotJobField** service is enabled and functional.
3. Plots created in the web app sync to FinOps — **AgriERP management > Plots/Fields**.
4. Projects created against those plots in FinOps sync back to the web app:
   - **Project management and accounting > All Projects > New**
   - After creation, set **Project Stage** (Maintain tab) to **InProcess**
   - Return to the web app; the project appears as synced.

## Form contract (from the work item screenshots)

| Field | Required | Control | Example |
|---|---|---|---|
| `Farms*` | yes | single-select | `Vann Farm (VBSF)` |
| `Field Name*` | yes | text | `Test_Field` |
| `Field Code*` | yes | text | `120` |
| `Irrigation Method*` | yes | single-select | `Drip (01)` |
| `Irrigation Sources*` | yes | multi-select chips | `Contra Costa Water District (CCWD)`, `Glenn-Colusa Irrigation District (GCID)` |
| `Total Area*` | yes | numeric | `10,000` |
| `Coordinate` | **no** (AC #1) | textarea, `lon,lat,0` triples space-separated | `146.14537,-34.47167,0 146.14597,-34.4719,0 …` |

Actions: **Save** / **X** (close). A right-hand **Summary** panel mirrors the entered values live.

Plot list columns: `Site`, `Farm`, `Field Code`, `Field Name`, `Total Area`, `Irrigation Method`,
`Irrigation Sources`. Site/Farm/Field Code/Field Name are searchable + sortable; `Total Area` sortable.
Paged (`Page Size` selector; 103 records on Colusa at capture time).

## Discussion thread

| Date | Who | Note |
|---|---|---|
| 2026-09-11 | wania aslam | Assigned out to Yousuf Safwan Shah / Umair Ahmed Awan. |
| 2026-09-15 | Umair Ahmed Awan | Backend changes done and deployed to **DEV** and **QA**. |
| 2026-09-16 | Zujaj Misbah Khan | Plots `TF1` and `130X` created via `/settings/plot` on QA did not appear in FinOps **AgriERP management > Plots/Field**. **PlotJobField** service was **inactive**; sync console last record `03/05/2026 04:55 PM`. |
| 2026-09-17 | Mohsin Aqee | Fields created on QA have been picked up and synced to D365. |
| 2026-09-18 | Zujaj Misbah Khan | Plots `28-289` and `28-293` created via **Add Plots** still not synced to UAT FinOps; sync console shows only one record from the 02:18 PM test run, although **PlotFieldJob** is active. Awaiting acknowledgement. |

Open at time of capture: the 2026-09-18 sync gap (AC #3).

## QA notes

- Test data created so far on QA: `TF1`, `130X`, `28-289`, `28-293`.
- Sync verification is a two-system check — web app **and** FinOps sync console — so it cannot be
  asserted from the web UI alone.
- The FinOps menu path differs between the description (`Plots/Fields`) and the 2026-09-16 comment
  (`Plots/Field`); confirm the exact label in D365 before writing it into a test case.

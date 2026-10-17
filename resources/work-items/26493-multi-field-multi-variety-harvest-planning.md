# ADO #26493 — Multi-Field and Multi-Variety Selection in Harvest Central Planning

Source: [dev.azure.com/AgriERPProduct/Vann Brothers/_workitems/edit/26493](https://dev.azure.com/AgriERPProduct/Vann%20Brothers/_workitems/edit/26493)

| Field | Value |
|---|---|
| Work item type | Enhancement |
| State | New (as of 2026-10-16; the release note says "ready for QA") |
| Iteration | `Vann Brothers\Vann Brothers Phase 2` |
| Assigned to | Mohsin Aqee |
| Children | 26499 "Multi-Field Varieties Cascading", 26500 "Contract-Wise Multi-Field Varieties Configuration" (both New, empty template) |
| Related | 26498 "Multi-Field Varieties Support" (New, empty template) |
| Comments | none |
| Mobile | iOS 1.3.14 (27) on TestFlight: "Create bulk harvest centrals for the field and variety that has active contracts" |

## Ticket (summary of the description)

- **Field multi-select** in Harvest Central Planning. Only fields with an **active GP contract under Vann Grower** are offered.
- **Variety multi-select**, limited to the varieties mapped to the selected fields.
- **On save, one planning record per valid Field × Variety pair.** No pairs for unmapped varieties, and no duplicates within one operation. Each record is listed on its own in the Harvest Central Planning list.
- Example: 130 (Nonpareil, Monterey) + 150 (Monterey, Aldrich) → 4 records.

## Developer release note (Mohsin Aqee, received 2026-10-16)

1. Harvest contracts sync from GP into AgriERP and decide what can be harvested.
2. Harvesting lists are contract-driven: only contracted plots, and within them only contracted varieties.
3. **Plan Incoming Loads** takes several plots at once, each with its own varieties. It plans the requested number of loads for every plot × variety pair, and a project can be chosen per plot. **If anything in the request isn't recognised, nothing is created.**
4. Mobile receives the varieties growing in each plot, the crop variety code, and the contracts.

**Jobs** (both ship switched off and must be enabled on QA, incoming first):
- `GrowerPortalCreateContractJob` (GP → AgriERP). Re-runs update existing contracts instead of duplicating them.
- `FireBaseCreateContractsJob` (AgriERP → mobile).

**Endpoints:**
- `GET api/Metadata/GetFieldsForHarvesting`: plots with a live contract, with an optional crop year.
- `POST api/Metadata/GetVarietiesForHarvesting`: for the chosen plots, the varieties both growing and on a live contract.

**Impacted areas:**

| Area | Risk | Note |
|---|---|---|
| Harvest Central Plan Incoming Loads | High | Request format changed; the web change must ship with it |
| Harvesting plot & variety selection | Medium | |
| GP sync (two new jobs) | Medium | |
| Mobile data | Medium | |
| Plot / variety pickers on Field, Farm, Map, Planning, Activity | Medium | Re-check |

## QA check 2026-10-16 (QA env, read-only)

The live results are in `playwright/test-plans/FINDINGS.md` #59–#61. In brief:

- **Jobs:** 165 and 166 are **Active**. Job 165 logged 4,825 contract × plot × variety lines (602 contracts, **all GP growers**) and one run error. Job 166 pushed 4,826 records to Firebase.
- **Endpoints:**
  - `GetFieldsForHarvesting` returns 69 Vann Farm fields: Vann's 51 contracted plots plus **18 plots named only in other growers' contracts** (#60). Vann plots that are only on closed 2025 contracts (280, 286, 287, 301) are correctly left out.
  - **Dev sample contract codes (2026-10-16):** `VSM-A9611-25`, `YSS-40D5B-25`, `VSM-Z8B1Y-26` and `YSA-66PIJ-26`; legend VSM = VFO, YSS = YHS. GP shows all four belong to **Vann-Peterson Farms Partnership (262)**, not Vann Brothers (260), and cover plots 150, 151 and 152. Vann Brothers' own active contracts are `VSM-0EY10-26` and `YSA-A4VMW-26`.
  - `GetVarietiesForHarvesting` takes `{ "fieldIds": [...] }` (a bare array → 400) and returns the growing ∩ contracted varieties. ✅
- **Backend plan:** `POST api/harvestcentral/tickets/plan` now needs `fields: [{ fieldID, … }]`. The old `{fieldID, cropVarietyID, seasonID, quantity}` body gets 400 "At least one field is required." An unknown field gets 400 "Selected field was not found."
- **Web:** not shipped. The panel is still `Plan Harvest Tickets` (single Field from all 110 plots, single Variety from all 44), and it still sends the old body. **Web planning is broken** (#59).
- **Swagger** at `/swagger/v1/swagger.json` returns an empty 200, so the API reference cannot be refreshed (#61).

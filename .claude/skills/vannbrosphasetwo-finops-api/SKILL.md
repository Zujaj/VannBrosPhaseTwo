---
name: vannbrosphasetwo-finops-api
description: >-
  Reference and client for the AgriERP custom services in Dynamics 365 Finance & Operations
  (FinOps / D365 F&O) that the VannBrosPhaseTwo Farm App syncs with: the F3Agri* services
  (crops, varieties, seasons, materials, UOM, customers, resources and resource groups, farm
  operations, WMS locations, projects/WBS, plots/fields, irrigation, work orders, project item
  journals, item return). Built from the Postman collection's FinOps folder, with observed
  response shapes. Use whenever a task calls, scripts, checks or explains the D365 side of the
  integration, e.g. "what does FinOps return for crops", "did the plot reach FinOps", "compare Farm
  App resources with D365", "what body does createProjectItemJournal take", or the FinOps Bearer
  token in playwright/.auth/qa_finops_token.txt. Not for the Farm App's own REST API (use
  vannbrosphasetwo-vann-api-qa) or D365 UI review steps (use vannbrosphasetwo-knowledge).
---

# VannBrosPhaseTwo FinOps (D365 F&O) services

The Farm App keeps its master data in step with **Dynamics 365 Finance & Operations** through a set
of custom X++ services Folio3 built (prefix `F3Agri`). D365 is the source of truth for master data
(crops, materials, UOM, resources, projects…); the Farm App pushes plots, work orders, consumption
and returns back. This skill covers calling those services directly, the way the team does in
Postman.

What's here:

- `reference/services.md`: every request in the Postman **FinOps** folder, with its path and body.
  Generated, so don't hand-edit it.
- `collection.finops.json`: that folder alone, as a standalone Postman v2.1 collection. You can
  import it into Postman. The rest of the original export stays out because it holds literal
  secrets.
- `scripts/finops.mjs`: a small Node CLI that calls a service with a token a person supplies. Its guards are
  described below.
- `scripts/extract.mjs`: regenerates the two files above from a fresh Postman export.

This skill is separate from `vannbrosphasetwo-vann-api-qa`. That one is the Farm App's backend
(`agrierp-vann-api-qa.folio3.site`, Firebase token). This one is D365 itself, with a different host,
a different auth, and different ID formats.

## Authentication (Bearer token from a person)

Every service call sends `Authorization: Bearer <token>`. The token is the Microsoft Entra ID access
token that the Postman **Auth** request returns, and the collection saves it as
`{{agrierp_fno_access_token}}`. It is a JWT and lasts about an hour. There's no refresh token.

- **A person supplies the token. Code doesn't mint it.** The CLI never holds the client secret. Ask
  the user for a fresh token, and don't request one yourself with credentials from the Postman
  export. Never print or commit the token, and don't paste it into chat output.
- **Where the CLI looks for it** (the first match wins):
  1. the `FINOPS_API_TOKEN` env var;
  2. `playwright/.auth/qa_finops_token.txt`, which is gitignored and holds one line with just the
     token. A JSON object with `access_token` or `token` is also accepted, so pasting the whole
     Auth response works.

  Either one may include the `Bearer ` prefix or leave it out.
- **Getting a fresh token** (the user does this in Postman):
  1. Open the **FinOps** folder and send the **Auth** request. It uses the team environment's
     `TenantID` / `ClientId` / `AppKey` / `AppUrl`.
  2. Copy `access_token` from the response. Either run `pm.environment.get("agrierp_fno_access_token")`
     in the Postman console, or paste the whole response body.
  3. Save it in `playwright/.auth/qa_finops_token.txt`.
- **The host comes from the token.** The token's `aud` claim is `{{AppUrl}}`, the D365 environment
  root. The CLI uses it, so no host config is needed. `FINOPS_APP_URL` overrides it. VBS QA is a
  cloud-hosted dev AOS, `https://vb-qa-…devaos.axcloud.dynamics.com`.
- **Legal entity.** `FINOPS_LEGAL_ENTITY` overrides the default `vbs`.
- **Check the token first.** `node scripts/finops.mjs check` decodes it locally, without making a
  call, and prints the host and the seconds left. If it has expired or doesn't decode, ask for a
  fresh token instead of retrying.
- **401 from D365.** Either the token has expired, or it is for another environment, or the app
  registration isn't listed under **System administration > Setup > Microsoft Entra ID
  applications** in that environment. The last case is a setup problem for the D365 admin, not
  something the call can fix.
- **Known: expired TLS certificate on VBS QA.** Since 2026-07-05, calls from Node fail with
  `CERT_HAS_EXPIRED` even with a good token (checked 2026-09-23). Postman still works if its "SSL
  certificate verification" is off. The fix is for the D365/LCS admin to renew the certificate
  (LCS: Environment → Maintain → Rotate secrets → SSL certificates). Don't build a TLS bypass into
  the CLI. Until the certificate is renewed, the user can run a one-off themselves:
  `! NODE_TLS_REJECT_UNAUTHORIZED=0 node .claude/skills/vannbrosphasetwo-finops-api/scripts/finops.mjs get …`.
  That disables all certificate checks for the run, so use it only against this QA host.

## Calling a service

Every service call is `POST {AppUrl}/api/services/<ServiceGroup>/<Service>/<operation>` with a JSON
body. There are three service groups:

| Group | Services |
|---|---|
| `F3AgriERPServices` | master-data `get`s, `create`s, work orders, project item journal |
| `F3AgriSalesServiceGroup` | `F3AgriSalesProjectService/createProject` |
| `F3AgriInventoryServiceGroup` | `F3AgriINVItemTransferService/itemReturn` |

**Body envelope.** The parameter name of the X++ operation is the top-level key. The Postman
bodies use two of them:

- `{"doc": {...}}` is used by everything under `F3AgriERPServices` and by `createProject`.
- `{"request": {...}}` is used by `itemReturn`. Its company key is `Company`, not
  `LegalEntity`, and it also takes `languageId: "en-us"` and `TransferJournalHeader: {}`.

If you send the wrong key, D365 fails to bind the contract (usually a 500 whose message names the
missing parameter), so copy the envelope from `reference/services.md`.

**Legal entity.** It is `"vbs"` (VBS | Vann Brothers) on every request. Send it lowercase, as the
collection does.

**`get` operations: paging and incremental sync.** Every `get` takes the same contract:

```json
{ "doc": { "ID": 0, "DateTime": "2000-10-08T10:34:06Z", "PageSize": 100, "PageNo": 1, "LegalEntity": "vbs" } }
```

- `DateTime` is a *modified since* watermark, confirmed: a 2030 date returns `[]`. The saved bodies
  use old dates (2000/2020) so they get everything. A recent date (the 2025-10-08 in some bodies)
  can return an empty list without anything being wrong.
- **Paging is broken on QA, so don't page.** `PageNo` is ignored: page 2 returns the same rows as
  page 1. `PageSize` also caps the rows D365 scans *before* it filters. For example, crops with
  `PageSize` 3, 10 or 50 return `[]`, 100 returns 3 crops, and 10000 returns all 6. Always send a
  large `PageSize` (the CLI defaults to 10000) and treat one call as the whole set.
- `ID: 0` means "no single-record filter".

**Responses** are not documented anywhere in the collection, which has no saved examples. Read them
defensively. The first time you call a service, record what it actually returned (top-level shape,
key names, how paging is signalled) in the **Observed responses** section below, with the date.
Failures from D365 custom services usually come back as HTTP 500 with a JSON `Message` (and often
`ExceptionType`). Surface that text, because it is usually the X++ `error()` / `throw` message.

### Using the CLI

```bash
S=.claude/skills/vannbrosphasetwo-finops-api/scripts
node $S/finops.mjs check                                    # decode token locally: host + seconds left
node $S/finops.mjs get F3AgriSeasonServices                 # any get; PageSize 10000 = everything
node $S/finops.mjs get F3AgriMaterialServices --since 2026-01-01T00:00:00Z   # only rows modified since
node $S/finops.mjs call /api/services/F3AgriERPServices/F3AgriJournalService/createProjectItemJournal \
  --body body.json            # dry run; add --yes to send
```

The CLI has two guards:

- **Writes.** Anything whose operation isn't `get` is a dry run until you pass `--yes`.
- **Hosts.** It refuses any host that isn't a D365 sandbox (`*.sandbox.operations.dynamics.com`) or
  a dev box (`*.cloudax.dynamics.com` / `*.axcloud.dynamics.com`). It also refuses hosts with `prod` in the name. For another
  test host, set `FINOPS_ALLOW_HOST=<host>` explicitly. Don't set it for production.

Keep both guards.

## The services

Look them up in `reference/services.md`. It gives the same list with the exact bodies.

**Reads (`get`)**:
- `F3AgriCropServices`: crops.
- `F3AgriCropVarietiesServices`: crop varieties.
- `F3AgriSeasonServices`: seasons / crop years.
- `F3AgriMaterialServices`: materials / items.
- `F3AgriCropMaterialGroupServices`: crop ↔ material groups.
- `F3AgriUOMServices`: units.
- `F3AgriUnitOfConversion`: unit conversions. **It returns 404 on VBS QA** (2026-09-23), so the
  service isn't deployed there.
- `F3AgriCustomerServices`: customers.
- `F3AgriResourceServices` and `F3AgriResourceGroupServices`: resources and resource groups.
- `F3AgriFarmOperationServices`: farm operations.
- `F3AgriProjectService`: projects.
- `F3AgriWMSLocationServices`: WMS locations.

These feed the Farm App's own lists, such as Crop, Season, Material, Resource, ResourceGroup,
Customer and WMSLocation in the QA API. To tell whether a Farm App row is wrong or just not synced
yet, compare it with the matching `get` here.

**Writes.** Every write creates real records in the shared D365 company. Confirm with the user first
and say exactly what will be created.

| Operation | What it does | Body keys (from Postman) | Where to see it in D365 |
|---|---|---|---|
| `F3AgriIrrigationMethodServices/create` | new irrigation method | `IrrigationMethodId`, `Description` | — |
| `F3AgriIrrigationSourceServices/create` | new irrigation source | `SourceId`, `Description` | — |
| `F3AgriPlotFieldServices/create` | plot/field from the Farm App | `RecId` (Farm App Field ID cross-ref), `PlotField` (Field Code), `Description` (Field Name), `HarvestWarehouse`, `ConsumptionWarehouse`, `HierarchyNode`, `IrrigationMethod` (code), `IrrigationSources` (codes joined with `;`), `TotalArea`, `TotalOperationArea` | AgriERP management > Plots/Fields |
| `F3AgriSalesProjectService/createProject` | project for a plot + crop + crop year | `ProjId` (`PRJ_…`), `ProjectName` (e.g. `2026.PF-2`), `ProjGroupId`, `CustAccount`, `ProjType` (int), `Plot`, `Crop` (item code), `CropYear`, `PlannedOperationalArea`, `ProjectStartDate` (`YYYY-MM-DD`) | Project management and accounting > All projects |
| `F3AgriWorkOrderServices/createOrUpdateWO` | work order under a project task (upsert) | `ProjectId`, `OperationId`, `TaskId`, `Activity`, `WOSequence` (e.g. `WO-01`), `ActivityType` (e.g. `adhoc`) | — |
| `F3AgriJournalService/createProjectItemJournal` | material consumption for a WO | `ProjectId`, `Activity` (`VBS-…`), `OperationId`, `WOSequence`, `MaterialLines[]` of `{ ProjectDate, ItemId, Quantity, Unit, Warehouse, Location, BatchNumber }` | PM&A > Journals > Item ("Project Item Journal") |
| `F3AgriINVItemTransferService/itemReturn` | return stock into a warehouse location | `request.TransferJournalLines[]` of `{ ItemId, Quantity, ToWarehouse, ToLocation, ToBatchNumber }` (optionally the `From*` fields as well), `Company`, `languageId` | Inventory management > Journal entries > Items > Transfer |

The "Where to see it" paths come from `vannbrosphasetwo-knowledge`
(`references/plots-fields.md`, `references/journals-postings.md`). Read those for what a reviewer
checks after posting. For example, a return transfer journal is named **INV-RECV** and a dispatch is
**INV-ISSUE**. Which journal `itemReturn` produces hasn't been verified yet, so check the transfer
journal list after calling it.

The example values in the Postman bodies show what each field looks like: warehouses `150` / `152`
/ `0101`, location `CHMCLSHED`, batches `LOT-000226` / `Opening`, items `00004` / `00166`, UOM `oz`.
They are not known-good data, so look up current codes with the `get`s before you write.

## Quirks in the Postman folder

`reference/services.md` lists these under "Paths used by more than one request".

- **"F3AgriFarmOperationServices"** (plural) actually calls `F3AgriCropServices/get`, so it's a
  mislabelled copy. The real farm-operation read is **"F3AgriFarmOperationService"**
  → `F3AgriFarmOperationServices/get`.
- **"F3AgriProjectService CreateWBSLines"** posts the plot-field `create` body to
  `F3AgriPlotFieldServices/create`. It is a placeholder, not a WBS service. There's no known
  WBS-lines endpoint yet, so ask the team before assuming one.
- **"itemReturn Copy"** is the same endpoint with a different item (`00017`, qty 12.8). Its saved
  body is also cut off, missing its closing brackets.
- The raw bodies contain `//` comments (the plot-field one annotates each field's Farm App source).
  Postman strips those, but a real JSON client can't send them. Remove them first.
- A few requests set both the collection's bearer auth and an explicit `Authorization` header.
  They are the same token, so it's harmless.

## Observed responses

These were recorded on 2026-09-23 against VBS QA (`vb-qa-…devaos`), using `get` only with `DateTime`
2000 and `PageSize` 10000 unless noted. Add a dated entry when you call something new or when a
shape changes. Never include the token.

**Common to every `get`:**
- The response is a **bare JSON array**, with no wrapper and no total count. Paging doesn't work
  (see "Calling a service"), so one large call returns the whole set.
- Keys are **PascalCase**. This differs from the Farm App API, which uses camelCase.
- Every row ends in `RecId`, `ModifiedDateTime`, `CreatedDateTime`, `Name` and `Code`.
  - `Code` is the business key (item number, season year, resource ID…). Match the Farm App's
    `code` against it.
  - `RecId` is D365's int64 record ID, around 5.6e9. It is safe as a JS number.
- `"$id": "1"`, `"2"`, … appears on every object, nested ones included. It is Newtonsoft
  reference-preservation noise, so ignore it.
- Timestamps are UTC with a `Z`. Unset dates come back as the sentinels `1900-01-01T12:00:00` or
  `1900-01-01T00:00:00Z`.
- Enums come as pairs, a number plus a label (`OperationStatus: 1` with `OperationStatusName:
  "Certified"`).

| Service | Rows | Extra fields beyond the common ones | Notes |
|---|---|---|---|
| `F3AgriSeasonServices` | 16 | `StartDate`, `EndDate` | `Code` 2015–2030, `Name` "Crop Year 2015". Start and end dates are unset. |
| `F3AgriCropServices` | 6 | `ItemGroup` (`04`), `Unit` | Crops are items: 90000 FIELDRUN_ALMOND, 90001 WALNUT, 90002 PISTACHIO, 90003 RICE, 00887, 00910. Returns `[]` when `PageSize` < 100. |
| `F3AgriCropVarietiesServices` | 29 | `ItemId` (the crop's `Code`), `InventTableRecId` | `Code` is `VBS-0000xx`. All 29 are under crop `90000`. |
| `F3AgriMaterialServices` | 215 | `ItemGroup`, `Unit`, `UUOM`, `IsDispatchable` (0/1), `ConversionFactor`, `UnitOfMeasureClass` | `ItemGroup` 01 has 134, 03 has 57, 02 has 12, 06 has 12. 198 of them are dispatchable. `Code` is the item number, e.g. `00215`. |
| `F3AgriCropMaterialGroupServices` | 6 | — | These are item groups, matching `ItemGroup` on materials and crops: `01` Chemicals, `02` Soil Amendments, `03` Fertilizers, `04` Semi Finished Goods (crops), `05` Parts Inventory, `06` Liquid Fertilizers. |
| `F3AgriUOMServices` | 58 | `UnitOfMeasureClass` | `Code` is the unit symbol (`1/2 lb`, `gal`, `oz`). |
| `F3AgriFarmOperationServices` | 27 | `OperationType`/`OperationTypeName`, `OperationStatus`/`OperationStatusName` | Types: 0 Default, 2 Inspection, 3 Tank Mixing, 5 Harvest. Statuses: 0 Open, 1 Certified. `Code` is the operation ID, e.g. `1110`. |
| `F3AgriResourceServices` | 678 | `ResourceType`/`ResourceTypeId` (1 Human resources, 2 Machine), `ResourceGroupId`, `ResourceGroupRecId`, `CalendarId`, `UUOM` (`hr`/`ac`), `Worker`, `Vendor`, `ExternalRefId`, `DummyResource`, `WorkingHours`, `StandardHours` | 565 machines and 113 people. |
| `F3AgriResourceGroupServices` | 693 rows, **6 distinct** | `ResourceGroupType`/`ResourceGroupTypeLabel` (1 Machine Operator (HR), 3 Implement, 4 Farm hand (HR)), `SiteId`, `SiteName` | **The rows fan out, one per resource in the group.** De-duplicate them by `RecId`. The groups are Cult, FH, Implement, MO, Machine and Tractors. |
| `F3AgriCustomerServices` | 1033 | `Addresses[]` of `{ Address, RecId, …, Name, Code: "" }` | `Code` is `C-000001`. A small `PageSize` returns fewer rows than asked for (50 gave 48). |
| `F3AgriProjectService` | 126 | `ProjectId` (`PRJ_…`), `ProjectName`, `CustomerId`/`CustomerName`/`CustomerRecId`, `SeasonId`/`SeasonRecId`, `Crop`/`CropRecId`, `PlotId`/`PlotRecId`, `OperationArea`, `StartDate`, `EndDate`, `WBSLines[]` | `Name` and `Code` are empty here, so key projects on `ProjectId`. Each `WBSLines[]` entry is `{ TaskId, TaskName, OperationId, Activity (VBS-…), Materials[], Resources[] of { ResourceId, UsageUOM, Quantity, ResourceRecId, ResourceGroupRecId, ActivityType } }`. Most projects have no WBS lines. `PlotId` is the field code, e.g. `130`. |
| `F3AgriWMSLocationServices` | 168 | `SiteId` (`01`), `SiteName` (`VBS`), `InventLocationId` (warehouse), `InventLocationName` | `Code` is the location, e.g. `130PMPSTN` (field 130 pump station), and `Name` is its type ("Bulk location"). 165 locations are in warehouse `0101` Vann Brothers Chemical Shed. The other three warehouses have one each: `0201` Staging warehouse, `0301` Parts Inventory, `0401` YHS Warehouse. |
| `F3AgriUnitOfConversion` | 404 | — | Not deployed on QA. |

These counts were a snapshot of QA on 2026-09-23. Use them for scale, not for assertions.

## Refreshing from a new Postman export

```bash
node .claude/skills/vannbrosphasetwo-finops-api/scripts/extract.mjs "path/to/AgriERP Product.postman_collection.json"
```

This reads only the `FinOps` folder and rewrites `collection.finops.json` and
`reference/services.md`. It refuses to write if a FinOps request holds a literal credential. The
full export has literal client secrets and bearer tokens in its other folders (MW), so keep it out
of git. Delete it once you've extracted it, or store it outside the repo.
